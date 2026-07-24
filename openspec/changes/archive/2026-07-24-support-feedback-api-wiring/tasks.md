# Tasks: Support Feedback API Wiring

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 150–190 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr-default |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Add feedback service and ConfigPage wiring with tests | PR 1 | `pnpm --filter cortex-frontend test -- supportApi ConfigPage` | N/A — backend is not seeded in CI; use mocked fetch and service integration tests | Revert `ConfigPage.tsx`; delete `supportApi.ts` and new tests |

## Phase 1: RED Tests (Strict TDD)

- [x] 1.1 Create `cortex-frontend/src/services/supportApi.test.ts` with seven failing tests: exact endpoint/POST/payload keys, Bearer auth, success mapping, TypeError Spanish message, server Error passthrough, and `FeedbackFormResult` shape; mock `globalThis.fetch` using the existing `adminUserApi.test.ts` pattern.
- [x] 1.2 Extend `cortex-frontend/src/presentation/pages/ConfigPage.test.tsx` with a failing mocked-service integration test: render, open `FeedbackModal`, fill `{type,subject,message}`, submit, assert one exact `submitFeedback` call and success UI.
- [x] 1.3 Run the focused frontend tests before production code and capture the failing output in `/tmp/opencode/support-feedback-api-wiring-red.txt`; preserve the RED snapshot lines for apply-progress evidence.

## Phase 2: GREEN Service

- [x] 2.1 Create `cortex-frontend/src/services/supportApi.ts` exporting `FeedbackPayload`-compatible `submitFeedback` and `supportApi`; call `apiClient.post<FeedbackFormResult>('/support/feedback', payload)` without adding identity/context fields.
- [x] 2.2 Implement always-resolved error mapping: `TypeError` to the exact friendly Spanish network message; all other `Error` values to `{success:false,message:error.message}`; rely on `apiClient` for auth.

## Phase 3: GREEN Integration

- [x] 3.1 Modify `cortex-frontend/src/presentation/pages/ConfigPage.tsx` to import `submitFeedback` from `@/services/supportApi` and replace the inert `onSubmit` stub; update the stale CORTEXDIST-27 comment.
- [x] 3.2 Run the focused service and ConfigPage tests; confirm all eight RED tests pass and record test name, RED snapshot line, and GREEN commit in Engram topic `sdd/support-feedback-api-wiring/apply-progress`.

## Phase 4: Regression and Verification

- [x] 4.1 Run the full frontend suite with `pnpm --filter cortex-frontend test`; investigate any regression without weakening the exact payload or always-resolve assertions.
- [x] 4.2 Run `git diff --stat` and verify the single-PR change remains below the 800-line budget and the forecasted 200-line implementation scope; report files and totals.
- [x] 4.3 Confirm no backend, migration, routing, or threat-matrix work is required; verify rollback is limited to the ConfigPage swap and service/test deletion.

## Phase 5: Bounded Correction Batch (post-verify remediation)

- [x] 5.1 Fix session-state leak in `supportApi.test.ts`: reset `useAuthStore.setState({ session: null })` in `afterEach` (alongside fetch restore + `clearAllMocks`); replaced the dynamic `await import` of the auth store with a static import.
- [x] 5.2 Fix non-Error fallback in `supportApi.ts`: `(error as Error).message` yielded `undefined` for non-Error throws, violating the `message: string` contract — now `error instanceof Error ? error.message : 'Ocurrió un error inesperado. Intentá de nuevo.'` (TypeError branch untouched). Added 2 unit tests: plain-string and plain-object rejections → fallback message (string, defined).
- [x] 5.3 Add error-path integration test in `ConfigPage.test.tsx`: `mockSubmitFeedback.mockResolvedValue({ success: false, message: 'Error de red' })` → submit → `role="status"` shows 'Error de red' AND typed subject/message preserved in the form (modal contract).
- [x] 5.4 Regression: focused `pnpm --filter cortex-frontend test supportApi ConfigPage FeedbackModal` → 3 files, 45/45 passed. Full `pnpm --filter cortex-frontend test` → 55 files, 566/566 passed (563 + 3 new). No commit per instruction.
