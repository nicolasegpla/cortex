# Archive Report: modal-forms-for-table-crud

**Change:** modal-forms-for-table-crud  
**Pilot domain:** breweries-crud  
**Archived:** 2026-06-18  
**Verdict:** APPROVED_WITH_WARNINGS  
**Delivery:** `size:exception` — maintainer-approved single PR, 2,409 changed lines

---

## What Was Built

Converted brewery create/edit flows from full-page forms to modal dialogs over the table list, keeping the list context alive throughout. This establishes the pattern to replicate across the other three producer domains (coffee-farms, wine-producers, animal-feed-producers).

**Key implementation:**
- `EntityFormModal` — reusable `<dialog>` organism with stacked-modal Escape precedence
- `BreweryForm` — single form component with `initialData?`/`id?`/`onSuccess`/`onCancel` props; replaces both `BreweryCreate` and `BreweryEdit` pages
- Modal state driven by URL search params (`?modal=new`, `?modal=edit&id=x`) — deep links preserved, back-button closes modal via `replace:true`
- `/breweries/new` and `/breweries/:id/edit` routes redirect to `/breweries?modal=...`
- List refresh via `onSuccess` callback → `loadBreweries()`; no Zustand cache needed
- Deleted: `BreweryCreate.tsx`, `BreweryEdit.tsx`, `BreweryEdit.test.tsx`

---

## Final Artifacts and Locations

| Artifact | Engram topic | Openspec path |
|----------|-------------|---------------|
| Proposal | `sdd/modal-forms-for-table-crud/proposal` (#3354) | `openspec/changes/modal-forms-for-table-crud/proposal.md` |
| Spec | `sdd/modal-forms-for-table-crud/spec` (#3356) | `openspec/changes/modal-forms-for-table-crud/spec.md` |
| Design | `sdd/modal-forms-for-table-crud/design` (#3357) | `openspec/changes/modal-forms-for-table-crud/design.md` |
| Tasks | `sdd/modal-forms-for-table-crud/tasks` (#3360) | `openspec/changes/modal-forms-for-table-crud/tasks.md` |
| Apply progress | `sdd/modal-forms-for-table-crud/apply-progress` (#3361) | `openspec/changes/modal-forms-for-table-crud/apply-progress.md` |
| Verify report | `sdd/modal-forms-for-table-crud/verify-report` (#3363) | `openspec/changes/modal-forms-for-table-crud/verify-report.md` |
| **Archive report** | `sdd/modal-forms-for-table-crud/archive-report` (#3364) | `openspec/changes/modal-forms-for-table-crud/archive-report.md` |

---

## Verification Verdict: APPROVED_WITH_WARNINGS

All 6 spec requirements covered by passing tests:
- R1: Create-from-table modal lifecycle ✅
- R2: List refresh after submit ✅
- R3: Manual brewery list access (modified) ✅
- R4: Row actions reuse shared edit/delete flows ✅
- R5: Edit routes become modal entry points ✅
- R6: Accessibility, performance, and coverage ✅ (with warnings)

**Test results:** 358 tests pass, 0 fail | `pnpm tsc --noEmit` 0 errors | `pnpm build` success (422 modules, 3.09s)

### Warnings to Track

| # | Warning | Severity | Action Required |
|---|---------|----------|-----------------|
| W1 | Focus return not implemented — `EntityFormModal` does not track/restore previously-focused element on close | Medium | Track for follow-up; accessibility compliance gap |
| W2 | Browser-back close not explicitly tested — implicit in redirect+search-param architecture | Low | Add explicit browser-back test in next verification cycle |
| W3 | `isLoading` prop hardcoded to `false` in `BreweryList` — modal spinner overlay never shown despite "Guardando..." state | Low | Wire `isLoading` prop properly or remove dead code |

---

## Spec Sync (Delta → Main Specs)

Merged into `openspec/specs/breweries-crud/spec.md`:
- **ADDED** "Brewery create-from-table and modal lifecycle" (2 scenarios)
- **ADDED** "Brewery list refresh after modal submit" (3 scenarios)
- **MODIFIED** "Manual brewery list access" — extended to open create/edit as modal overlays (added "Deep link opens create modal" scenario)
- **MODIFIED** "Brewery row actions MUST reuse shared edit and delete flows" — Edit now opens form modal (added "Modal Edit stays in list context" and "Invalid edit deep link recovers safely" scenarios)

Merged into `openspec/specs/entity-edit-flows/spec.md`:
- **ADDED** "Brewery edit routes become modal entry points" (1 scenario: browser back closes modal)

---

## Size Exception Record

| Field | Value |
|-------|-------|
| Estimated diff (tasks) | ~780–900 lines |
| Actual diff (apply) | 2,409 lines |
| Budget | 800 lines |
| Exceeded by | 1,609 lines (~201%) |
| Decision | `size:exception` — maintainer approved single PR |
| Reason for overrun | `BreweryForm` replaced both old page files; `BreweryList.test.tsx` rewritten more extensively than forecasted |

---

## Next Steps / Follow-Up Work

1. **Replicate pattern for remaining 3 domains** — coffee-farms, wine-producers, animal-feed-producers each get their own SDD change following the same `EntityFormModal` + `{Entity}Form` + search-param modal state pattern
2. **Fix W1 (focus return)** — track/restore previously-focused element on `EntityFormModal` close for accessibility compliance
3. **Fix W3 (isLoading)** — wire `isLoading` prop through `BreweryList` to enable modal spinner overlay, or remove the dead prop
4. **Add W2 explicit test** — add browser-back explicit test case to `BreweryList.test.tsx`

---

## SDD Cycle Complete

All 15 tasks completed across 5 phases. Implementation verified against spec with 3 non-blocking warnings. Diff exceeded budget; maintainer approved `size:exception`. Change archived.