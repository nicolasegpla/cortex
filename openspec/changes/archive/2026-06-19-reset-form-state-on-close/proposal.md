# Proposal: Reset Form State and Scroll on Create Modal Close

## Intent

The four entity create forms (breweries, coffee farms, wine producers, animal feed producers) retain stale input and scroll position when the modal is closed and reopened. Users see previous attempts' data and a scrolled-down form, causing confusion and rework.

## Scope

### In Scope
- Conditionally render each `*Form` component only when `isFormModalOpen` is `true` in the four list components, forcing a clean remount on every open.
- Add scroll-to-top logic in `EntityFormModal` that resets `.entity-form-modal__body` scrollTop to `0` when the modal opens.
- Add tests for state reset and scroll behavior across all four lists and `EntityFormModal`.

### Out of Scope
- Changes to form component internals (`*Form` files) — reset is achieved via remount, not internal state logic.
- Edit form behavior — edit forms receive `initialData` on mount, so remounting is safe and already correct.
- Route-based forms (`/breweries/new`, etc.) — those are separate pages, not modals.
- `CountryCitySelect` — already fully controlled, no internal state to reset.

## Capabilities

### New Capabilities
- `form-modal-state-reset`: Create forms must mount with clean state on every open, and the modal body must scroll to top when opened.

### Modified Capabilities
- `breweries-crud`: Update "Brewery create-from-table and modal lifecycle" requirement to specify that closing and reopening the create modal yields a clean form with scroll at top.
- `coffee-farms-crud`: Update "Manual coffee farm creation flow" requirement to specify clean form state and scroll reset on modal reopen.
- `wine-producers-crud`: Update "Manual wine producer creation flow" requirement to specify clean form state and scroll reset on modal reopen.
- `animal-feed-producers-crud`: Update "Manual animal feed producer creation flow" requirement to specify clean form state and scroll reset on modal reopen.

## Approach

1. **Conditional render in each list** — wrap each `*Form` with `{isFormModalOpen && <BreweryForm ... />}` (and equivalent for the other three). This forces React to unmount on close and remount with fresh `EMPTY_FORM` on open. Minimal change, no form internals touched.

2. **Scroll-to-top in `EntityFormModal`** — add a `useEffect` that fires when `isOpen` transitions to `true`, targeting the modal body ref and setting `scrollTop = 0`. Centralized fix applies to all four consumers.

3. **Tests** — per list: type into create form, close modal (× button and Cancel), reopen, assert fields are empty. For `EntityFormModal`: assert `scrollTop === 0` after reopen.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-frontend/src/features/breweries/BreweryList.tsx` | Modified | Conditional render of `BreweryForm` |
| `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.tsx` | Modified | Conditional render of `CoffeeFarmForm` |
| `cortex-frontend/src/features/wine-producers/WineProducerList.tsx` | Modified | Conditional render of `WineProducerForm` |
| `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.tsx` | Modified | Conditional render of `AnimalFeedProducerForm` |
| `cortex-frontend/src/presentation/components/organisms/EntityFormModal/EntityFormModal.tsx` | Modified | Add scroll-to-top `useEffect` on `isOpen` |
| `cortex-frontend/src/presentation/components/organisms/EntityFormModal/EntityFormModal.scss` | Modified | Add `data-testid` for scroll container if needed |
| Test files (4 lists + EntityFormModal) | New | State reset and scroll assertions |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Form unmount during dialog close animation disrupts focus management | Low | Current modal closes synchronously; no exit animation depends on children staying mounted |
| jsdom scroll assertions are brittle | Medium | Query modal body directly; set `element.scrollTop` explicitly in test setup before assertions |
| Edit mode refetches data on reopen (minor perf) | Low | Edit forms already receive `initialData` from list state; refetch is acceptable and was existing behavior |

## Rollback Plan

Revert the conditional render guards in the four list components (restore unconditional `*Form` rendering) and remove the scroll-to-top `useEffect` from `EntityFormModal`. No data migration or backend changes involved — pure frontend revert.

## Dependencies

- None. Pure frontend change, no backend or API prerequisites.

## Success Criteria

- [ ] Opening a create form after closing it shows all fields empty (matching `EMPTY_FORM` defaults)
- [ ] Modal body scroll position is at top (`scrollTop === 0`) when the modal opens
- [ ] All four list tests pass: close via × button and Cancel, reopen, assert empty fields
- [ ] `EntityFormModal` test passes: assert scroll resets on reopen
- [ ] Edit mode continues to work correctly with prefilled `initialData`
- [ ] No regressions in existing CRUD flows (create, edit, delete)
