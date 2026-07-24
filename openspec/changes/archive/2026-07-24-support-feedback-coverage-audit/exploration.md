# Exploration: Support Feedback Coverage Audit

## Current State

The support feedback feature was built TDD-first across five Plane subtasks (CORTEXDIST-26 through CORTEXDIST-30 on branch `feat/cortexdist-32-support-feedback`), each archived with passing verify reports. The full pipeline now has **67 tests across 7 files** covering the entire stack:

| Layer | File | Tests | Covers |
|---|---|---|---|
| Backend - Schema | `test_support_schemas.py` | 13 | S1–S10 + S7b/S7c/S7d boundary-length |
| Backend - Router | `test_support_feedback.py` | 11 | R1–R10 + R2b (empty subject) |
| Backend - Email Service | `test_email_service.py` | 13 | E1–E8 + escape + CRLF + 3 invite-only tests |
| Frontend - API Service | `supportApi.test.ts` | 9 | POST, payload, token, success, network error, server error |
| Frontend - FeedbackModal | `FeedbackModal.test.tsx` | 21 | Open/close, validation, submit lifecycle, success/error states |
| Frontend - Textarea | `Textarea.test.tsx` | 7 | Label, required, placeholder, name, asterisk |
| Frontend - ConfigPage | `ConfigPage.test.tsx` | 15 | Tab traversal, button position, wired API, modal nesting |
| **Total** | | **89** | |

All suites pass: backend 567/567, frontend 566/566.

## Affected Areas

- `cortex-backend/tests/test_email_service.py` — the only file with a coverage gap (see below)
- `cortex-backend/tests/test_support_feedback.py` — R8 tests the service seam directly (monkeypatch pattern)
- `cortex-frontend/src/presentation/pages/ConfigPage.test.tsx` — position/accessibility/wiring verified
- No production code changes needed — this is a test-only audit

## Coverage Matrix: Plane Acceptance Criteria → Tests

### Alcance bullet: "pruebas backend del schema"
| Criterion | Test | File | Result |
|---|---|---|---|
| Valid request accepted | `test_s1_valid_request_accepted` | test_support_schemas.py | ✅ |
| Extra field rejected | `test_s2_rejects_extra_field` | test_support_schemas.py | ✅ |
| Empty subject rejected | `test_s3_rejects_empty_subject` | test_support_schemas.py | ✅ |
| Empty message rejected | `test_s4_rejects_empty_message` | test_support_schemas.py | ✅ |
| Whitespace subject rejected | `test_s5_rejects_whitespace_only_subject` | test_support_schemas.py | ✅ |
| Whitespace message rejected | `test_s6_rejects_whitespace_only_message` | test_support_schemas.py | ✅ |
| Subject over 200 chars | `test_s7_rejects_subject_over_200_chars` | test_support_schemas.py | ✅ |
| Subject exactly 200 chars | `test_s7b_accepts_subject_of_exactly_200_chars` | test_support_schemas.py | ✅ |
| Message exactly 5000 chars | `test_s7c_accepts_message_of_exactly_5000_chars` | test_support_schemas.py | ✅ |
| Message over 5000 chars | `test_s7d_rejects_message_over_5000_chars` | test_support_schemas.py | ✅ |
| Invalid type rejected | `test_s8_rejects_invalid_type` | test_support_schemas.py | ✅ |
| All four types accepted | `test_s9_all_four_types_accepted` | test_support_schemas.py | ✅ |
| Response serialization | `test_s10_response_serializes` | test_support_schemas.py | ✅ |

### Alcance bullet: "endpoint autenticado"
| Criterion | Test | File | Result |
|---|---|---|---|
| Unauthenticated → 401 | `test_r1_unauthenticated_returns_401` | test_support_feedback.py | ✅ |
| Auth required (seam not called) | R1 assertion: `assert_not_called()` | test_support_feedback.py | ✅ |

### Alcance bullet: "manejo de error de Resend"
| Criterion | Test | File | Result |
|---|---|---|---|
| Email seam Exception → 502 | `test_r7_seam_failure_returns_502` | test_support_feedback.py | ✅ |
| Email unconfigured → 503 | `test_r10_email_unconfigured_returns_503` | test_support_feedback.py | ✅ |
| 503 seam not called | R10 assertion: `assert_not_called()` | test_support_feedback.py | ✅ |
| 502 detail message | R7 asserts Spanish detail | test_support_feedback.py | ✅ |
| Failure logged as WARNING | R7 asserts caplog record | test_support_feedback.py | ✅ |
| ResendError at service level | **GAP — see below** | — | ❌ |

