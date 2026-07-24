# Proposal: support-email-template

## Intent

Replace the bare `<pre>` HTML body in `send_support_feedback` with a rich, structured email template that includes user context (email/id), feedback metadata, and a proper `reply_to` header — so the support team can identify and respond to submitters without manual lookup.

## Scope

### In Scope
- Rich HTML email template (tipo, asunto, mensaje, usuario email/id, server UTC timestamp)
- `reply_to` = session user's email (NEVER `from`); `from` = verified `RESEND_FROM_EMAIL`
- Seam signature change: `send_support_feedback` gains `user_email: str, user_id: str`
- Router wires `current_user.email` and `current_user.id` into the seam
- Preserve CORTEXDIST-29 regression coverage (SUPPORT_TO_EMAIL, html.escape, CRLF sanitize, 503 unconfigured)

### Out of Scope
- New config keys (SUPPORT_TO_EMAIL naming settled)
- `app_version` in template (no setting exists)
- Frontend changes
- i18n / localization of template copy

## Capabilities

### New Capabilities
- `support-feedback-email`: Rich HTML template + reply_to wiring for support feedback delivery

### Modified Capabilities
None (no existing spec-level capabilities affected)

## Approach

Extend `EmailService.send_support_feedback(feedback_type, subject, message, user_email, user_id)` to build a structured HTML template following the visual language of `send_invite_email`. Add `reply_to=user_email` to the Resend payload. Router extracts `current_user.email` and `current_user.id` and passes them. Template includes: feedback type badge, subject, escaped message, user email/id row, server UTC timestamp footer. All existing sanitization (html.escape, CRLF strip) preserved.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-backend/app/services/email_service.py` | Modified | Add `user_email`, `user_id` params; build rich HTML; add `reply_to` to Resend payload |
| `cortex-backend/app/routers/support.py` | Modified | Pass `current_user.email`, `current_user.id` to seam |
| `cortex-backend/tests/test_email_service.py` | Modified | Update existing tests for new signature; add template content assertions |
| `cortex-backend/tests/test_support_feedback.py` | Modified | Update mock assertions for new params |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| R4-R8 test breakage from signature change | Low | Surface-level: add params to all call sites; existing assertions still valid |
| Template escaping regression | Low | Existing html.escape + CRLF tests preserved; add template-specific assertions |
| `reply_to` domain verification | Low | Resend does NOT require domain verification for `reply_to` (only `from`) |

## Rollback Plan

Revert seam signature to `(feedback_type, subject, message)` and remove `reply_to` from Resend payload. Router stops passing user context. Template reverts to bare `<pre>`. Git revert of the change commit.

## Dependencies

- CORTEXDIST-29 shipped (SUPPORT_TO_EMAIL, sanitization, 503 unconfigured) — already done
- Resend SDK v2.32.2 `reply_to` param available — confirmed

## Success Criteria

- [ ] `send_support_feedback` accepts `user_email` and `user_id` params
- [ ] Resend payload includes `reply_to=user_email`
- [ ] HTML template renders tipo, asunto, mensaje, usuario (email/id), UTC timestamp
- [ ] All existing CORTEXDIST-29 tests pass unchanged (regression intact)
- [ ] New tests assert template content and reply_to wiring
- [ ] Router passes `current_user.email` and `current_user.id` to seam
