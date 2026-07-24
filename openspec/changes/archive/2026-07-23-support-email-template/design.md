# Design: Support Email Template (CORTEXDIST-30)

## Technical Approach

Extend `EmailService.send_support_feedback` to accept `user_email: str, user_id: str`, render a rich HTML template reusing the invite email's dark visual language (`#030303` bg, `#0d0d0d` card, `#00FF88` accent, same font stack), and add `reply_to = safe_user_email` to the Resend payload. The router extracts `current_user.email` and `current_user.id` and passes them through the seam. All existing sanitization (`html.escape(message)`, CRLF strip on `subject`) is preserved and applied to the new `user_email`/`user_id` inputs too. Maps to proposal Approach 1.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| Seam signature | (a) add `user_email, user_id` params; (b) keep thin seam + DI user; (c) only `reply_to`, defer template | (a) minimal breaking surface, one mock point; (b) couples service to request context; (c) doesn't fulfill task | **(a)** — explicit, testable, matches proposal |
| Label source for `feedback_type` | inline dict literal vs. shared enum | dict keeps `FeedbackType` Literal authoritative, no new schema module | inline `FEEDBACK_TYPE_LABELS` dict in `email_service.py` |
| Timestamp source | `datetime.utcnow()` (naive, deprecated 3.12+) vs `datetime.now(timezone.utc)` (aware) | aware UTC is future-proof and unambiguous | **`datetime.now(timezone.utc).isoformat()`** |
| Template location | inline f-string (like `send_invite_email`) vs Jinja2/file | inline matches existing pattern, zero new deps | inline f-string, reusing invite email CSS tokens |
| Danger: `from` vs `reply_to` swap | caller could pass email into `from` | Resend requires verified `from`; user email unverified | Enforce `from = self._from_email` (verified) and `reply_to = safe_user_email`; a RED test pins both |

### `FEEDBACK_TYPE_LABELS` map

```python
FEEDBACK_TYPE_LABELS = {
    "bug": "Bug",
    "mejora": "Mejora",
    "nueva_funcion": "Nueva Función",
    "otro": "Otro",
}
```
Unknown values (defensive, shouldn't occur — Literal gate at schema) fall back to the raw `feedback_type` title-cased.

## Data Flow

```
POST /support/feedback
  │ current_user (JWT) → email, id
  ▼
Router.submit_feedback(payload, current_user, email_service)
  │ feedback_type, subject, message, user_email=current_user.email, user_id=str(current_user.id)
  ▼
EmailService.send_support_feedback(...)
  ├─ html.escape(message) ─► safe_message
  ├─ subject CRLF strip ─► safe_subject
  ├─ html.escape(user_email), html.escape(str(user_id))
  ├─ datetime.now(timezone.utc).isoformat() ─► timestamp
  ├─ render inline HTML (invite-style card)
  └─ resend.Emails.send({from: verified, to: SUPPORT_TO_EMAIL, reply_to: user_email, subject, html})
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `cortex-backend/app/services/email_service.py` | Modify | New params `user_email, user_id`; import `datetime, timezone`; add `FEEDBACK_TYPE_LABELS`; insert `reply_to` into payload; replace `<pre>{safe_message}</pre>` with rich HTML card (header bar, tipo label, subject, escaped message block, user email/id row, timestamp footer, `© 2025 Cortex` footer reusing invite CSS) |
| `cortex-backend/app/routers/support.py` | Modify | Pass `user_email=current_user.email`, `user_id=str(current_user.id)` to seam call |
| `cortex-backend/tests/test_email_service.py` | Modify | Update existing 2 tests for new signature; add E1–E8 (below) |
| `cortex-backend/tests/test_support_feedback.py` | Modify | R5/R7 add `user_email="user@example.com", user_id="a1b2c3d4-..."` to `assert_called_once_with`; R8 direct call adds both args |

No new files, no config changes (`SUPPORT_TO_EMAIL` + `RESEND_FROM_EMAIL` consumed unchanged).

## Interfaces / Contracts

```python
def send_support_feedback(
    self,
    feedback_type: str,      # FeedbackType Literal
    subject: str,
    message: str,
    user_email: str,         # NEW — from current_user.email
    user_id: str,             # NEW — str(current_user.id)
) -> dict:
    """Precondition: is_configured(). reply_to == user_email, from == verified sender."""
```

Resend payload gains `"reply_to": safe_user_email`. `from` stays `self._from_email`. Subject pattern unchanged: `f"[Cortex Feedback - {feedback_type}] {safe_subject}"`.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (email_service) | Template content + payload wiring | Monkeypatch `resend.Emails.send`, capture payload, assert E1–E8 + regressions |
| Integration (router) | Seam called with user context | Mock seam, assert `assert_called_once_with(..., user_email=..., user_id=...)` |

### RED Test Plan (Strict TDD — captured to `/tmp/opencode/support-email-template-red.txt`)

New `test_email_service.py` tests (all fail until template + wiring ship):

| # | Name | Assertion |
|---|------|-----------|
| E1 | `test_support_feedback_reply_to_is_user_email` | `captured["reply_to"] == "user@example.com"` |
| E2 | `test_support_feedback_from_is_verified_sender` | `captured["from"] == settings.resend_from_email` AND `!= user_email` (anti-swap) |
| E3 | `test_support_feedback_template_has_type_label` | `"Mejora"` in `captured["html"]` when `feedback_type="mejora"` |
| E4 | `test_support_feedback_template_has_escaped_subject` | escaped subject present, raw `<script>` absent |
| E5 | `test_support_feedback_template_has_escaped_message` | escaped message present |
| E6 | `test_support_feedback_template_has_user_email` | `user@example.com` in html |
| E7 | `test_support_feedback_template_has_user_id` | UUID string in html |
| E8 | `test_support_feedback_template_has_iso_timestamp` | regex `r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}"` matches html |