### Alcance bullet: "pruebas del servicio de email para el método de soporte"
| Criterion | Test | File | Result |
|---|---|---|---|
| HTML escaping (injection guard) | `test_send_support_feedback_escapes_message_html` | test_email_service.py | ✅ |
| CRLF sanitization | `test_send_support_feedback_sanitizes_subject_crlf` | test_email_service.py | ✅ |
| reply_to = user email | `test_support_feedback_reply_to_is_user_email` (E1) | test_email_service.py | ✅ |
| from = verified sender (anti-swap) | `test_support_feedback_from_is_verified_sender` (E2) | test_email_service.py | ✅ |
| Type label rendered | `test_support_feedback_template_has_type_label` (E3) | test_email_service.py | ✅ |
| Subject escaped in template | `test_support_feedback_template_has_escaped_subject` (E4) | test_email_service.py | ✅ |
| Message escaped in template | `test_support_feedback_template_has_escaped_message` (E5) | test_email_service.py | ✅ |
| User email in template | `test_support_feedback_template_has_user_email` (E6) | test_email_service.py | ✅ |
| User ID in template | `test_support_feedback_template_has_user_id` (E7) | test_email_service.py | ✅ |
| ISO timestamp in template | `test_support_feedback_template_has_iso_timestamp` (E8) | test_email_service.py | ✅ |
| Recipient from settings | `test_r8_recipient_resolved_from_support_to_email_default` | test_support_feedback.py | ✅ |
| ResendError propagation | **GAP — see below** | — | ❌ |

### Alcance bullet: "pruebas frontend del control"
| Criterion | Test | File | Result |
|---|---|---|---|
| POST to correct endpoint | `posts to /support/feedback with the POST method` | supportApi.test.ts | ✅ |
| Exact payload keys (3 fields) | `sends exactly the type, subject and message keys` | supportApi.test.ts | ✅ |
| Bearer token attached | `attaches the Bearer token from the auth store` | supportApi.test.ts | ✅ |
| Success result passthrough | `resolves to the backend success result` | supportApi.test.ts | ✅ |
| Network TypeError → friendly | `maps TypeError network failures...` | supportApi.test.ts | ✅ |
| Non-Error rejection fallback | `falls back to a generic Spanish message when the rejection is not an Error` | supportApi.test.ts | ✅ |
| Object rejection fallback | `falls back to a generic Spanish message when the rejection is a plain object` | supportApi.test.ts | ✅ |
| Backend error passthrough | `passes through the backend Spanish message on server errors` | supportApi.test.ts | ✅ |
| Always resolves to FeedbackFormResult | `always resolves to a FeedbackFormResult shape...` | supportApi.test.ts | ✅ |

### Alcance bullet: "validación del formulario"
| Criterion | Test | File | Result |
|---|---|---|---|
| Empty fields blocked | `shows role="alert" validation... on empty submit` | FeedbackModal.test.tsx | ✅ |
| Whitespace-only blocked | `shows role="alert" validation... when fields contain only whitespace` | FeedbackModal.test.tsx | ✅ |
| Corrected fields resubmit | `re-runs validation and submits successfully after correcting empty fields...` | FeedbackModal.test.tsx | ✅ |

### Alcance bullet: "estados de éxito/error"
| Criterion | Test | File | Result |
|---|---|---|---|
| Success shows confirmation | `hides the form and shows a confirmation... on success` | FeedbackModal.test.tsx | ✅ |
| Error preserves text + re-enables submit | `shows a role="status" error, preserves typed text...` | FeedbackModal.test.tsx | ✅ |
| Rejection shows generic + preserves | `shows a generic role="status" error... when onSubmit rejects` | FeedbackModal.test.tsx | ✅ |
| Wired success in ConfigPage | `wires the feedback modal to the real supportApi service and shows the success result` | ConfigPage.test.tsx | ✅ |
| Wired error in ConfigPage | `shows the error result and preserves the typed form values when the submit fails` | ConfigPage.test.tsx | ✅ |

