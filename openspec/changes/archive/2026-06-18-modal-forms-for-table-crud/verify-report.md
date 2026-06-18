# Verify Report: modal-forms-for-table-crud

**Date:** 2026-06-18  
**Updated:** 2026-06-18  
**Verdict:** APPROVED → ALL WARNINGS RESOLVED

---

## Post-fix Update

- **W1 (focus return)** has been resolved. `EntityFormModal` now captures `document.activeElement` before `showModal()` and restores focus to that element when the modal closes (via `isOpen=false`) or unmounts while open.
- A closed modal remains in the DOM but no longer exposes `aria-modal="true"`, so it does not interfere with `getTopmostModal()` used by other modals.
- `EntityFormModal.test.tsx` now has 11 tests (was 9), including explicit focus-return and unmount-restore coverage.
- **W2 (browser-back close)** has been resolved. `BreweryList.tsx` now pushes a new history entry when opening the edit modal from the detail modal (`setSearchParams({ modal: 'edit', id })` without `replace`), so `history.back()` returns to `/breweries` and clears the form modal. `BreweryList.test.tsx` has a dedicated test that uses `createMemoryRouter` and `router.navigate(-1)` to verify this behavior.
- **W3 (isLoading wiring)** has been resolved. `BreweryForm` exposes `onSavingChange`; `BreweryList` tracks `isFormLoading` state and passes it to `EntityFormModal.isLoading`. A dedicated test verifies the "Saving..." overlay and `aria-busy` state during submit.
- Full suite re-run: **363 tests passed**, TypeScript clean, production build successful.

---

## 1. Spec Coverage

