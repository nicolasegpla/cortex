# Design: Support Feedback Endpoint

## Technical Approach

Add `POST /support/feedback` to the FastAPI app as a purely additive slice: a Pydantic 2 request/response schema, a thin router wired through existing auth + email-service dependencies, and a thin `send_support_feedback` seam on `EmailService` that **resolves the recipient internally from `settings.support_to_email`** (default `stalloy@stalloy.io`) — feedback lands in the support inbox, never the submitter's. The seam body is deliberately minimal — CORTEXDIST-30 still owns the rich HTML template. This slice adds the `SUPPORT_TO_EMAIL` backend setting (with default) now, per parent CORTEXDIST-30's note, to avoid rework. Extract the existing `get_email_service()` factory out of `admin_users.py` into a shared `app/dependencies.py` so both routers inject the same configured/503-guarded `EmailService`. Strict TDD: 20 RED tests first (10 schema + 10 router), captured to `/tmp/opencode/support-feedback-endpoint-red.txt`, then GREEN/REFACTOR.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice + Rationale |
|---|---|---|---|
| Email seam shape | Direct method / Interface+Protocol / Stub | Interface = premature abstraction (only Resend exists); Stub defers integration risk | **Direct thin method** — mirrors `send_invite_email`, one mock point, matches project convention |
| `get_email_service` ownership | Keep per-router / Shared `app/dependencies.py` | Shared avoids duplication; risks import cycle | **Shared `app/dependencies.py`** — admin_users re-imports it; no cycle (dependencies imports only config+service) |
| Auth role gate | Any authenticated user / `require_role(["super_admin"])` | Support feedback is for ALL users, not just admins | **`Depends(get_current_user)` only** — no role gate; 401 only, never 403 for role on this route |
| Unconfigured email | 500 / 503 in dependency / 503 in body | Dependency guard fails fast before body runs; reuses existing pattern | **503 via `get_email_service`** — identical to admin_users; testable via `is_configured()=False` mock |
| Email send failure | 500 / 502 / 503 | Resend transports errors are upstream → 502 Bad Gateway; unconfigured config is 503 | **502** on `ResendError`/unexpected exception; **503** only for missing config |
| Recipient resolution | Router passes `current_user.email` / Seam reads `settings.support_to_email` | Submitting to your own inbox is nonsensical for a support channel; parent CORTEXDIST-32 targets `stalloy@stalloy.io` | **Seam resolves recipient internally from `settings.support_to_email`** (default `stalloy@stalloy.io`). Router does NOT pass `to_email`. `SUPPORT_TO_EMAIL` always has a default → never a 503 cause. CORTEXDIST-30 still owns the rich template |
| Logging | Log full payload / log type+subject-len+user_id | AC forbids message content in logs | **INFO start/done with `type`, `len(subject)`, `user_id`; WARNING on failure; NEVER `payload.message`** (caplog assertion) |

## Data Flow

```
Client (Bearer JWT)
   │
   ▼
oauth2_scheme → get_current_user → User(id,email,role)
   │                                │
   │  get_email_service ─────────────┤ (is_configured? no → 503, body never runs)
   ▼                                ▼
POST /support/feedback  ──→  SupportFeedbackRequest (extra=forbid, 422 on bad)
   │                                │
    │   email_service.send_support_feedback(feedback_type, subject, message)
    │       │   (recipient resolved inside seam from settings.support_to_email → stalloy@stalloy.io)
    │       ├─ ResendError / Exception → 502 (WARNING log, no message)
   │       └─ dict → INFO success log
   ▼
SupportFeedbackResponse(success=True, message="Gracias por tu feedback.")
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `cortex-backend/app/schemas/support.py` | Create | `FeedbackType = Literal["bug","mejora","nueva_funcion","otro"]`, `SupportFeedbackRequest` (`extra="forbid"`, `subject` min 1 max 200, `message` min 1 max 5000), `SupportFeedbackResponse(success: bool, message: str)` |
| `cortex-backend/app/dependencies.py` | Create | Shared `get_email_service() -> EmailService`: builds `EmailService(get_settings())`, raises `503 "El servicio de email no está configurado"` when `not is_configured()` — body moved verbatim from `admin_users.py:32-40`. `is_configured()` unchanged (still `resend_api_key` + `resend_from_email`); `SUPPORT_TO_EMAIL` always has a default → never a 503 cause |
| `cortex-backend/app/core/config.py` | Modify | Add `support_to_email: str = Field(default='stalloy@stalloy.io', alias='SUPPORT_TO_EMAIL')` — recipient for support feedback. Default guarantees the seam always has a target (no `.env` entry required) |
| `cortex-backend/app/routers/support.py` | Create | `APIRouter(prefix="/support", tags=["support"])`; `POST /feedback`; logger `logging.getLogger("app.routers.support")` with `SUPPORT-FEEDBACK:` prefix; INFO start/done, WARNING failure; catches `Exception` from seam → 502. Calls `email_service.send_support_feedback(payload.type, payload.subject, payload.message)` — **no `to_email` argument** |
| `cortex-backend/app/services/email_service.py` | Modify | Add `send_support_feedback(self, feedback_type, subject, message) -> dict` — `is_configured()` guard raising `RuntimeError`, then `resend.Emails.send({"from": self._from_email, "to": self.settings.support_to_email, "subject": f"[Cortex Feedback - {feedback_type}] {subject}", "html": f"<pre>{message}</pre>"})`. Recipient resolved internally from settings; template intentionally minimal (CORTEXDIST-30 owns it) |
| `cortex-backend/app/routers/admin_users.py` | Modify | Remove local `get_email_service`; `from app.dependencies import get_email_service`; delete the now-dead `EmailService`/`get_settings` imports if unused |
| `cortex-backend/app/main.py` | Modify | Import `support` router; `application.include_router(support.router)` |
| `cortex-backend/app/routers/__init__.py` | Modify | Append `"support"` to `__all__` |
| `cortex-backend/tests/test_support_schemas.py` | Create | 10 schema RED tests |
| `cortex-backend/tests/test_support_feedback.py` | Create | 10 router RED tests |

## Interfaces / Contracts

```python
# app/schemas/support.py
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