### Alcance bullet: "verificación de que el botón permanece donde está"
| Criterion | Test | File | Result |
|---|---|---|---|
| Button renders with accessible name | `renders "Ayuda y soporte" as a button with accessible name` | ConfigPage.test.tsx | ✅ |
| Button is last nav child | `keeps the support entry as the last nav child with composed classes` | ConfigPage.test.tsx | ✅ |
| Button reachable by Tab | `reaches the support entry via Tab traversal and activates it with Enter` | ConfigPage.test.tsx | ✅ |
| Not hidden from AT | `does not hide the support entry from assistive technology` | ConfigPage.test.tsx | ✅ |
| Enter/Space activation | `flips aria-expanded to true on Enter and Space keyboard activation` | ConfigPage.test.tsx | ✅ |

## Identified Gaps

### GAP 1: ResendError propagation at the email service level (LOW severity)

**What's missing**: The `send_support_feedback` method has no test for `resend.exceptions.ResendError` propagation. The existing `send_invite_email` path DOES have this test (`test_send_invite_email_propagates_resend_errors`), creating an inconsistency.

**What IS covered**:
- R7 (`test_r7_seam_failure_returns_502`): router-level handling when the mocked seam raises a generic `Exception("resend down")`. This proves the router maps any Exception to 502 with the right Spanish detail and logging.
- R10 (`test_r10_email_unconfigured_returns_503`): the unconfigured guard at the dependency level.

**What is NOT covered**: The specific behavior of `send_support_feedback` when the actual Resend SDK raises `ResendError`. The current coverage relies on the router's generic `except Exception` catch, but doesn't prove that the service method itself behaves correctly (propagates, doesn't swallow, doesn't translate) under a real Resend API error.

**Why it matters**: If a future refactor accidentally catches ResendError inside `send_support_feedback` and returns a falsy value instead of propagating, the router wouldn't trigger 502, and the user would see a confusing success-or-silent-failure. The test would catch this regression.

**Classification**: Pure coverage addition for existing behavior. The behavior already exists (ResendError propagates through the method to the router's except clause), but it's untested at the service boundary. Follows the pattern already established for `send_invite_email`.

## Rate Limiting Follow-up

From CORTEXDIST-29 verify-report (2026-07-24): "Rate limiting is consciously deferred to CORTEXDIST-31." CORTEXDIST-31's scope does not mention rate limiting. This remains a consciously deferred follow-up, not a gap in CORTEXDIST-31's scope. **Recommendation**: document as follow-up in the proposal, do not build here.

## Approaches

### Approach A: Verification-only (no new tests)
Run the existing suites, confirm all 89 tests pass, document the ResendError gap as an accepted risk, and close.

| Pros | Cons | Complexity |
|---|---|---|
| Zero effort, immediate | Leaves a known blind spot at the service boundary | None |
| All Plane acceptance criteria have at least one covering test | Inconsistent with the invite-email pattern | |

### Approach B: Add one service-level ResendError test + verify (RECOMMENDED)
Add `test_send_support_feedback_propagates_resend_errors` to `test_email_service.py`, mirroring the existing `test_send_invite_email_propagates_resend_errors` pattern. Then run both suites to verify.

| Pros | Cons | Complexity |
|---|---|---|
| Closes the only gap found | One test to write (trivial) | Very Low (5–10 lines) |
| Consistent with invite-email service test pattern | | |
| Zero production code changes | | |

## Recommendation

**Approach B** — Add one coverage test and verify. This is the honest recommendation: there is exactly one small gap, and it takes one test to close. Everything else is well-covered. This is a verification-heavy, implementation-light change.

### Recommended task plan

1. **Add RED test** (coverage addition, not RED-first): `test_send_support_feedback_propagates_resend_errors` in `cortex-backend/tests/test_email_service.py`
   - Patches `resend.Emails.send` to raise `ResendError(code=422, ...)`
   - Calls `service.send_support_feedback(...)`
   - Asserts `ResendError` is raised (propagates, doesn't swallow)
   - Mirror of `test_send_invite_email_propagates_resend_errors`

2. **Verify backend**: `pytest tests/test_email_service.py tests/test_support_feedback.py tests/test_support_schemas.py -q`

3. **Verify frontend**: `pnpm --filter cortex-frontend test`

4. **Full regression**: Both suites green

## Risks

- The ResendError propagation gap is LOW severity — the router's catch-all Exception handler already provides 502 coverage, so a missed propagation would still fail safely (just with a less specific error path)
- The frontend ConfigPage position test (`lastElementChild`) couples to DOM structure — changing the component layout could break it even if the button is still visually last. Accepted constraint from prior verify reports.

## Ready for Proposal

**Yes** — Recommend `sdd-propose` for `support-feedback-coverage-audit`. The scope is one test addition + verification run. Zero production code changes.
