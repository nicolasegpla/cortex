# Proposal: Support Feedback Coverage Audit

## Intent

Close the single coverage gap identified by the audit of CORTEXDIST-31 against the existing 89-test TDD suite. `send_support_feedback` is the only email service method that lacks a `ResendError` propagation test at the service boundary — `send_invite_email` already has one (`test_send_invite_email_propagates_resend_errors`). The router-level `test_r7_seam_failure_returns_502` covers generic `Exception → 502`, but does not prove the service method itself propagates `ResendError` instead of swallowing or translating it. This change adds the missing test and runs full verification.

## Scope

### In Scope
- Add `test_send_support_feedback_propagates_resend_errors` to `cortex-backend/tests/test_email_service.py`, mirroring the existing `send_invite_email` pattern.
- Run full backend (`pytest`) and frontend (`pnpm --filter cortex-frontend test`) suites; both must remain green.
- Publish the audit coverage matrix as the evidence artifact for CORTEXDIST-31 closure.

### Out of Scope
- Rate limiting — consciously deferred from CORTEXDIST-29; CORTEXDIST-31 scope does not include it. Tracked as follow-up.
- Any production code changes — behavior already exists, only untested at this boundary.
- New spec/design cycle — disproportionate for a single-test coverage addition.

## Spec Delta (merged into proposal)

A separate `sdd-spec` pass is skipped: the change is one test, zero production code, and the requirement below is the entire delta.

### Modified Capability: `support-feedback-email`
- **New requirement**: When the Resend SDK raises `resend.exceptions.ResendError` during `send_support_feedback`, the service method MUST propagate the exception unchanged to the caller (no swallowing, no translation, no fallback return). The router's existing `except Exception` clause maps it to HTTP 502 with the Spanish detail message.
- **Test contract**: `test_send_support_feedback_propagates_resend_errors` patches `resend.Emails.send` to raise `ResendError(code=422, error_type='invalid_parameter', message='Invalid email', suggested_action='Fix it')`, calls `service.send_support_feedback(...)`, and asserts `pytest.raises(ResendError, match='Invalid email')`. Mirrors `test_send_invite_email_propagates_resend_errors` at line 51 of the same file.

### New Capabilities
None.

## Approach

Approach B from the exploration: pure coverage addition following the established invite-email pattern. No production code changes. TDD discipline preserved — the new test is a coverage gap closure, not a behavior change.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-backend/tests/test_email_service.py` | Modified | Add one test method mirroring the invite-email ResendError pattern. |
| `openspec/specs/support-feedback-email/spec.md` | Modified (post-archive) | Archive phase appends the new requirement after verify passes. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| New test fails because `send_support_feedback` swallows `ResendError` | Low | Exploration confirmed the method propagates; router R7 already relies on this. If it fails, that's a real bug — fix in production code, not the test. |
| Suites regress on unrelated tests | Low | Branch is green (567/567 backend, 566/566 frontend) before this change. |

## Rollback Plan

Revert the single commit adding the test (`git revert HEAD`). No production code was touched, so rollback is a clean one-commit revert with zero runtime impact.

## Dependencies

- Branch `feat/cortexdist-32-support-feedback` — already checked out.
- Plane CORTEXDIST-31 (parent) and CORTEXDIST-32 (this subtask) — last subtask.
- Existing `test_send_invite_email_propagates_resend_errors` pattern as the template.

## Success Criteria

- [ ] `test_send_support_feedback_propagates_resend_errors` passes in isolation.
- [ ] `pytest cortex-backend/tests/` — all tests green (≥ 568).
- [ ] `pnpm --filter cortex-frontend test` — all tests green (≥ 566).
- [ ] Coverage matrix (exploration.md) has zero ❌ entries for CORTEXDIST-31 criteria.
- [ ] CORTEXDIST-31 ready for archive.
