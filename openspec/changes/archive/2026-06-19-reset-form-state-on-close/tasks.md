# Tasks: reset-form-state-on-close

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~180–220 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Scroll reset + conditional render + all tests | PR 1 | Single PR, all 5 list+modal files, ~200 lines |

## Phase 1: EntityFormModal Scroll Reset (Infrastructure)

- [x] 1.1 **TDD-RED**: In `EntityFormModal.test.tsx`, write test: render with `isOpen=true`, set `bodyRef.current.scrollTop = 200`, call `onClose`, render with `isOpen=true` again, assert `scrollTop === 0`. Add `data-testid="entity-form-modal-body"` to the body div assertion.
- [x] 1.2 **TDD-GREEN**: In `EntityFormModal.tsx`, add `const bodyRef = useRef<HTMLDivElement>(null)` and a `useEffect(() => { if (isOpen && bodyRef.current) bodyRef.current.scrollTop = 0; }, [isOpen]);` after the dialogRef effect. Add `data-testid="entity-form-modal-body"` to the `.entity-form-modal__body` div.
- [x] 1.3 **TDD-REFACTOR**: No refactor expected — minimal change.

## Phase 2: Conditional Form Render — Per-List Wrappers (Core Implementation)

- [x] 2.1 **TDD-RED**: In `BreweryList.test.tsx`, write test: open create modal, type in a labeled field, close via × button, reopen, assert field `toHaveValue('')`. Use existing `userEvent.setup()` and fetch-mocking pattern.
- [x] 2.2 **TDD-GREEN**: In `BreweryList.tsx`, wrap `<BreweryForm ... />` with `{isFormModalOpen && <BreweryForm ... />}` at the JSX return (around line 290).
- [x] 2.3 **TDD-REFACTOR**: No refactor expected.
- [x] 2.4 **TDD-RED**: In `CoffeeFarmList.test.tsx`, write same field-clear test pattern for coffee farm.
- [x] 2.5 **TDD-GREEN**: In `CoffeeFarmList.tsx`, wrap `<CoffeeFarmForm ... />` with `{isFormModalOpen && <CoffeeFarmForm ... />}` (around line 268).
- [x] 2.6 **TDD-REFACTOR**: No refactor expected.
- [x] 2.7 **TDD-RED**: In `WineProducerList.test.tsx`, write same field-clear test pattern for wine producer.
- [x] 2.8 **TDD-GREEN**: In `WineProducerList.tsx`, wrap `<WineProducerForm ... />` with `{isFormModalOpen && <WineProducerForm ... />}` (around line 262).
- [x] 2.9 **TDD-REFACTOR**: No refactor expected.
- [x] 2.10 **TDD-RED**: In `AnimalFeedProducerList.test.tsx`, write same field-clear test pattern.
- [x] 2.11 **TDD-GREEN**: In `AnimalFeedProducerList.tsx`, wrap `<AnimalFeedProducerForm ... />` with `{isFormModalOpen && <AnimalFeedProducerForm ... />}` (around line 247).
- [x] 2.12 **TDD-REFACTOR**: No refactor expected.

## Phase 3: Verification

- [x] 3.1 Run `pnpm test -- --run` in `cortex-frontend` and confirm all 5 new tests pass and no existing tests are broken.
- [x] 3.2 Verify `'closes the detail modal and opens the form modal when Edit is clicked'` (edit mode) still passes — confirms edit isolation is unaffected per design.

## File Index

| File | Change | Lines est. |
|------|--------|------------|
| `EntityFormModal.tsx` | Add `bodyRef`, `useEffect` scroll reset, `data-testid` | ~12 |
| `EntityFormModal.test.tsx` | Scroll reset test | ~25 |
| `BreweryList.tsx` | Wrap `BreweryForm` with `{isFormModalOpen && ...}` | ~2 |
| `BreweryList.test.tsx` | Field-clear-after-reopen test | ~30 |
| `CoffeeFarmList.tsx` | Wrap `CoffeeFarmForm` with `{isFormModalOpen && ...}` | ~2 |
| `CoffeeFarmList.test.tsx` | Field-clear-after-reopen test | ~30 |
| `WineProducerList.tsx` | Wrap `WineProducerForm` with `{isFormModalOpen && ...}` | ~2 |
| `WineProducerList.test.tsx` | Field-clear-after-reopen test | ~30 |
| `AnimalFeedProducerList.tsx` | Wrap `AnimalFeedProducerForm` with `{isFormModalOpen && ...}` | ~2 |
| `AnimalFeedProducerList.test.tsx` | Field-clear-after-reopen test | ~30 |
| **Total** | | **~165** |

## Dependency Order

1. **EntityFormModal scroll** (1.1 → 1.2) — foundational, all lists depend on this modal.
2. **BreweryList conditional render** (2.1 → 2.2) — first list, establishes pattern.
3. **CoffeeFarmList** (2.4 → 2.5) — independent, same pattern.
4. **WineProducerList** (2.7 → 2.8) — independent, same pattern.
5. **AnimalFeedProducerList** (2.10 → 2.11) — independent, same pattern.
6. **Run tests** (3.1 → 3.2) — verify all pass together.

Tests within each list are independent; run 3.1 only after all Phase 2 tasks complete.