| # | Requirement / Scenario | Evidence | Result |
|---|------------------------|----------|--------|
| **R1** | **Brewery create-from-table and modal lifecycle** | | |
| R1-S1 | Create from table: user activates "Agregar" → create modal opens over `/breweries` | `BreweryList.tsx:207` renders `<Link to="/breweries/new">`; Router redirects `/breweries/new` → `/breweries?modal=new`; `BreweryList.tsx:54` reads `modal=new`; `EntityFormModal` wraps `BreweryForm`. Test: `BreweryList.test.tsx:397-410` "opens the create modal from a ?modal=new deep link". Test: `BreweryList.test.tsx:380-395` "links Agregar Cervecería to the legacy /breweries/new route". | PASS |
| R1-S2 | Close without mutation: modal closes, list data unchanged | `handleCloseFormModal` at `BreweryList.tsx:186-188` calls `setSearchParams({}, {replace:true})`. Test: `BreweryList.test.tsx:437-460` "clears search params when the form modal is closed". | PASS |
| **R2** | **Brewery list refresh after modal submit** | | |
| R2-S1 | Successful submit refreshes list | `handleFormSuccess` at `BreweryList.tsx:190-193` calls `await loadBreweries()` then `setSearchParams({}, {replace:true})`. Test: `BreweryList.test.tsx:462-503` "refetches the list after a successful create submit" — verifies 3 fetch calls (initial + create + refetch). | PASS |
| R2-S2 | Failed submit preserves retry context | `BreweryForm.tsx:144-149` catches error, sets `error` state, keeps `formData` unchanged. Test: `BreweryForm.test.tsx:185-203` "shows an error message and keeps form values when submit fails". Test: `BreweryList.test.tsx:506-538` integration test "keeps form values when submit fails". | PASS |
| **R3** | **Manual brewery list access (modified)** | | |
| R3-S1 | Active database card opens list | `DatabasesPage.tsx:16-22` defines breweries card with `status: 'active'` and `route: '/breweries'`. | PASS |
| R3-S2 | Deep link opens create modal from list context | Router redirects `/breweries/new` → `/breweries?modal=new`. Test: `router.test.tsx:90-98` "redirects /breweries/new to /breweries?modal=new". | PASS |
| R3 | List renders compact summary with `nombre_cerveceria`, `razon_social`, `ciudad` | `BreweryList.tsx:218-225` renders table with those 3 columns. Test: `BreweryList.test.tsx:91-110` "renders exactly three summary columns" asserts Nombre, Razón Social, Ciudad. | PASS |
| **R4** | **Brewery row actions reuse shared edit and delete flows** | | |
| R4-S1 | Modal Edit stays in list context | `handleEdit` at `BreweryList.tsx:172-177` closes detail modal, sets search params `modal=edit&id=...`. `BreweryList.tsx:276-288` renders `EntityFormModal` with `BreweryForm` inside. Test: `BreweryList.test.tsx:225-249` "closes the detail modal and opens the form modal when Edit is clicked". | PASS |
| R4-S2 | Invalid edit deep link recovers safely | `BreweryForm.tsx:96-107` fetches brewery by `id`, on failure sets `notFound` state. Recovery UI at `BreweryForm.tsx:157-163` shows "Registro no encontrado" with a "Volver a cervecerías" button calling `onCancel`. Test: `BreweryForm.test.tsx:206-219` "shows a not-found state when edit data cannot be loaded". | PASS |
| **R5** | **Brewery edit routes become modal entry points** | | |
| R5 | `/breweries/:id/edit` redirects to `/breweries?modal=edit&id=:id` | `router.tsx:17-20` defines `BreweryEditRedirect` component using `useParams` and `<Navigate>`. Test: `router.test.tsx:100-108` "redirects /breweries/:id/edit". | PASS |
| R5 | Browser back closes the modal | `BreweryList.tsx:173-178` opens edit from detail with a `push` (no `replace`) via `setSearchParams({ modal: 'edit', id })`. Closing the modal uses `setSearchParams({}, {replace:true})`. Test: `BreweryList.test.tsx:263-296` "closes the form modal when the browser back button is pressed after opening edit from detail". | PASS |
| **R6** | **Accessibility, performance, and coverage** | | |
| R6 | Labelled modal titles | `EntityFormModal.tsx:79` renders `<h3 id={headingId}>` with `aria-labelledby={headingId}` on `<dialog>`. | PASS |
| R6 | Accessible close controls | Close button with `aria-label="Close form"` at `EntityFormModal.tsx:83-88`. | PASS |
| R6 | Escape handling only for topmost modal | `EntityFormModal.tsx:56-65` uses `getTopmostModal()` to check if this dialog is topmost before closing. Test: `EntityFormModal.test.tsx:82-93` "ignores Escape when another modal is on top". | PASS |
| R6 | Focus return on close | `EntityFormModal.tsx` now tracks `previouslyFocusedElement` and calls `restoreFocus()` when the modal closes or unmounts. Tests: `EntityFormModal.test.tsx` "returns focus to the triggering element when the modal closes" and "restores focus when the component unmounts while the modal is open". | **PASS** |
| R6 | One refetch after successful submit | `handleFormSuccess` at `BreweryList.tsx:190-193` calls `loadBreweries()` once then clears params. Test confirms exactly 3 fetches (initial + POST + refetch). | PASS |
| **R6** | **Test coverage** | | |
| R6 | Create modal tests | `EntityFormModal.test.tsx` (9 tests: open, close, backdrop, loading, Escape stacking, aria). `BreweryForm.test.tsx` (8 tests: create, edit, submit, cancel, error, not-found). `BreweryList.test.tsx` modal tests (create deep link, close, refetch, failed submit). | PASS |
| R6 | Edit modal tests | `BreweryList.test.tsx:412-435` "opens the edit modal from a ?modal=edit&id= deep link". | PASS |
| R6 | Deep link tests | `router.test.tsx:90-108` tests both redirect routes. | PASS |
| R6 | Back-button close tests | `BreweryList.test.tsx:263-296` uses `createMemoryRouter` and `router.navigate(-1)` to verify the modal closes. | PASS |
| R6 | Failed submit retention tests | `BreweryForm.test.tsx:185-203`, `BreweryList.test.tsx:506-538`. | PASS |
| R6 | Invalid-id recovery tests | `BreweryForm.test.tsx:206-219`. | PASS |

---

## 2. Critical Findings

None. No blocking issues or regressions found.

---

## 3. Warnings

| # | Finding | Impact | Recommendation |
|---|---|---------|--------|----------------|
| W1 | ~~**Focus return not implemented**~~ — **RESOLVED**. | — | Done. |
| W2 | ~~**Browser-back close not explicitly tested**~~ — **RESOLVED**. `BreweryList.tsx` now pushes history on edit-from-detail; `BreweryList.test.tsx` covers `router.navigate(-1)`. | — | Done. |
| W3 | ~~**`isLoading` prop on `EntityFormModal` is hardcoded to `false`**~~ — **RESOLVED**. `BreweryForm.onSavingChange` now wires `saving` state to `EntityFormModal.isLoading` in `BreweryList`. | — | Done. |

*No remaining warnings.*

---

## 4. Suggestions

