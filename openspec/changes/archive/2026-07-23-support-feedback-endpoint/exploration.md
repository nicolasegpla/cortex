# Exploration: Support Feedback Backend Endpoint

## Current State

The cortex backend is a FastAPI application with Pydantic 2 schemas, Supabase Auth for JWT verification, and a thin Resend-backed `EmailService`. There is **no existing support or feedback endpoint** — the grep across the entire backend for `feedback` returned zero hits in router/schema/service code. The frontend `FeedbackModal` (CORTEXDIST-26/28, archived) was shipped with an inert `onSubmit` stub in `ConfigPage.tsx`. This endpoint is the first backend piece of the support feedback flow.

### Key conventions already in use

| Concern | Convention | Source |
|---------|-----------|--------|
| Auth | `get_current_user(token=Depends(oauth2_scheme))` → `User(id: UUID, email: str, role: str)` | `app/core/security.py:86` |
| Role gate | `require_role(["super_admin"])` returns `User` on role match, 403 otherwise | `app/core/security.py:115` |
| Extra fields | `model_config = ConfigDict(extra="forbid")` | `schemas/admin_users.py:8`, `schemas/chat.py:56` |
| Max lengths | `Field(..., max_length=N)` used inconsistently; no project-wide convention enforced | `schemas/coffee_farms.py` uses `Field(...)` without max_length |
| Service injection | FastAPI `Depends` with factory function (e.g. `def get_email_service() → EmailService`) | `routers/admin_users.py:32-40` |
| Router prefix | e.g. `prefix="/admin/users"`, `prefix="/chat"`, `prefix="/auth"` | various routers |
| Response models | Explicit `response_model=` on route decorators | all routers |
| Test auth override | `app.dependency_overrides[get_current_user] = lambda: create_mock_user()` | `test_n8n_chat_router.py:41-43` |
| Test auth patch | `patch("app.core.security.get_supabase_service")` → mock Supabase client → `mock_client.auth.get_user.return_value` | `test_admin_users.py:126-128`, `test_auth_middleware.py:35-43` |
| Test client | `TestClient(create_app())` from `tests/conftest.py:12-14` | conftest |

### EmailService — current state

```python
# app/services/email_service.py
class EmailService:
    def __init__(self, settings=None):
        self.settings = settings or get_settings()
        self._api_key = self.settings.resend_api_key
        self._from_email = self.settings.resend_from_email
        if self._api_key:
            resend.api_key = self._api_key

    def is_configured(self) -> bool:
        return bool(self._api_key and self._from_email)

    def send_invite_email(self, to_email: str, invite_link: str) -> dict:
        ...
```

It has ONE method: `send_invite_email`. For support feedback, we need a new method or seam.

### Auth flow (verified)

```
Request → oauth2_scheme extracts Bearer token from Authorization header
       → get_current_user(token) calls verify_token(token)
         → SupabaseService().get_client().auth.get_user(token)
         → returns User(id=UUID(sub), email, role from user_metadata)
       → If no token → 401
       → If invalid token → 401
```

The frontend has a Supabase session — it will send the JWT in `Authorization: Bearer <token>` header. The `User` object (id, email, role) is available to the endpoint via `Depends(get_current_user)`.

## Affected Areas

- `cortex-backend/app/schemas/` — **new**: `support.py` with `SupportFeedbackRequest` and `SupportFeedbackResponse` schemas
- `cortex-backend/app/routers/` — **new**: `support.py` with `POST /support/feedback`
- `cortex-backend/app/services/email_service.py` — **modify**: add `send_support_feedback(to_email, type, subject, message)` method (or interface contract for CORTEXDIST-30)
- `cortex-backend/app/main.py` — **modify**: include new `support` router
- `cortex-backend/app/routers/__init__.py` — **modify**: add `"support"` to `__all__`
- `cortex-backend/tests/` — **new**: `test_support_feedback.py` (TDD — RED first)
- `cortex-backend/tests/` — **new/modify**: may need `test_support_schemas.py` for schema unit tests

## Approaches

### 1. **Direct EmailService extension** (Recommended)

