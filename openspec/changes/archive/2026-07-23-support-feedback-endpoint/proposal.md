# Proposal: Support Feedback Endpoint

## Intent

Frontend `FeedbackModal` (CORTEXDIST-26/28) has an inert stub — no backend endpoint exists. This adds `POST /support/feedback` so authenticated users can submit feedback delivered via email to the support team.

## Scope

### In Scope
- Pydantic 2 schema: `SupportFeedbackRequest` (`type` Literal of 4 values, `subject` max 200, `message` max 5000, `extra="forbid"`) and `SupportFeedbackResponse`
- Authenticated `POST /support/feedback` — user/email from Supabase JWT via `get_current_user`, never from payload
- Thin `send_support_feedback` on `EmailService` (seam for CORTEXDIST-30)
- 503 when email not configured (existing `is_configured()` pattern)
- Strict TDD: RED → GREEN → REFACTOR

### Out of Scope
- Email HTML template (CORTEXDIST-30)
- `RESEND_SUPPORT_EMAIL` config (CORTEXDIST-30)
- Frontend wiring (already stubbed)
- Rate limiting, spam protection, feedback persistence

## Capabilities

### New
- `support-feedback`: POST endpoint, schemas, EmailService seam

### Modified
None

## Approach

Direct EmailService extension:
1. Add `send_support_feedback(to_email, feedback_type, subject, message) → dict` — thin body
2. Extract `get_email_service()` from `admin_users.py` → shared `app/dependencies.py`
3. New `app/routers/support.py` with `Depends(get_current_user)` + `Depends(get_email_service)`
4. New `app/schemas/support.py` — `Literal["bug","mejora","nueva_funcion","otro"]`, `extra="forbid"`
5. Register router in `app/main.py`
6. Logging: INFO request/success, WARNING failure — NEVER log `payload.message`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/schemas/support.py` | New | Request/response schemas |
| `app/routers/support.py` | New | POST /support/feedback |
| `app/dependencies.py` | New | Shared `get_email_service()` |
| `app/routers/admin_users.py` | Modified | Import from shared module |
| `app/services/email_service.py` | Modified | Add `send_support_feedback` |
| `app/main.py` | Modified | Register support router |
| `tests/test_support_schemas.py` | New | 10 schema tests |
| `tests/test_support_feedback.py` | New | 9 router tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Extracting `get_email_service` breaks admin_users tests | Low | Run full suite; keep same signature |
| CORTEXDIST-30 scope bleed | Med | Keep method body thin |

## Rollback Plan

Revert commit(s). No migrations, no `.env` changes. Purely additive — zero impact on existing functionality.

## Dependencies

- CORTEXDIST-30 (email template) — consumes `send_support_feedback` seam
- Frontend FeedbackModal (CORTEXDIST-26/28) — already stubbed

## Success Criteria

- [ ] 19 tests pass (10 schema + 9 router) — TDD RED→GREEN verified
- [ ] Unauthenticated → 401; invalid payload → 422; valid → 200
- [ ] `send_support_feedback` called with `to_email=current_user.email`
- [ ] Email not configured → 503 (not 500)
- [ ] No `payload.message` in logs
- [ ] Existing admin_users tests pass after extraction
