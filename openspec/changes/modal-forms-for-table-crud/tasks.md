# Tasks: Modal Forms for Table CRUD (Breweries Pilot)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~780–900 (additions + deletions) |
| 400-line budget risk | Medium (at ceiling of 800-line review budget) |
| Chained PRs recommended | No |
| Suggested split | Single PR — all phases ship together |
| Delivery strategy | auto-forecast |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full breweries pilot | PR 1 | All phases together; CI + tests + docs validate E2E |

## Phase 1: Foundation — EntityFormModal Organism

- [x] 1.1 **Create `EntityFormModal.tsx`** — reusable `<dialog>` wrapper with `isOpen`, `title`, `onClose`, `isLoading`, `children`. Mirror `EntityDetailModal` patterns: `useRef` for `showModal/close`, `getTopmostModal()` for stacking. **Test first:** write `EntityFormModal.test.tsx` with open/close/loading scenarios before implementing. (est. ~80 lines test, ~90 lines component)
- [x] 1.2 **Create `EntityFormModal.scss`** — modal styles: `max-height: 80vh`, scrollable body, centered overlay, backdrop blur. (est. ~50 lines)
- [x] 1.3 **Create `EntityFormModal/index.ts`** — barrel export for the organism. (est. ~5 lines)
- [x] 1.4 **Update `organisms/index.ts`** — add `EntityFormModal` export. (est. ~2 lines)

**Dependencies:** None (greenfield component with no dependents).

---

## Phase 2: Core — BreweryForm Extraction

- [x] 2.1 **TDD: Write `BreweryForm.test.tsx`** — test `BreweryForm` in isolation. Cover: create mode (no `initialData`), edit mode (with `initialData`), submit calls `apiClient.post/put`, `onSuccess` called on 2xx, `onCancel` called on cancel, error state preserves form values, field-level validation. Use mock `apiClient`. (est. ~150 lines)
- [x] 2.2 **Create `BreweryForm.tsx`** — extract/create domain form with `initialData?`, `id?`, `onSuccess`, `onCancel` props. Handles `parseArray`/`joinArray` for array fields. Uses `useEffect` to pre-fetch edit data when `id` is set. Submit dispatches to `apiClient.post` (create) or `apiClient.put` (edit). **React 19 rules:** named imports only, no `useMemo`/`useCallback`, `ref` as prop pattern. (est. ~200 lines)
- [x] 2.3 **Update `breweries/index.ts`** — export `BreweryForm`, remove `BreweryCreate` and `BreweryEdit`. (est. ~5 lines)

**Dependencies:** Phase 1 (EntityFormModal used in Phase 3 integration; form itself is independently testable).

---

## Phase 3: Router — Deep-Link Redirects

- [x] 3.1 **Modify `router.tsx`** — replace `/breweries/new` route rendering `BreweryCreate` with `Navigate to="/breweries?modal=new"`. Replace `/breweries/:id/edit` with `Navigate to="/breweries?modal=edit&id=:id"`. Preserve other routes unchanged. (est. ~10 lines change)
- [x] 3.2 **Modify `router.test.tsx`** — rewrite assertions for `/breweries/new` and `/breweries/:id/edit` to assert redirect behavior instead of page renders. Add case for invalid-id redirect. (est. ~60 lines)

**Dependencies:** Phase 2 (BreweryForm must exist before router redirects point at it); Phase 3 is independent of Phase 1 and can run in parallel with it.

---

## Phase 4: Integration — BreweryList with Modal State

- [ ] 4.1 **Modify `BreweryList.tsx`** — add `useSearchParams` hook. Read `modal` and `id` search params. Mount `EntityFormModal` (from Phase 1) with `BreweryForm` (from Phase 2) when `modal` param is set. `onClose` clears params via `setSearchParams({}, {replace:true})`. `onSuccess` calls `loadBreweries()` then clears params. (est. ~40 lines)
- [ ] 4.2 **Rewrite `BreweryList.test.tsx`** — update navigation assertions (tests #6, #7) to test modal open/close via search params. Add: `?modal=new` renders create modal, `?modal=edit&id=x` renders edit modal, close clears params, submit triggers refetch, failed submit retains values. Keep existing 13 tests for delete/detail flows unchanged. (est. ~100 lines)

**Dependencies:** Phase 1, Phase 2, Phase 3 (BreweryList needs EntityFormModal, BreweryForm, and router in place).

---

## Phase 5: Cleanup — Remove Stale Pages

- [ ] 5.1 **Delete `BreweryCreate.tsx`** — removed; replaced by `BreweryForm` in modal. (est. ~0 lines, deletion)
- [ ] 5.2 **Delete `BreweryEdit.tsx`** — removed; replaced by `BreweryForm` in modal. (est. ~0 lines, deletion)
- [ ] 5.3 **Delete `BreweryEdit.test.tsx`** — replaced by `BreweryForm.test.tsx` from Phase 2. (est. ~0 lines, deletion)

**Dependencies:** Phase 2 (form extracted), Phase 4 (integration complete).

---

## Task Summary

| # | Task | Phase | Est. Lines | Dependency |
|---|------|-------|-----------|-----------|
| 1.1 | EntityFormModal component + test | 1 | ~170 | — |
| 1.2 | EntityFormModal styles | 1 | ~50 | 1.1 |
| 1.3 | EntityFormModal barrel export | 1 | ~5 | 1.1 |
| 1.4 | organisms/index.ts update | 1 | ~2 | 1.3 |
| 2.1 | BreweryForm.test.tsx (TDD) | 2 | ~150 | — |
| 2.2 | BreweryForm.tsx extraction | 2 | ~200 | 2.1 |
| 2.3 | breweries/index.ts update | 2 | ~5 | 2.2 |
| 3.1 | router.tsx redirect routes | 3 | ~10 | 2.2 |
| 3.2 | router.test.tsx update | 3 | ~60 | 3.1 |
| 4.1 | BreweryList.tsx modal integration | 4 | ~40 | 1.1, 2.2, 3.1 |
| 4.2 | BreweryList.test.tsx rewrite | 4 | ~100 | 4.1 |
| 5.1 | Delete BreweryCreate.tsx | 5 | 0 | 2.2 |
| 5.2 | Delete BreweryEdit.tsx | 5 | 0 | 2.2 |
| 5.3 | Delete BreweryEdit.test.tsx | 5 | 0 | 2.1 |
| **Total** | | | **~792** | |

## Prerequisites / Blockers

- **None blocking Phase 1–2:** EntityFormModal and BreweryForm are greenfield; no existing code depends on them.
- **Before Phase 4 merge:** All prior phases must be merged; BreweryList integration requires EntityFormModal, BreweryForm, and router redirects in place.
- **Assumption:** `apiClient` already handles `post`/`put`/`get` for breweries; no changes to API layer.
- **Assumption:** `getTopmostModal()` from `modalUtils` is available and tested; EntityDetailModal already uses it.

## Verification Plan

| Phase | Tests | Manual Check |
|-------|-------|-------------|
| 1 | `EntityFormModal.test.tsx` — open, close, loading, backdrop | — |
| 2 | `BreweryForm.test.tsx` — create/edit/submit/cancel/error | — |
| 3 | `router.test.tsx` — redirects for `/new` and `/:id/edit` | Browser back closes modal |
| 4 | `BreweryList.test.tsx` — modal opens/closes via search params | Full create flow: Agregar → fill → submit → row appears |
| 5 | Full CI suite green | No regressions in delete, detail, list load |
