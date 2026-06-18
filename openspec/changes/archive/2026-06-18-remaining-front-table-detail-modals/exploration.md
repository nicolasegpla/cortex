## Exploration: remaining-front-table-detail-modals

### Current State
`BreweryList` and `CoffeeFarmList` still render wide inline tables (26 and 23 columns respectively) with horizontal scrolling and per-row Edit/Delete buttons. `WineProducerList` and `AnimalFeedProducerList` already use the desired compact-row + `EntityDetailModal` pattern: three summary columns, click a row to open a detail modal with full record data, and Edit/Delete actions live inside the modal. The shared `EntityDetailModal` organism is generic and reusable; no changes are needed there.

### Affected Areas
- `cortex-frontend/src/features/breweries/BreweryList.tsx` — replace wide table with 3 summary columns, add detail-modal state, row click handler, `buildSections`, `useNavigate`, remove inline Edit/Delete buttons.
- `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.tsx` — same transformation for coffee farms.
- `cortex-frontend/src/features/breweries/BreweryList.scss` — remove `min-width: 3000px`, remove action button styles, add clickable row style.
- `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.scss` — same transformation.
- `cortex-frontend/src/features/breweries/BreweryList.test.tsx` — update tests for compact columns, row-click modal, modal Edit/Delete.
- `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.test.tsx` — same transformation.

### Summary Columns
- **BreweryList**: `nombre_cerveceria` (header "Nombre"), `razon_social` (header "Razón Social"), `ciudad` (header "Ciudad").
- **CoffeeFarmList**: `nombre_finca` (header "Nombre"), `razon_social` (header "Razón Social"), `ciudad` (header "Ciudad").

Both follow the pattern already established in `WineProducerList`, which also uses name, legal name, and city as the three visible columns.

### Approaches
1. **Mirror the reference pattern directly** — Adapt `WineProducerList`/`AnimalFeedProducerList` structure to `BreweryList` and `CoffeeFarmList`, keeping formatter helpers local to each feature.
   - Pros: Proven implementation, minimal risk, consistent UX, reuses existing `EntityDetailModal`, follows established test pattern.
   - Cons: Slight duplication of `formatArray`/`formatValue` helpers across features.
   - Effort: Low-Medium.

2. **Extract shared list-presenter utilities first** — Create a shared hook or utility for detail-modal state, section building, and array/value formatting before updating the two lists.
   - Pros: Reduces duplication across four entity lists long-term.
   - Cons: Violates `CORTEX.md` Rule 2 (avoid platform-level abstractions before the client slice proves need), expands scope beyond the follow-up, adds risk without clear payoff.
   - Effort: Medium-High.

### Recommendation
Adopt **Approach 1**: mirror the reference pattern directly. The previous change already validated the compact-row + `EntityDetailModal` pattern, and the requested outcome explicitly asks for the SAME pattern. Refactoring into shared utilities is premature for this follow-up.

### Risks
- Test rewrites are substantial; existing delete-confirmation flow must be preserved.
- `CoffeeFarmList.test.tsx` mock is partially populated; modal detail assertions will require a complete mock object.
- Row click must remain keyboard-accessible; reference SCSS already includes `cursor: pointer` and focus styles.
- TypeScript strict mode requires consistent null handling for all modal fields.
- Strict TDD means tests must be updated first; implementation follows failing tests.
- No backend changes are needed; API contracts remain unchanged.

### Ready for Proposal
Yes. Scope is well-defined, reference implementation exists, and the change is limited to two frontend feature modules plus their tests and styles. No backend or shared-component changes are required.
