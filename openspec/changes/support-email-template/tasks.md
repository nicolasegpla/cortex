# Tasks: Support Email Template (CORTEXDIST-30)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~210 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Template + reply_to + seam wiring | PR 1 | `pytest tests/test_email_service.py tests/test_support_feedback.py -q` (from cortex-backend) | N/A — test mocks `resend.Emails.send`; no live harness needed | Revert seam sig, drop `reply_to`, restore `<pre>`; no DB / config / flag rollback |

## Orchestrator Correction (applied)

Design line ~72 wrongly html-escape'd `user_email` into the `reply_to` header. Header MUST be RAW `user_email`; escape applies only inside HTML body. E1 pinned: `captured["reply_to"] == "user@example.com"`.

## Phase 1: RED — Write failing tests (Strict TDD)

- [x] 1.1 Add E1 `test_support_feedback_reply_to_is_user_email` in `tests/test_email_service.py`: `captured["reply_to"] == "user@example.com"` (raw header)
- [x] 1.2 Add E2 `test_support_feedback_from_is_verified_sender`: `from == settings.resend_from_email` AND `from != user_email` (anti-swap)
- [x] 1.3 Add E3 `test_support_feedback_template_has_type_label`: `"Mejora"` in html when `feedback_type="mejora"`
- [x] 1.4 Add E4 `..._has_escaped_subject` + E5 `..._has_escaped_message` (entities present, raw `<script>` absent)
- [x] 1.5 Add E6 `..._has_user_email` + E7 `..._has_user_id` (UUID string present in html)
- [x] 1.6 Add E8 `..._has_iso_timestamp` matching regex `r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}"`
- [x] 1.7 Update E9 / E10 in `tests/test_email_service.py`: add `user_email="u@e.com", user_id="id-1"`; escape / CRLF assertions unchanged
- [x] 1.8 Update R5 in `tests/test_support_feedback.py`: add `user_email="user@example.com", user_id="a1b2c3d4-e5f6-7890-abcd-ef1234567890"` to `assert_called_once_with`; R7 unchanged; update R8 direct call
- [x] 1.9 Run `pytest tests/test_email_service.py tests/test_support_feedback.py -q` (from cortex-backend); confirm E1-E10 + R5 / R8 fail; capture names + tails to `/tmp/opencode/support-email-template-red.txt`

## Phase 2: GREEN — Seam + template + wiring

- [x] 2.1 `cortex-backend/app/services/email_service.py`: import `datetime, timezone`; add `FEEDBACK_TYPE_LABELS` dict; extend `send_support_feedback` to `(feedback_type, subject, message, user_email, user_id)`
- [x] 2.2 Same file: build rich HTML — `html.escape(message / user_email / str(user_id))`, CRLF-strip subject, `datetime.now(timezone.utc).isoformat()`; reuse invite CSS (`#030303` / `#0d0d0d` / `#00FF88`)
- [x] 2.3 Same file: insert `"reply_to": user_email` (raw) into Resend payload; keep `"from": self._from_email`; subject pattern unchanged
- [x] 2.4 `cortex-backend/app/routers/support.py` `submit_feedback`: pass `user_email=current_user.email`, `user_id=str(current_user.id)`
- [x] 2.5 Re-run targeted pytest; confirm E1-E10 + R5 / R8 green; regressions intact

## Phase 3: Regression — Full backend suite

- [x] 3.1 Run `pytest -q` (full, from cortex-backend); confirm R1, R2, R2b, R3, R4, R6, R9 (no msg/subj logging), R10 (503 unconfigured) pass
- [x] 3.2 If any 503 / logging regression breaks, isolate and fix before commit

## Phase 4: Diff-stat guard + Engram persistence

- [x] 4.1 `git diff --stat` vs `feat/cortexdist-32-support-feedback`; confirm add + del ≤ 800 (single-pr budget); halt + report if exceeded
- [x] 4.2 Apply phase MUST persist TDD Cycle Evidence table (design §"TDD Cycle Evidence") via `mem_save` to topic `sdd/support-email-template/apply-progress`, project `cortex`, type `architecture`, `capture_prompt: false`