| # | Suggestion | Priority | Status |
|---|-----------|----------|--------|
| S1 | Add `focusReturn` support to `EntityFormModal` to satisfy the accessibility spec requirement fully. | Medium | ✅ Done |
| S2 | Add an integration test for browser-back-button closing the modal from the Edit flow (search-param based). | Low | ✅ Done |
| S3 | Consider wiring `BreweryForm`'s `saving` state to `EntityFormModal.isLoading` for a consistent loading UX (spinner overlay + disabled backdrop). | Low | ✅ Done |
| S4 | The chunk size warning during build (756KB JS) is unrelated to this change but could be addressed with code splitting in future work. | Low | Open |

---

## 5. Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| `EntityFormModal.test.tsx` | 11 | ✅ All pass |
| `BreweryForm.test.tsx` | 9 | ✅ All pass |
| `BreweryList.test.tsx` | 20 | ✅ All pass |
| `router.test.tsx` | 6 | ✅ All pass |
| **Full suite** | **363** | ✅ All pass |

**Command:** `pnpm test --run` — no failures, no skips.

---

## 6. TypeScript / Build Status

| Check | Result |
|-------|--------|
| `pnpm tsc --noEmit` | ✅ Pass (0 errors) |
| `pnpm build` | ✅ Pass (422 modules transformed, built in 2.70s) |

---

## 7. Task Completion Matrix

| Task | Spec Phase | Status | Evidence |
|------|-----------|--------|----------|
| 1.1 EntityFormModal component + test | Phase 1 | ✅ DONE | `EntityFormModal.tsx` (120 lines), `EntityFormModal.test.tsx` (11 tests including focus return) |
| 1.2 EntityFormModal styles | Phase 1 | ✅ DONE | `EntityFormModal.scss` (121 lines): max-height 80vh, scrollable body, centered overlay, backdrop-filter blur |
| 1.3 EntityFormModal barrel export | Phase 1 | ✅ DONE | `index.ts` exports `EntityFormModal` |
| 1.4 organisms/index.ts update | Phase 1 | ✅ DONE | `EntityFormModal` exported from barrel |
| 2.1 BreweryForm.test.tsx (TDD) | Phase 2 | ✅ DONE | `BreweryForm.test.tsx` (8 tests: create, edit, submit, cancel, error, not-found) |
| 2.2 BreweryForm.tsx extraction | Phase 2 | ✅ DONE | `BreweryForm.tsx` (432 lines): create/edit mode, `initialData`/`id` props, `parseArray`/`joinArray`, API calls |
| 2.3 breweries/index.ts update | Phase 2 | ✅ DONE | Exports `BreweryList` and `BreweryForm`; no stale `BreweryCreate`/`BreweryEdit` exports |
| 3.1 router.tsx redirect routes | Phase 3 | ✅ DONE | `/breweries/new` → `Navigate to="/breweries?modal=new"`, `/breweries/:id/edit` → `BreweryEditRedirect` |
| 3.2 router.test.tsx update | Phase 3 | ✅ DONE | 3 tests for redirect routes including invalid-id |
| 4.1 BreweryList.tsx modal integration | Phase 4 | ✅ DONE | `useSearchParams`, `EntityFormModal` + `BreweryForm`, `handleFormSuccess` refetch |
| 4.2 BreweryList.test.tsx rewrite | Phase 4 | ✅ DONE | 18 tests covering table, detail, delete, create modal, edit modal, deep links, refetch, failed submit |
| 5.1 Delete BreweryCreate.tsx | Phase 5 | ✅ DONE | File does not exist |
| 5.2 Delete BreweryEdit.tsx | Phase 5 | ✅ DONE | File does not exist |
| 5.3 Delete BreweryEdit.test.tsx | Phase 5 | ✅ DONE | File does not exist |
| 6.1 Fix W1: focus return in EntityFormModal | Post-verify | ✅ DONE | `EntityFormModal.tsx` focus capture/restore; 2 new tests |
| 6.2 Fix W2: browser-back close test | Post-verify | ✅ DONE | `BreweryList.tsx` edit-from-detail uses push; `BreweryList.test.tsx` covers `router.navigate(-1)` |
| 6.3 Fix W3: wire saving state to EntityFormModal.isLoading | Post-verify | ✅ DONE | `BreweryForm.tsx` adds `onSavingChange`; `BreweryList.tsx` tracks `isFormLoading`; dedicated overlay test |

---

## 8. Final Verdict

**APPROVED**

All spec requirements have passing test evidence. W1, W2, and W3 have been resolved and verified. No blocking issues, warnings, or regressions remain.

---

## 9. Skill Resolution

Skills injected: `react-19`, `typescript`, `zustand-5`, `work-unit-commits`, `chained-pr`.
Source: orchestrator cache (pre-resolved from registry).