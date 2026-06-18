## Exploration: Frontend table row detail modal

### Current State
- `WineProducerList` renders a 22-column table (`min-width: 3200px`) with inline Edit links and Delete buttons.
- `AnimalFeedProducerList` renders a 15-column table (`min-width: 2200px`) with the same inline actions.
- Both lists load the full record set via `apiClient.get<T[]>()` and keep local state.
- Delete flow already uses the shared `DeleteConfirmationModal` from `@/presentation/components/organisms` plus the `useDeleteRecord` hook.
- Edit flow navigates to a dedicated route (`/:id/edit`) and a separate `*Edit.tsx` page.
- `BreweryList` and `CoffeeFarmList` use the same wide-table pattern, but they are out of scope for this change.
- There is no existing read-only/detail modal component; only the delete-confirmation modal exists.
- Modal stacking utilities (`getTopmostModal`, `hasNestedModal`) already exist in `@/shared/modalUtils.ts`.

### Affected Areas
- `cortex-frontend/src/features/wine-producers/WineProducerList.tsx` — reduce visible columns, make rows clickable, render detail modal.
- `cortex-frontend/src/features/wine-producers/WineProducerList.scss` — remove wide-table/min-width rules, add clickable-row styles.
- `cortex-frontend/src/features/wine-producers/WineProducerList.test.tsx` — update tests for compact columns, row click, modal content, and modal Edit/Delete actions.
- `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.tsx` — reduce visible columns, make rows clickable, render detail modal.
- `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.scss` — same styling adjustments.
- `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.test.tsx` — same test updates.
- `cortex-frontend/src/presentation/components/organisms/` — likely needs a new shared `EntityDetailModal` (or similar) component and an export in `index.ts`.

### Approaches
1. **Local per-feature detail modal** — Build a small detail modal directly inside each list component.
   - Pros: No abstraction cost; easy to tailor field order/labels per entity; minimal blast radius.
   - Cons: Duplicated layout/styling between wine and animal feed; harder to extend to breweries/coffee farms later; inconsistent UX risk.
   - Effort: Low

2. **Shared generic detail modal** — Create a reusable `EntityDetailModal` component in `organisms` that receives a title, a structured field list, and action callbacks (onEdit, onDelete).
   - Pros: Single source of truth for styling and behavior; consistent UX; easy to extend to other producer lists later; aligns with existing shared `DeleteConfirmationModal` pattern.
   - Cons: Requires designing a flexible field-definition contract up front; small risk of over-generalization if entity layouts diverge.
   - Effort: Medium

### Recommendation
Use **Approach 2: shared generic detail modal**.
- The two target entities have the same need (read-only full record, grouped fields, Edit/Delete actions).
- A shared component matches the existing design system (cards, modals, organisms layer) and the already-shared `DeleteConfirmationModal`.
- The shared modal should accept a `fields: { label: string; value: ReactNode }[]` prop plus `onEdit`, `onDelete`, `onClose`, and `isOpen`.
- Keep field grouping (Identification, Location, Contact, Production, Notes) consistent with the edit forms so users see the same mental model.

### Risks
- Clicking the row must not trigger navigation when the user clicks the existing inline Edit/Delete buttons; event propagation must be stopped.
- Two modals (detail + delete confirmation) can be open at the same time; stacking/escape-key handling must use `getTopmostModal` consistently.
- Reducing table columns changes existing DOM assertions in tests; tests will need targeted updates.
- "Edit" in the detail modal can reuse the existing edit route (`navigate(<edit-path>)`), keeping the actual form implementation unchanged.

### Ready for Proposal
Yes. The scope is clear: compact the wine and animal-feed producer tables, make rows clickable, and open a shared detail modal with Edit/Delete actions. The next phase should produce a proposal and then specs+design for the shared modal component and the two list updates.
