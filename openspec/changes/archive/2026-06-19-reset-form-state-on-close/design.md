# Design: Reset Form State and Scroll on Create Modal Close

## Technical Approach

Conditionally render each `*Form` component inside `EntityFormModal` children only when `isFormModalOpen` is `true`. React unmounts the form on close and remounts with fresh `EMPTY_FORM` state on next open. Add a centralized `useRef` + `useEffect` in `EntityFormModal` to reset `.entity-form-modal__body` scrollTop to `0` when `isOpen` transitions to `true`.

No form internals change. No edit flow disruption — edit forms receive `initialData` on mount and populate identically to current behavior.

## Architecture Decisions

### Decision 1: Form state reset strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Conditional render `{isOpen && <Form/>}` | Unmount/remount on every open; clean, zero form changes | **Chosen** |
| Key-based reset (`key={counter}`) | Requires key counter management; form still unmounts | Rejected — extra state for no benefit |
| Manual `form.reset()` via ref | Requires adding imperative reset to every form; fragile | Rejected — invasive, high surface |

**Rationale**: Conditional render is minimal diff (one wrapping expression per list), React-idiomatic, and the form already initializes from `EMPTY_FORM` when no `initialData`/`id` are passed (see `BreweryForm` lines 93-98). The modal closes synchronously — no exit animation depends on children staying mounted.

### Decision 2: Scroll reset location

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `EntityFormModal` (centralized) | Single `useRef` + `useEffect`; all consumers benefit | **Chosen** |
| Each list component | 4× duplicated scroll logic; tight coupling to DOM structure | Rejected — violates DRY |

**Rationale**: `EntityFormModal` owns the `.entity-form-modal__body` scroll container. A `useEffect` that fires on `isOpen → true` and sets `bodyRef.current.scrollTop = 0` is the standard React imperative DOM pattern for scroll reset. The `.entity-form-modal__body` div has `overflow-y: auto` (SCSS line 91), confirming it is the scrollable element.

### Decision 3: Edit mode handling

| Option | Tradeoff | Decision |
|--------|----------|----------|
| No special handling | Edit form remounts with `initialData`; minor perf on reopen | **Chosen** |
| Separate create/edit rendering paths | More code; diverges from current pattern | Rejected — unnecessary complexity |

**Rationale**: Edit forms already receive `initialData` via props (`selectedBrewery` / `selectedFarm` / etc.) and populate on mount via `useEffect` (e.g., `BreweryForm` lines 86-92). A fresh mount with `initialData` present behaves identically to the current always-mounted approach. The `initialData` is already in list state, so no refetch is needed.

## Data Flow

```
List "Agregar" click
  → handleCreate() sets isFormModalOpen=true, isEditMode=false
  → EntityFormModal opens (isOpen=true)
  → {isFormModalOpen && <*Form />} mounts with EMPTY_FORM
  → useEffect in EntityFormModal resets scrollTop

User closes (× / Cancel / Escape)
  → handleCloseFormModal() sets isFormModalOpen=false
  → <*Form /> unmounts (state destroyed)
  → EntityFormModal closes (isOpen=false)

User clicks "Agregar" again
  → Fresh mount, EMPTY_FORM, scroll at top
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `cortex-frontend/src/features/breweries/BreweryList.tsx` | Modify | Wrap `BreweryForm` with `{isFormModalOpen && ...}` (line 290) |
| `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.tsx` | Modify | Wrap `CoffeeFarmForm` with `{isFormModalOpen && ...}` (line 268) |
| `cortex-frontend/src/features/wine-producers/WineProducerList.tsx` | Modify | Wrap `WineProducerForm` with `{isFormModalOpen && ...}` (line 262) |
| `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.tsx` | Modify | Wrap `AnimalFeedProducerForm` with `{isFormModalOpen && ...}` (line 247) |
| `cortex-frontend/src/presentation/components/organisms/EntityFormModal/EntityFormModal.tsx` | Modify | Add `bodyRef`, `data-testid` on body div, scroll-to-top `useEffect` on `isOpen` |
| `cortex-frontend/src/features/breweries/BreweryList.test.tsx` | Modify | Add test: type in create form, close via × and Cancel, reopen, assert fields empty |
| `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.test.tsx` | Modify | Same pattern as BreweryList |
| `cortex-frontend/src/features/wine-producers/WineProducerList.test.tsx` | Modify | Same pattern as BreweryList |
| `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.test.tsx` | Modify | Same pattern as BreweryList |
| `cortex-frontend/src/presentation/components/organisms/EntityFormModal/EntityFormModal.test.tsx` | Modify | Add test: set scrollTop on body, reopen, assert scrollTop === 0 |

## Interfaces / Contracts

No API changes. The `EntityFormModalProps` interface is unchanged — `data-testid` is added as a DOM attribute on the body div, not a prop:

```tsx
// EntityFormModal.tsx — body div change
<div className="entity-form-modal__body" ref={bodyRef} data-testid="entity-form-modal-body">
```

Scroll reset effect (added after existing `dialogRef` effect, before cleanup effect):

```tsx
const bodyRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (isOpen && bodyRef.current) {
    bodyRef.current.scrollTop = 0;
  }
}, [isOpen]);
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (list) | Form fields empty after close+reopen | Type into labeled field, close via × button and Cancel, reopen, assert `toHaveValue('')`. Repeat for each list. |
| Unit (modal) | Scroll reset on open | Set `body.scrollTop = 200`, close and reopen modal, assert `body.scrollTop === 0`. |
| Integration | Edit mode unaffected | Existing edit test `'closes the detail modal and opens the form modal when Edit is clicked'` still passes — `initialData` populates on fresh mount. |

All tests use existing patterns: `vi.fn()` for fetch mocking, `userEvent.setup({ advanceTimers })`, `renderWithRouter` for lists, direct render for modal.

## Migration / Rollout

No migration required. Pure frontend change, no backend or data impact.

## Open Questions

- [ ] Confirm scroll reset effect timing: `useEffect` with `[isOpen]` dependency fires after paint in JSDOM — verify `scrollTop` assignment works in test environment where layout is virtualized. Mitigation: set `scrollTop` explicitly in test setup before assertion (proposal risk mitigation already covers this).