Add a `send_support_feedback` method directly to `EmailService` and call it via `Depends(get_email_service)` in the router.

```python
# email_service.py — new method
def send_support_feedback(
    self, to_email: str, feedback_type: str, subject: str, message: str
) -> dict:
    """Send support feedback email via Resend."""
    if not self.is_configured():
        raise RuntimeError("El servicio de email no está configurado")
    return resend.Emails.send({
        "from": self._from_email,
        "to": self._to_support_email,  # NEW config key
        "subject": f"[Cortex Feedback - {feedback_type}] {subject}",
        "html": f"<pre>{message}</pre>",  # format TBD by CORTEXDIST-30
    })
```

- **Pros**: Minimal new code; follows the existing `send_invite_email` pattern; single service to mock in tests; CORTEXDIST-30 can refine the method body later
- **Cons**: `EmailService` grows; no interface/seam for swapping email providers
- **Effort**: Low

### 2. **Interface + Boundary Pattern**

Define an abstract `EmailSender` interface (ABC or Protocol), have `EmailService` implement it, inject the interface into the router. CORTEXDIST-30 implements the concrete email formatting.

- **Pros**: Clean separation; testable with pure mocks; CORTEXDIST-30 can replace provider without touching the router
- **Cons**: Premature abstraction — only one email provider exists; adds ~30 lines of interface boilerplate
- **Effort**: Medium

### 3. **Stub now, wire later**

Create the endpoint and schema but call a no-op or logging-only method. CORTEXDIST-30 does the full email wiring.

- **Pros**: Fastest time-to-merge for the endpoint contract; zero risk of email misconfiguration in this change
- **Cons**: Defers integration risk to CORTEXDIST-30; doesn't prove the full flow end-to-end
- **Effort**: Low

## Recommendation

**Approach 1 — Direct EmailService extension** with a thin `send_support_feedback` method.

Rationale:
- The project already has exactly one email provider (Resend) and one `EmailService` class — no need for interface overhead
- Follows the exact pattern of `send_invite_email`: validate config → call `resend.Emails.send` → return dict
- CORTEXDIST-30 can refine the email HTML template and add `RESEND_SUPPORT_EMAIL` config without touching the router
- The router only needs `Depends(get_email_service)` and calls `email_service.send_support_feedback(...)`
- The seam for CORTEXDIST-30 is the method signature: `send_support_feedback(to_email, feedback_type, subject, message) → dict`

### Schema design (aligned with frontend payload)

```python
# schemas/support.py
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
```

Key decisions:
- **No email/name in payload** — derived from `current_user.email` (AC: "derivar usuario/email desde la sesión backend")
- **`extra="forbid"`** — matches project convention (admin_users, chat schemas)
- **max_length on subject (200)** and **message (5000)** — prevents abuse; subject is email-subject-length; message allows detailed feedback
- **`Literal` type** — matches frontend `FeedbackType` exactly: `bug`, `mejora`, `nueva_funcion`, `otro`

### Router design

```python
# routers/support.py
router = APIRouter(prefix="/support", tags=["support"])

@router.post("/feedback", response_model=SupportFeedbackResponse)
def submit_feedback(
    payload: SupportFeedbackRequest,
    current_user: User = Depends(get_current_user),
    email_service: EmailService = Depends(get_email_service),
):
    email_service.send_support_feedback(
        to_email=current_user.email,
        feedback_type=payload.type,
        subject=payload.subject,
        message=payload.message,
    )
    return SupportFeedbackResponse(success=True, message="Gracias por tu feedback.")
```

### Logging policy

- Log: `INFO` level — request received with type + subject length + user_id (NO message content)
- Log: `INFO` level — email send result/success
- Log: `WARNING` level — email send failure
- **NEVER log `payload.message`** or the email body (AC: "no se loguea contenido sensible del mensaje")

### Config addition

```python
# core/config.py — add
resend_support_email: str = Field(default='support@cortex.local', alias='RESEND_SUPPORT_EMAIL')
```

## Test Plan (Strict TDD — RED first)

### Schema tests (`test_support_schemas.py`)

