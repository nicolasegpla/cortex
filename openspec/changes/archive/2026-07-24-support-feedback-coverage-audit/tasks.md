# Tasks: Support Feedback Coverage Audit

Merged tasks+apply phase (single coverage test + final verification, per proposal.md).

## Phase 1: Coverage Test

- [x] 1. Add `test_send_support_feedback_propagates_resend_errors` to `cortex-backend/tests/test_email_service.py` mirroring `test_send_invite_email_propagates_resend_errors` (line 51): patch `resend.Emails.send` to raise `ResendError(code=422, error_type='invalid_parameter', message='Invalid email', suggested_action='Fix it')`, call `send_support_feedback(feedback_type, subject, message, user_email, user_id)`, assert `pytest.raises(ResendError, match='Invalid email')`.

## Phase 2: Full Verification

- [x] 2. Run full backend suite: `cortex-backend/.venv/bin/python -m pytest -q` — all green (≥ 568). → **576 passed**
- [x] 3. Run full frontend suite: `pnpm --filter cortex-frontend test` — all green (≥ 566). → **566 passed (55 files)**

## Phase 3: Persistence

- [x] 4. Persist TDD Cycle Evidence into Engram apply-progress (`sdd/support-feedback-coverage-audit/apply-progress`).
