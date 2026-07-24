# Design: Support Feedback API Wiring

## Technical Approach

A thin service module `supportApi.ts` wraps `apiClient.post` for `POST /support/feedback`, maps thrown errors into `FeedbackFormResult` so `FeedbackModal` always receives a resolved `{success, message}`, and `ConfigPage` swaps its inert stub (line 116-121) for the real `submitFeedback`. This fulfills the `feedback-modal` boundary contract without altering the modal spec and follows the existing `adminUserApi.ts` module-scope-function convention. Backend is LIVE (CORTEXDIST-29, archived); no backend change.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Module-scope named funcs + `export const supportApi = {...}` (mirrors `adminUserApi`) | Consistent with codebase; testable; reuses `apiClient` auth/token path | ✅ Chosen |
| Inline `apiClient.post` in `ConfigPage` | Zero new files | Rejected — leaks transport into presentation, untestable, anti-pattern |
| Spread payload `{...payload, currentUrl}` | Adds request context | Rejected — backend `extra="forbid"` → 422 |
| Re-throw mapped Error from service | Lets caller decide | Rejected — modal expects `FeedbackFormResult`, never a rejected promise |

### Decision: Always-resolve contract
**Choice**: `submitFeedback` catches all and returns `FeedbackFormResult`; never throws.
**Rationale**: `FeedbackModal.handleSubmit` has a `catch` fallback to `GENERIC_ERROR_MESSAGE`, but relying on it would double-map and discard backend's curated Spanish message. Returning `{success:false}` keeps the modal's `error` status driven by the server message.

### Decision: Error classification by `instanceof`
**Choice**: `error instanceof TypeError` → network; otherwise passthrough `error.message`.
**Rationale**: `apiClient` injects token from `useAuthStore.getState()` (callable outside React) and throws `Error(message)` for non-ok responses; `fetch` throws `TypeError` on network failure. Status codes are not preserved, so classification must be by type. 401 is auto-handled by `apiClient` (logout+redirect) — no explicit branch.

## Error-Mapping Decision Table

| Failure mode | `apiClient` throws | Service returns | RED assertion |
|--------------|--------------------|-----------------|---------------|
| Network / DNS / offline | `TypeError` | `{success:false, message:"No se pudo conectar con el servidor. Verificá tu conexión."}` | fetch rejects with `TypeError` → message exact |
| 422 extra-field (defensive) | `Error("...validation...")` (Spanish passthrough) | `{success:false, message: error.message}` | passthrough exact |
| 502/503 backend transport | `Error` with backend detail | `{success:false, message: error.message}` | passthrough |
| 401 unauth | `Error('Unauthorized')` after logout+redirect | `{success:false, message:'Unauthorized'}` | covered (no special branch) |
| Success 200 | resolves `{success, message}` | passthrough server result | `{success:true, message}` |

## Data Flow

```
FeedbackModal.handleSubmit ──(FeedbackPayload)──→ ConfigPage.onSubmit = submitFeedback
                                                          │
                                                          ▼
                                                  supportApi.submitFeedback
                                                          │
                                                  apiClient.post('/support/feedback', {type, subject, message})
                                                          │ (Bearer token injected by apiClient)
                                                          ▼
                                                  POST /support/feedback
                                                          │
                                            ┌─────────────┴──────────────┐
                                       TypeError (net)              Error (server)
                                            │                            │
                                  friendly Spanish msg          passthrough error.message
                                            └─────────────┬──────────────┘
                                                          ▼
                                          FeedbackFormResult (always resolved)
                                                          │
                                                          ▼
                                          FeedbackModal status = success|error
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `cortex-frontend/src/services/supportApi.ts` | Create | `submitFeedback(payload): Promise<FeedbackFormResult>` wrapping `apiClient.post`; error mapping per table |
| `cortex-frontend/src/services/supportApi.test.ts` | Create | RED-first unit tests (7 cases) |
| `cortex-frontend/src/presentation/pages/ConfigPage.tsx` | Modify | Replace line 116-121 stub with `onSubmit={submitFeedback}`; update comment (drop "inert stub", reference CORTEXDIST-27 done) |
| `cortex-frontend/src/presentation/pages/ConfigPage.test.tsx` | Modify | Add `vi.mock('@/services/supportApi')` + integration test: open modal → fill → submit → success shown; mock `submitFeedback` to return success; assert called once with `{type, subject, message}` |

## Interfaces / Contracts

```ts
import type { FeedbackPayload, FeedbackFormResult } from
    '@/presentation/components/organisms/FeedbackModal/FeedbackModal';

async function submitFeedback(payload: FeedbackPayload): Promise<FeedbackFormResult> {
    try {
        return await apiClient.post<FeedbackFormResult>('/support/feedback', payload);
    } catch (error) {
        if (error instanceof TypeError) {
            return { success: false, message: 'No se pudo conectar con el servidor. Verificá tu conexión.' };
        }
        return { success: false, message: (error as Error).message };
    }
}
export const supportApi = { submitFeedback };
```
Payload is forwarded untouched — `FeedbackPayload` IS exactly `{type, subject, message}` (verified in modal types), so no spread/rebuild needed. RED test asserts `Object.keys(body)` equals `['type','subject','message']`.

## Testing Strategy (RED-first, strict TDD)

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (`supportApi.test.ts`) | happy path returns server `{success,message}` | mock `globalThis.fetch` 200 like `adminUserApi.test.ts` |
| Unit | payload is EXACTLY `{type,subject,message}` (no extra keys, no `currentUrl`) | assert `JSON.parse(body)` keys |
| Unit | Bearer token included (auth wired via `useAuthStore.setState`) | assert `Authorization` header |
| Unit | `TypeError` network → friendly Spanish message | fetch rejects `new TypeError('failed to fetch')` |
| Unit | server `Error` passthrough (422/502) | fetch returns 422 `{detail:'El servicio de email...'}` |
| Unit | endpoint path `/support/feedback` + method POST | assertion on fetch call args |
| Unit | success shape: result satisfies `FeedbackFormResult` | type narrowing + value check |
| Integration (`ConfigPage.test.tsx`) | modal flow calls `submitFeedback` once with `{type,subject,message}` and shows success | `vi.mock('@/services/supportApi')`, render, user fills form, submit, assert mock called + success UI |
| E2E | deferred — backend not seeded in CI; manual smoke | N/A this change |

RED capture: apply phase MUST write failing test output to `/tmp/opencode/support-feedback-api-wiring-red.txt` and persist a **TDD Cycle Evidence** table (test name → RED snapshot line → GREEN commit) into Engram `sdd/support-feedback-api-wiring/apply-progress`.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Plain HTTP service wrapper over an existing approved client.

## Migration / Rollout

No migration. Rollback = revert ConfigPage swap (restore `() => Promise.resolve({...})`) + delete `supportApi.ts`/test. Single commit, zero backend impact, zero data migration.

## Open Questions

- [ ] Should the unused 401 branch in `apiClient` (throws `Error('Unauthorized')` AFTER logout+redirect) ever reach our catch? Edge: if `window.location.href` redirect is async and the throw arrives first, we return `{success:false, message:'Unauthorized'}`. Acceptable given the redirect preempts. Non-blocking.