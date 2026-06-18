# Apply Progress: Modal Forms for Table CRUD (Breweries Pilot)

## Mode

Strict TDD — tests were written before implementation for each work unit.

## TDD Cycle Evidence

| Task | RED (test written first) | GREEN (implementation passes) | REFACTOR notes |
|------|--------------------------|-------------------------------|----------------|
| 1.1 EntityFormModal component + test | `EntityFormModal.test.tsx` written before component existed; failed on missing import | Component + styles + barrel implemented; 9/9 tests pass | Mirrored EntityDetailModal patterns; extracted reusable overlay styles |
| 2.1 BreweryForm test | `BreweryForm.test.tsx` written before component existed; failed on missing import | `BreweryForm.tsx` + `BreweryForm.scss` implemented; 8/8 tests pass | Combined create/edit logic; kept `parseArray`/`joinArray` helpers |
| 2.2-3.2 Router redirects | `router.test.tsx` updated with redirect assertions before route changes | `BreweryEditRedirect` added; `/breweries/new` and `/:id/edit` redirect; 6/6 router tests pass | Used `useParams` for dynamic id interpolation |
| 4.1-4.2 BreweryList integration | `BreweryList.test.tsx` rewritten with modal/search-param assertions before integration | `BreweryList.tsx` wired to `useSearchParams`, `EntityFormModal`, `BreweryForm`; 18/18 list tests pass | Removed `useNavigate`; list stays mounted behind modal |
| 5.1-5.3 Cleanup | Deletion tests covered by retained list tests | Removed `BreweryCreate.tsx`, `BreweryEdit.tsx`, `BreweryEdit.test.tsx` | — |

## Completed Tasks

- [x] 1.1 Create `EntityFormModal.tsx` + test
- [x] 1.2 Create `EntityFormModal.scss`
- [x] 1.3 Create `EntityFormModal/index.ts`
- [x] 1.4 Update `organisms/index.ts`
- [x] 2.1 TDD: Write `BreweryForm.test.tsx`
- [x] 2.2 Create `BreweryForm.tsx`
- [x] 2.3 Update `breweries/index.ts`
- [x] 3.1 Modify `router.tsx` redirect routes
- [x] 3.2 Modify `router.test.tsx`
- [x] 4.1 Modify `BreweryList.tsx` modal integration
- [x] 4.2 Rewrite `BreweryList.test.tsx`
- [x] 5.1 Delete `BreweryCreate.tsx`
- [x] 5.2 Delete `BreweryEdit.tsx`
- [x] 5.3 Delete `BreweryEdit.test.tsx`

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `cortex-frontend/src/presentation/components/organisms/EntityFormModal/EntityFormModal.tsx` | Created | Reusable `<dialog>` wrapper with `isOpen`, `title`, `onClose`, `isLoading`, `children` |
| `cortex-frontend/src/presentation/components/organisms/EntityFormModal/EntityFormModal.test.tsx` | Created | Strict TDD test coverage |
| `cortex-frontend/src/presentation/components/organisms/EntityFormModal/EntityFormModal.scss` | Created | Modal overlay, scrollable body, loading spinner |
| `cortex-frontend/src/presentation/components/organisms/EntityFormModal/index.ts` | Created | Barrel export |
| `cortex-frontend/src/presentation/components/organisms/index.ts` | Modified | Export `EntityFormModal` |
| `cortex-frontend/src/features/breweries/BreweryForm.tsx` | Created | Combined create/edit form with `initialData`, `id`, `onSuccess`, `onCancel` |
| `cortex-frontend/src/features/breweries/BreweryForm.test.tsx` | Created | Strict TDD test coverage |
| `cortex-frontend/src/features/breweries/BreweryForm.scss` | Created | Form actions layout |
| `cortex-frontend/src/features/breweries/BreweryList.tsx` | Modified | Integrated search-param modal state |
| `cortex-frontend/src/features/breweries/BreweryList.test.tsx` | Rewritten | Modal open/close/submit/refetch/error tests |
| `cortex-frontend/src/features/breweries/index.ts` | Modified | Export `BreweryForm`; remove `BreweryCreate`/`BreweryEdit` |
| `cortex-frontend/src/features/breweries/BreweryCreate.tsx` | Deleted | Replaced by modal form |
| `cortex-frontend/src/features/breweries/BreweryEdit.tsx` | Deleted | Replaced by modal form |
| `cortex-frontend/src/features/breweries/BreweryEdit.test.tsx` | Deleted | Superseded by `BreweryForm.test.tsx` |
| `cortex-frontend/src/app/router.tsx` | Modified | `/breweries/new` and `/:id/edit` redirect to list + search params |
| `cortex-frontend/src/app/router.test.tsx` | Modified | Assert redirect behavior |
| `openspec/changes/modal-forms-for-table-crud/tasks.md` | Modified | Marked tasks complete |

## Commits

1. `feat(frontend): add EntityFormModal organism for modal forms`
2. `feat(frontend): extract BreweryForm and redirect legacy create/edit routes to modal`
3. `feat(frontend): integrate BreweryList with modal form state`
4. `chore(frontend): remove stale BreweryCreate and BreweryEdit pages`

## Test Results

- `pnpm test`: 43 test files, 358 tests passed
- `pnpm exec tsc -b --noEmit`: clean
- `pnpm run build`: successful

## Deviations from Design

1. **Router redirect implementation**: The design said `Navigate to="/breweries?modal=edit&id=:id"` literally. React Router does not interpolate `:id` in `Navigate`'s `to` prop, so a small `BreweryEditRedirect` component using `useParams` was added inside `router.tsx` to construct the URL dynamically.
2. **Changed-line count exceeds forecast**: Tasks artifact estimated ~792 changed lines; actual diff from base (`f296875..HEAD`) is **2,409 changed lines** (1,381 insertions + 1,028 deletions). The excess comes from:
   - `BreweryForm.tsx` (432 lines) replacing both `BreweryCreate.tsx` (317 lines) and `BreweryEdit.tsx` (390 lines) — the moved/shared code inflated the diff.
   - `BreweryList.test.tsx` rewrite added more coverage than estimated.
   This is above the 800-line review budget and should be flagged for maintainer review.

## Issues Found

- None blocking. The existing `BreweryEdit.test.tsx` was still passing before deletion because `BreweryEdit.tsx` was retained; removal is clean.

## Remaining Tasks

- None. All phases complete.

## Workload / PR Boundary

- Mode: single PR (as forecast by tasks artifact)
- Current work unit: full breweries pilot (Phases 1–5)
- Boundary: complete implementation from base `f296875` through cleanup
- Review budget impact: **EXCEEDS 800-line budget** — 2,409 changed lines. Recommend maintainer confirms `size:exception` or splitting.

## Status

13/13 tasks complete. Ready for verify.
