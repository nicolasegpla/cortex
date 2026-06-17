# Tasks: Frontend Table Record Deletion

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~380–480 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full implementation | PR 1 | All phases in one PR; ~380–480 lines total |

## Phase 1: Foundation — apiClient 204 Fix + Hook Infrastructure

- [x] 1.1 **RED**: Add 204 test case to `cortex-frontend/src/services/api/client.test.ts` — mock fetch returning 204, assert `delete()` resolves without JSON parse error
- [x] 1.2 **GREEN**: Fix `cortex-frontend/src/services/api/client.ts` — guard `response.json()`: return `undefined` when status is 204; change `delete<T>` signature to `delete(endpoint): Promise<void>`
- [x] 1.3 **GREEN**: Create `cortex-frontend/src/hooks/useDeleteRecord.ts` — generic hook managing modal state, API call lifecycle (open → confirm → pending → result), accepts `endpoint` + `onDeleted` callback
- [x] 1.4 **RED**: Write `cortex-frontend/src/hooks/useDeleteRecord.test.ts` — unit test hook state transitions: idle→open→deleting→success→closed; error path preserves modal

## Phase 2: Core — DeleteConfirmationModal Component

- [x] 2.1 **RED**: Write `cortex-frontend/src/presentation/components/organisms/DeleteConfirmationModal/DeleteConfirmationModal.test.tsx` — component tests for confirm/deleting/success/error states; ESC key closes; focus behavior
- [x] 2.2 **GREEN**: Create `cortex-frontend/src/presentation/components/organisms/DeleteConfirmationModal/DeleteConfirmationModal.tsx` — native `<dialog>` element with three visual states: confirm, deleting (spinner), result (success/error); auto-closes on success after 2s; renders error inline
- [x] 2.3 **GREEN**: Create `cortex-frontend/src/presentation/components/organisms/DeleteConfirmationModal/DeleteConfirmationModal.scss` — modal styling per design
- [x] 2.4 **GREEN**: Create `cortex-frontend/src/presentation/components/organisms/DeleteConfirmationModal/index.ts` — barrel export
- [x] 2.5 **GREEN**: Update `cortex-frontend/src/presentation/components/organisms/index.ts` — add `DeleteConfirmationModal` export

## Phase 3: Integration — Wire Four List Components

- [x] 3.1 **RED**: Add delete flow integration test to `cortex-frontend/src/features/breweries/BreweryList.test.tsx` — mock fetch for 204 and 403; assert row removed on success, error shown on failure
- [x] 3.2 **GREEN**: Refactor `cortex-frontend/src/features/breweries/BreweryList.tsx` — replace `window.confirm` + inline handler with `useDeleteRecord`; add `<DeleteConfirmationModal>` markup
- [x] 3.3 **GREEN**: Refactor `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.tsx` — same pattern as BreweryList
- [x] 3.4 **GREEN**: Refactor `cortex-frontend/src/features/wine-producers/WineProducerList.tsx` — same pattern
- [x] 3.5 **GREEN**: Refactor `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.tsx` — same pattern

## Phase 4: Verification

- [x] 4.1 Run `pnpm test` — all tests green including new 204, hook, modal, and integration tests
- [x] 4.2 Run `pnpm test:coverage` — verify delete flows have coverage
- [x] 4.3 Run `tsc -b` — no type errors