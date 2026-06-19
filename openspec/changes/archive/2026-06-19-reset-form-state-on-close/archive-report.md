# Archive Report: reset-form-state-on-close

## Summary

Reset create-form state (empty fields) and scroll position (top) when the modal is closed and reopened across four entity list modals: breweries, coffee farms, wine producers, animal feed producers.

## DAG State

| Phase | Status |
|-------|--------|
| proposal | ✅ DONE |
| spec | ✅ DONE |
| design | ✅ DONE |
| tasks | ✅ DONE (15/15) |
| apply | ✅ DONE |
| verify | ✅ PASS |

## Spec Sync (Delta → Main)

| Domain | Action | Details |
|--------|--------|---------|
| form-modal-state-reset | CREATED | New shared spec — 2 requirements, 5 scenarios across 4 entity lists |
| breweries-crud | UPDATED | "Brewery create-from-table and modal lifecycle" — added clean-state + scroll clause + 2 new scenarios |
| coffee-farms-crud | UPDATED | "Manual coffee farm creation flow" — added clean-state + scroll clause + 2 new scenarios |
| wine-producers-crud | UPDATED | "Manual wine producer creation flow" — added clean-state + scroll clause + 2 new scenarios |
| animal-feed-producers-crud | UPDATED | "Manual animal feed producer creation flow" — added clean-state + scroll clause + 2 new scenarios |

## Source of Truth Updated

- `openspec/specs/form-modal-state-reset/spec.md` — CREATED
- `openspec/specs/breweries-crud/spec.md` — MODIFIED
- `openspec/specs/coffee-farms-crud/spec.md` — MODIFIED
- `openspec/specs/wine-producers-crud/spec.md` — MODIFIED
- `openspec/specs/animal-feed-producers-crud/spec.md` — MODIFIED

## Archive Location

`openspec/changes/archive/2026-06-19-reset-form-state-on-close/`

## Verification Result

**Verdict: PASS**
- Build: ✅ Passed (tsc + vite build)
- Tests: ✅ 440/440 passed, 0 failed
- Spec compliance: 6/6 scenarios compliant

## Design Decisions

1. **Conditional render** (`{isOpen && <Form />}`) — React unmount/remount handles reset automatically, no form internals changed
2. **Scroll reset centralized** in `EntityFormModal` via `useRef` + `useEffect([isOpen])`
3. **No special edit handling** — `initialData` on mount prevents create-form state from polluting edit sessions

## Changed Files (Implementation)

| File | Change |
|------|--------|
| `EntityFormModal.tsx` | bodyRef, scroll reset useEffect, data-testid |
| `EntityFormModal.test.tsx` | 2 scroll reset tests |
| `BreweryList.tsx` | Conditional render wrapper |
| `BreweryList.test.tsx` | 2 field-clear-after-reopen tests |
| `CoffeeFarmList.tsx` | Conditional render wrapper |
| `CoffeeFarmList.test.tsx` | 2 field-clear-after-reopen tests |
| `WineProducerList.tsx` | Conditional render wrapper |
| `WineProducerList.test.tsx` | 2 field-clear-after-reopen tests |
| `AnimalFeedProducerList.tsx` | Conditional render wrapper |
| `AnimalFeedProducerList.test.tsx` | 2 field-clear-after-reopen tests |

## Issues

- CRITICAL: None
- WARNING: None
- SUGGESTION: Consider adding a create-then-edit isolation test for additional explicitness (architecturally impossible to fail with conditional render, but would be more explicit)

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived. Ready for the next change.