| # | Test | Asserts |
|---|------|---------|
| 1 | Valid request with all fields | Schema accepts `{type:"bug", subject:"Crash", message:"Steps"}` |
| 2 | rejects extra fields (extra="forbid") | `ValidationError` on unknown field |
| 3 | rejects empty subject | `ValidationError` on `subject: ""` |
| 4 | rejects empty message | `ValidationError` on `subject: "valid"` with `message: ""` |
| 5 | rejects whitespace-only subject | `ValidationError` on `subject: "   "` |
| 6 | rejects whitespace-only message | `ValidationError` on `message: "   "` |
| 7 | rejects subject > 200 chars | `ValidationError` on 201-char subject |
| 8 | rejects invalid type | `ValidationError` on `type: "invalid"` |
| 9 | all four types accepted | `bug`, `mejora`, `nueva_funcion`, `otro` all pass |
| 10 | response model serializes correctly | `model_dump()` matches expected dict |

### Router integration tests (`test_support_feedback.py`)

Use `app.dependency_overrides[get_current_user]` pattern (from `test_n8n_chat_router.py`):

| # | Test | Asserts |
|---|------|---------|
| 11 | **RED: unauthenticated → 401** | No token → `401 Unauthorized`, email service NOT called |
| 12 | **RED: invalid payload → 422** | Valid auth, `message: ""` → `422`, email service NOT called |
| 13 | **RED: extra fields → 422** | Valid auth, extra field in payload → `422` |
| 14 | **RED: valid payload → 200** | Valid auth + valid payload → `200`, `{success: true, message: "..."}` |
| 15 | **RED: email service called with correct args** | Mock email service asserts `send_support_feedback` called with `to_email=current_user.email`, `feedback_type`, `subject`, `message` |
| 16 | **RED: email service returns success response** | Mock returns `{id: "email-123"}`, endpoint returns 200 |
| 17 | **RED: email send failure → 502** | Mock `send_support_feedback` raises `ResendError` → `502 Bad Gateway` |
| 18 | **RED: user email derived from token, NOT payload** | Payload contains no email field; mock user has `email="user@test.com"`; assert `send_support_feedback` called with `to_email="user@test.com"` |
| 19 | **RED: message content NOT logged** | Verify no log call contains the user's `payload.message` value |

### Auth override pattern (from n8n_chat test)

```python
@pytest.fixture
def client(self, mock_email_service):
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: User(
        id=UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),
        email="user@example.com",
        role="operativo",
    )
    app.dependency_overrides[support.get_email_service] = lambda: mock_email_service
    yield TestClient(app)
    app.dependency_overrides.clear()

def test_unauthenticated_returns_401(self):
    app = create_app()
    client = TestClient(app)
    # No dependency override → real oauth2 → 401
    response = client.post("/support/feedback", json={...})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
```

### Schema unit test pattern (from test_admin_users.py)

```python
def test_rejects_extra_fields(self):
    with pytest.raises(ValidationError):
        SupportFeedbackRequest(
            type="bug", subject="Test", message="msg", email="x@y.com"
        )
```

## Risks

- **No `RESEND_SUPPORT_EMAIL` env var in `.env`** — the endpoint should degrade gracefully if the email config is missing (return 503 `"El servicio de email no está configurado"` rather than 500). Decision: follow the existing `is_configured()` pattern.
- **CORTEXDIST-30 scope bleed** — the temptation to fully format the HTML email template in this change. Mitigation: keep the email method intentionally thin (plain subject line, basic body); CORTEXDIST-30 owns template design.
- **400-line budget risk** — the new router + schema + email method + tests should stay well under 400 lines. The n8n_chat test file is 185 lines; this is similar scope.
- **Message content in exception traces** — FastAPI/Pydantic validation errors include the payload in the error detail. With `extra="forbid"`, extra fields appear in error text. Mitigation: standard Pydantic behavior, not a leak unique to this endpoint; the AC refers to application-level logging, not Pydantic validation error messages (which are already controlled by `extra="forbid"`).

## Ready for Proposal

**Yes.** The exploration is complete — all patterns, conventions, and payload contracts are mapped. The orchestrator should proceed to `sdd-propose` with the recommendation of Approach 1 (direct EmailService extension).