FeedbackType = Literal["bug", "mejora", "nueva_funcion", "otro"]

class SupportFeedbackRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: FeedbackType
    subject: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=5000)

class SupportFeedbackResponse(BaseModel):
    success: bool
    message: str

# app/services/email_service.py (addition)
def send_support_feedback(self, feedback_type: str,
                          subject: str, message: str) -> dict: ...
    # recipient resolved internally: self.settings.support_to_email (default stalloy@stalloy.io)

# app/core/config.py (addition)
support_to_email: str = Field(default='stalloy@stalloy.io', alias='SUPPORT_TO_EMAIL')

# app/routers/support.py
@router.post("/feedback", response_model=SupportFeedbackResponse)
def submit_feedback(
    payload: SupportFeedbackRequest,
    current_user: User = Depends(get_current_user),
    email_service: EmailService = Depends(get_email_service),
) -> SupportFeedbackResponse: ...  # no to_email passed to the seam
```

## Error Matrix

| Case | Status | Body shape | Service called? |
|---|---|---|---|
| No / invalid JWT | 401 | `{"detail":"Credenciales de autenticación inválidas"}` | No |
| Email unconfigured (missing RESEND config — `resend_api_key` / `resend_from_email`) | 503 | `{"detail":"El servicio de email no está configurado"}` | No (dependency raises before body). `SUPPORT_TO_EMAIL` always has a default → never a 503 cause |
| Bad payload (extra field / empty subject / empty message / whitespace / >200 / >5000 / bad type) | 422 | FastAPI validation error | No |
| Valid + seam returns dict | 200 | `{"success":true,"message":"Gracias por tu feedback."}` | Yes, once (recipient = `settings.support_to_email`) |
| Seam raises `ResendError`/`Exception` | 502 | `{"detail":"No se pudo enviar el mensaje de feedback"}` | Yes (raised) |

Note: 403 is intentionally NOT in this matrix — the route has no role gate (any authenticated user, per parent CORTEXDIST-32). Note: `current_user.email` is still used for logging `user_id`/audit identity but is NEVER the email recipient.

## Logging Policy

- INFO on entry: `SUPPORT-FEEDBACK: start type=<t> subject_len=<n> user_id=<id>`
- INFO on success: `SUPPORT-FEEDBACK: done status=success`
- WARNING on failure: `SUPPORT-FEEDBACK: failed status=502`
- **NEVER** log `payload.message`, `subject` text, or the email body. Only `subject_len`.
- Verified by a RED test asserting a sentinel message string does NOT appear in `caplog.text`.

## Testing Strategy (Strict TDD — RED First)

RED capture plan: run `pytest tests/test_support_schemas.py tests/test_support_feedback.py` BEFORE implementation, redirect to `/tmp/opencode/support-feedback-endpoint-red.txt`. All 20 must fail with collection/import or assertion errors (NOT infrastructure errors). After GREEN/REFACTOR, persist a **TDD Cycle Evidence** table in Engram `sdd/support-feedback-endpoint/apply-progress` (columns: test_id, red_exit_code_or_error, green_status, refactor_note) — this table is REQUIRED Engram content, not just the agent reply (lesson from prior verify failures).

### Schema RED tests — `tests/test_support_schemas.py` (10)

| # | Test (each → AC) | Criterion / assertion |
|---|---|---|
| S1 | valid request accepted | AC: schema accepts the 4-type contract; `SupportFeedbackRequest(type="bug",subject="Crash",message="Steps")` constructs |
| S2 | rejects extra field | AC: `extra="forbid"`; `ValidationError` when `email="x@y.com"` passed |
| S3 | rejects empty subject | AC: subject min_length=1; `subject=""` → `ValidationError` |
| S4 | rejects empty message | AC: message min_length=1; `message=""` → `ValidationError` |
| S5 | rejects whitespace-only subject | AC: no whitespace-only; `subject="   "` → `ValidationError` |
| S6 | rejects whitespace-only message | AC: no whitespace-only message; `ValidationError` |
| S7 | rejects subject > 200 | AC: subject max_length=200; 201-char → `ValidationError` |
| S8 | rejects invalid type | AC: Literal; `type="invalid"` → `ValidationError` |
| S9 | all four types accepted | AC: `bug`,`mejora`,`nueva_funcion`,`otro` each construct |
| S10 | response serializes | AC: `SupportFeedbackResponse(success=True,message=...).model_dump()` equals expected dict |

### Router RED tests — `tests/test_support_feedback.py` (10)

Auth override pattern from `test_n8n_chat_router.py`: override `get_current_user` with `create_mock_user()`; override `support.get_email_service` with a `MagicMock` email service. For the 401 test, clear overrides so real `oauth2_scheme` runs.

| # | Test (each → AC) | Criterion / assertion |
|---|---|---|
| R1 | unauthenticated → 401 | AC: no token → `401`; `send_support_feedback` NOT called |
| R2 | empty message → 422 | AC: payload validation; `message=""` → `422`; service NOT called |
| R3 | extra field → 422 | AC: `extra="forbid"` at API layer; passing `email` field → `422`; service NOT called |
| R4 | valid → 200 | AC: happy path; status `200`; body `{success:true, message:"Gracias por tu feedback."}` |
| R5 | seam called with correct args (no recipient) | AC: `send_support_feedback.assert_called_once_with(feedback_type="bug", subject=..., message=...)` — **no `to_email` kwarg**; router does not pass a recipient |
| R6 | seam success → 200 | AC: mock returns `{id:"email-123"}` → endpoint 200 |
| R7 | seam raises → 502 | AC: mock raises `Exception`/`ResendError` → `502`; detail `"No se pudo enviar el mensaje de feedback"`; service was called |
| R8 | recipient resolved from `SUPPORT_TO_EMAIL` (default `stalloy@stalloy.io`), not token/payload | AC: build a real `EmailService()` (no mock) with default settings; monkeypatch `resend.Emails.send` to capture the payload; call `send_support_feedback("bug","s","m")` directly; assert captured `to == "stalloy@stalloy.io"` AND payload has NO email field AND router never passes `to_email` |
| R9 | message content not logged | AC: post `"super-secret-user-text"`; with `caplog.at_level('INFO')`; assert that string absent from `caplog.text` AND subject text absent; `subject_len` present |
| R10 | email unconfigured → 503 | AC: error matrix 503 row; override `get_email_service` dependency with a mock whose `is_configured()` returns `False` (or override to raise the documented 503); POST with valid payload + auth → status `503`; body `{"detail":"El servicio de email no está configurado"}`; `send_support_feedback` NOT called (dependency guard fires before body) |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. The change adds one HTTP POST route behind existing JWT auth; no system calls, no git/PR automation, no executable classification surfaces.

## Migration / Rollout

No data migration required — purely additive: new schema + router + config field + extraction. No DB schema, no feature flag. **Config addition**: `SUPPORT_TO_EMAIL` setting with default `stalloy@stalloy.io` — ships with a default so no `.env` entry is required to operate; operators MAY override via env. CORTEXDIST-30 still owns the rich HTML template (and may consume/rename this config when it lands). Rollback = revert the commits; `admin_users` re-acquires its local `get_email_service` automatically on revert (no data impact).

## Open Questions

- [x] **Recipient destination** — RESOLVED (orchestrator, parent CORTEXDIST-32): `to_email=current_user.email` is REJECTED (lands feedback in the submitter's own inbox — nonsensical for a support channel). The `send_support_feedback` seam resolves the recipient from `settings.support_to_email` (default `stalloy@stalloy.io`), matching parent CORTEXDIST-30's note. This slice adds `SUPPORT_TO_EMAIL` to `app/core/config.py` now to avoid rework. Tests R5/R8 updated to encode the new contract (no `to_email` from router; recipient = `stalloy@stalloy.io` default).
- [x] **403 path** — RESOLVED (orchestrator, parent CORTEXDIST-32): CONFIRMED no role gate. "Cualquier usuario de Cortex" may submit feedback — any authenticated user, no role restriction, no 403 case. Error matrix deliberately omits 403.