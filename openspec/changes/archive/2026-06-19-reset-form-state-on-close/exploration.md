## Exploration: Reset form state and scroll on create-modal close

### Current State
- Four entity lists (`BreweryList`, `CoffeeFarmList`, `WineProducerList`, `AnimalFeedProducerList`) each keep `isFormModalOpen`, `isEditMode`, and the selected record in local `useState`.
- The `EntityFormModal` is rendered unconditionally in each list; its child `*Form` component is therefore **never unmounted** when the modal closes. The dialog is only hidden via the CSS rule `&:not([open]) { display: none; }`.
- Each `*Form` stores editable state locally in `formData` and resets to `EMPTY_FORM` only inside a `useEffect` keyed on `initialData`/`id`. In create mode both props are `undefined`, so closing and reopening the modal does not re-run the effect; any values typed by the user persist.
- `EntityFormModal` scrolls inside `.entity-form-modal__body` (`overflow-y: auto`, content limited to `max-height: 80vh`). No scroll-reset logic exists today.
- `CountryCitySelect` is fully controlled and does not retain internal state, so it will follow the parent form reset without extra work.

### Affected Areas
- `cortex-frontend/src/features/breweries/BreweryList.tsx` — owns modal state and renders `BreweryForm`.
- `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.tsx`
- `cortex-frontend/src/features/wine-producers/WineProducerList.tsx`
- `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.tsx`
- `cortex-frontend/src/presentation/components/organisms/EntityFormModal/EntityFormModal.tsx` — owns the scrollable container; best place for scroll-to-top on open.
- `cortex-frontend/src/presentation/components/organisms/EntityFormModal/EntityFormModal.scss` — may need a stable selector or `data-testid` for scroll assertions.
- Test files for the four lists and `EntityFormModal` — need new assertions for reset and scroll behavior.

### Approaches
1. **Conditional render / remount the `*Form` in each list** — render each form only when `isFormModalOpen` is `true`.
   - Pros: Reuses existing form initialization; no changes inside form components; create form always mounts with a clean `EMPTY_FORM`; edit mode still receives `initialData` from the list.
   - Cons: Form state is discarded on every close (desired for create; acceptable for edit because data is re-supplied); minor extra remount cost.
   - Effort: Low

2. **Pass a `key` derived from open state + mode to the form** — e.g. `key={isFormModalOpen ? (isEditMode ? selected.id : 'create') : 'closed'}`.
   - Pros: Explicit remount control; same reset benefit as option 1.
   - Cons: Less idiomatic than conditional render; still needs a separate scroll solution; adds noise to each list.
   - Effort: Low

3. **Reset form state inside each `*Form` via a new prop** — add an `isOpen` or `resetToken` prop and reset `formData` to `EMPTY_FORM` in create mode when it changes.
   - Pros: Form owns the reset logic.
   - Cons: Touches all four form components; duplicates the concern; still needs a separate scroll solution in the modal.
   - Effort: Medium

4. **Reset state in `EntityFormModal` by unmounting children when closed** — render `{isOpen && children}` inside the modal body.
   - Pros: Centralized for all consumers.
   - Cons: Changes generic component behavior; may surprise future consumers that expect children to stay mounted; could trigger extra data fetches for edit paths opened by `id`.
   - Effort: Low, but riskier

For the scroll requirement, add a `useEffect` in `EntityFormModal` that sets the modal-body `scrollTop = 0` whenever `isOpen` transitions to `true` (using a ref to `.entity-form-modal__body`).

### Recommendation
- **Adopt option 1 (conditional render) in the four list components** — render each `*Form` only when `isFormModalOpen` is `true`. This is the smallest, most explicit change and directly satisfies the requirement to reset create-form state on close.
- **Add scroll-to-top logic in `EntityFormModal`** when `isOpen` becomes `true`, targeting `.entity-form-modal__body`.
- **Add tests:**
  - In each list test: type into the create form, close via both the × button and `Cancelar`, reopen, and assert that input fields are empty.
  - In `EntityFormModal.test.tsx`: assert that the modal body `scrollTop` resets to `0` when the modal reopens.

### Risks
- Conditional rendering may remove form children while the dialog closing animation/focus management runs; the current implementation closes synchronously, so the impact is minimal.
- jsdom scroll assertions can be brittle; tests should query the modal body directly and set `scrollTop` explicitly before closing.
- Edit forms currently rely on `initialData` passed from the list, so remounting is safe. If a future use case opens an edit form by `id` only, it would refetch on reopen — acceptable but worth noting.

### Ready for Proposal
Yes. Proceed to `sdd-propose` with scope: reset create-form state and modal-body scroll position across the four entity lists, plus the accompanying tests.