Existing tests requiring surface updates (signature change):

| # | File | Update |
|---|------|--------|
| E9 | `test_email_service.py::test_send_support_feedback_escapes_message_html` | Add `user_email="u@e.com", user_id="id-1"` to call; escaping assertion unchanged |
| E10 | `test_email_service.py::test_send_support_feedback_sanitizes_subject_crlf` | Add user args; CRLF assertion unchanged |
| R5 | `test_support_feedback.py` | `assert_called_once_with(..., user_email="user@example.com", user_id="a1b2c3d4-e5f6-7890-abcd-ef1234567890")` |
| R7 | `test_support_feedback.py` | `send_support_feedback.assert_called_once()` only (no arg assertion) — no change needed beyond mock setup |
| R8 | `test_support_feedback.py` | Direct `send_support_feedback(...)` adds `user_email=..., user_id=...` |

Unchanged regressions (must keep passing): R1, R2, R2b, R3, R4, R6, R9 (no message/subj logging), R10 (503 unconfigured). RED capture: before any production code, run pytest suite and write failing-test names + exceptions to `/tmp/opencode/support-email-template-red.txt`.

### TDD Cycle Evidence (apply phase MUST persist to Engram apply-progress)

| Cycle | RED (test) | GREEN (impl) | REFACTOR |
|-------|-----------|--------------|----------|
| 1 | E1 reply_to | Add `reply_to=user_email` to payload | — |
| 2 | E2 from verified | Confirm `from=self._from_email` (anti-swap assert) | — |
| 3 | E3 type label | Add `FEEDBACK_TYPE_LABELS` + render label | Extract label mapper |
| 4 | E4/E5 escaping | Render escaped subject+message in template | Reuse invite CSS |
| 5 | E6/E7 user context | Render user email+id row | — |
| 6 | E8 timestamp | Add `datetime.now(timezone.utc).isoformat()` | — |
| 7 | R5/R8 signature | Wire router + update direct call | — |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. The router change adds two params to an existing in-process call; no new HTTP routes, no shell, no exec.

## Migration / Rollout

No migration required. Rollback = revert seam signature (drop `user_email`, `user_id`), drop `reply_to`, restore bare `<pre>` body. No config, no DB, no feature flag.

## Open Questions

- [ ] None blocking. Approver may confirm the "Nueva Función" label spelling/casing preference (title-case chosen to match invite email's `Invitación` styling).