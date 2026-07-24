# Tasks: Support Feedback Endpoint

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~450 (5 new files + 5 modified) |
| 400-line budget risk | Low (under orchestrator 800-line budget) |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr-default |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | End-to-end feedback slice (schema + seam + router + extraction) | PR 1 | `python -m pytest tests/test_support_schemas.py tests/test_support_feedback.py -v` | `uvicorn app.main:app` + `curl -X POST /support/feedback -H "Authorization: Bearer <jwt>"` | revert 5 new + 4 modified files; admin_users re-acquires its local `get_email_service` on revert (zero data impact) |

## Phase 1: RED — Tests (Schema + Router)

- [x] 1.1 Create `cortex-backend/tests/test_support_schemas.py` with 10 RED tests S1–S10 (valid request, extra forbid, empty/whitespace/over-limit subject & message, invalid type, all four Literal types, response serialization).
- [x] 1.2 Create `cortex-backend/tests/test_support_feedback.py` with 10 RED tests R1–R10 using the `test_n8n_chat_router.py` auth-override pattern (401, 422 empty/extra field, 200 happy, seam args without `to_email`, recipient from default `SUPPORT_TO_EMAIL`, log no message, 503 unconfigured).
- [x] 1.3 Run `python -m pytest cortex-backend/tests/test_support_schemas.py cortex-backend/tests/test_support_feedback.py > /tmp/opencode/support-feedback-endpoint-red.txt 2>&1`; confirm all 20 fail with collection/import errors (not infrastructure errors).

## Phase 2: GREEN — Implementation

- [x] 2.1 Add `support_to_email: str = Field(default='stalloy@stalloy.io', alias='SUPPORT_TO_EMAIL')` to `cortex-backend/app/core/config.py:Settings` (default → seam always has a target, never a 503 cause).
- [x] 2.2 Create `cortex-backend/app/schemas/support.py`: `FeedbackType = Literal["bug","mejora","nueva_funcion","otro"]`, `SupportFeedbackRequest` (`extra="forbid"`, subject 1–200, message 1–5000), `SupportFeedbackResponse(success, message)`.
- [x] 2.3 Create `cortex-backend/app/dependencies.py` with `get_email_service()` moved verbatim from `admin_users.py:32-40` (raises HTTPException 503 when `not is_configured()`).
- [x] 2.4 Add `send_support_feedback(self, feedback_type, subject, message) -> dict` to `cortex-backend/app/services/email_service.py`; recipient = `self.settings.support_to_email`; minimal `<pre>{message}</pre>` HTML; `is_configured()` guard raises `RuntimeError`.
- [x] 2.5 Create `cortex-backend/app/routers/support.py`: `APIRouter(prefix="/support", tags=["support"])`; `POST /feedback` calling `email_service.send_support_feedback(payload.type, payload.subject, payload.message)` — NO `to_email` arg; `Depends(get_current_user)` + `Depends(get_email_service)`; logger `app.routers.support` with `SUPPORT-FEEDBACK:` prefix; INFO start/done, WARNING failure; never log `payload.message` or subject text; `except Exception → 502` detail `"No se pudo enviar el mensaje de feedback"`.
- [x] 2.6 Modify `cortex-backend/app/routers/admin_users.py`: drop local `get_email_service` (lines 32-40); `from app.dependencies import get_email_service`; remove now-dead `EmailService`/`get_settings` imports if unused.
- [x] 2.7 Modify `cortex-backend/app/main.py`: import `support`; `application.include_router(support.router)`.
- [x] 2.8 Modify `cortex-backend/app/routers/__init__.py`: append `support` to `__all__`.
- [x] 2.9 Re-run RED suites from 1.3; confirm all 20 tests now pass.

## Phase 3: Verification

- [x] 3.1 Full backend regression: `python -m pytest cortex-backend/tests -q`; expect 0 regressions in admin_users, email_service, n8n_chat, main.
- [x] 3.2 Diff-stat guard: `git diff --stat feat/cortexdist-32-support-feedback`; expect additions+deletions ≤ 800 lines; abort PR if exceeded and split.
- [x] 3.3 **MANDATORY** Persist TDD Cycle Evidence table (columns: `test_id`, `red_error_or_exit_code`, `green_status`, `refactor_note`) to Engram observation `sdd/support-feedback-endpoint/apply-progress`. Lesson from prior verify failures: MUST land in the Engram apply-progress observation, not only the reply. 20 rows (S1–S10, R1–R10) required.

## Remediation 2026-07-24 (bounded corrections, CORTEXDIST-32)

Post-review security/robustness batch; no commit. Full suite: 565 passed (561 + 4 new).

- [x] R-1 Escape user message in email HTML: `html.escape(message)` in `send_support_feedback` (`app/services/email_service.py`); aligns with parent CORTEXDIST-30. New test `test_send_support_feedback_escapes_message_html` (`tests/test_email_service.py`).
- [x] R-2 Sanitize CR/LF from subject when building the email subject line (header-injection guard). New test `test_send_support_feedback_sanitizes_subject_crlf`.
- [x] R-3 R8 environment robustness: `monkeypatch.delenv("SUPPORT_TO_EMAIL", raising=False)`; assert `captured["to"] == settings.support_to_email` instead of the hardcoded literal.
- [x] R-4 Logger visibility: `app/routers/support.py` now uses `logging.getLogger("uvicorn.error")` + `setLevel(logging.INFO)`, matching the house pattern from `app/routers/n8n_chat.py:16-17`.
- [x] R-5 Boundary length tests: subject exactly 200 chars accepted (S7b); message exactly 5000 chars after strip accepted (S7c).

## Remediation Round 2 — 2026-07-24 (verify FAIL test-coverage gaps, CORTEXDIST-32)

Post-verify bounded corrections closing the 3 CRITICAL test-coverage findings + 1 SUGGESTION from `verify-report.md`. Test-only changes; production code untouched (mutation checks below prove the new tests fail against broken production). No commit. Full suite: 567 passed (565 + 2 new).

- [x] RR2-1 CRITICAL 1 — over-limit message rejection: added `test_s7d_rejects_message_over_5000_chars` (`tests/test_support_schemas.py`): 5001-char message raises `ValidationError`. Mutation proof: `max_length=5000→5001` makes S7d FAIL.
- [x] RR2-2 CRITICAL 2 — empty subject at endpoint level: added `test_r2b_empty_subject_returns_422` (`tests/test_support_feedback.py`): authenticated POST with `subject=""` → 422 AND `send_support_feedback.assert_not_called()`.
- [x] RR2-3 CRITICAL 3a — R9 full success-log assertions (`test_r9_message_content_never_logged`): now asserts `type=bug`, `user_id=<uuid>`, `status=success`, `subject_len=` present, and message/subject text absent. Mutation proof: dropping `user_id` from the start log makes R9 FAIL.
- [x] RR2-4 CRITICAL 3b — R7 failure-log assertions (`test_r7_seam_failure_returns_502`): now asserts a WARNING record with `SUPPORT-FEEDBACK: failed`, `status=502`, `error=Exception` exists, and payload message content appears in no log record. Mutation proof: dropping `error=%s` from the warning log makes R7 FAIL.
- [x] RR2-5 SUGGESTION — replaced deprecated `status.HTTP_422_UNPROCESSABLE_ENTITY` with `status.HTTP_422_UNPROCESSABLE_CONTENT` in R2/R2b/R3 (deprecation warnings in changed support tests eliminated).
