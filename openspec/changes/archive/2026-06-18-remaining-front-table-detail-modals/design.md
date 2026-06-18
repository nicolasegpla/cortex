# Design: Remaining Front Table Detail Modals

## Technical Approach

Mirror the reference pattern from `WineProducerList` and `AnimalFeedProducerList` directly onto `BreweryList` and `CoffeeFarmList`. Both follow the identical structure: 3 summary columns → row click → `EntityDetailModal` → `buildSections` → modal Edit (navigates to existing edit route) / Delete (opens confirmation). No shared-component changes. No backend changes.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|----------|---------|-----------|--------|
| Pattern reuse | A) Mirror reference lists directly | A: Duplicates `formatArray`/`formatValue` but guarantees consistency and avoids premature abstraction (CORTEX.md Rule 2). B: Adds risk, widens scope, yields no immediate payoff. | **A** |
| Modal title | A) `nombre_cerveceria` / `nombre_finca` | Consistent with WineProducerList using `nombre_comercial`. | **A** |
| `buildSections` grouping | A) Identificación, Ubicación, Contacto, Producción, Notas | Follows existing section granularity in reference lists. Omit empty/null sections not applicable — all sections present for both entities. | **A** |
| Test mock completeness | A) Partial mocks (id+name+city) for summary tests, full mocks for modal tests | Separates concerns; summary column tests need only visible fields, detail modal tests need rich mocks. Matches WineProducerList approach (producer-1 full, producer-2 partial). | **A** |

## Data Flow

```
API response ──→ useState<Brewery[]/CoffeeFarm[]> ──→ 3-column table
                           │
              row onClick  │
                           ▼
              selectedRecord + isDetailOpen ──→ EntityDetailModal
                           │                        │
              Edit ────────┤                        │
                           ▼                        ▼
              useNavigate(id/edit)          openModal(id) ──→ DeleteConfirmationModal
                                                             │
                                               onSuccess ────┤
                                                             ▼
                                              filter state ──→ re-render
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `cortex-frontend/src/features/breweries/BreweryList.tsx` | Modify | Add `selectedBrewery`, `isDetailOpen` state; `buildSections`; `handleRowClick`/`handleEdit`/`handleDelete`; import `useNavigate`, `EntityDetailModal`; replace 26-column table with 3 summary columns (`nombre_cerveceria`, `razon_social`, `ciudad`); remove inline Edit/Delete buttons |
| `cortex-frontend/src/features/breweries/BreweryList.scss` | Modify | Remove `min-width: 3000px`; delete `__actions`, `__edit-button`, `__delete-button` blocks; add `__row { cursor: pointer; &:focus-visible { outline: 2px solid $color-accent-primary; outline-offset: -2px; } }` |
| `cortex-frontend/src/features/breweries/BreweryList.test.tsx` | Modify | Rewrite to mirror `WineProducerList.test.tsx`: mock `useNavigate`; test 3 summary columns; test row-click opens detail modal; test modal Edit navigates; test modal Delete opens confirmation; preserve existing delete-confirm/cancel/error tests adapted for row-click flow |
| `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.tsx` | Modify | Same transformation: `selectedFarm`, `isDetailOpen`, `buildSections`, `useNavigate`, `EntityDetailModal`, 3 summary columns (`nombre_finca`, `razon_social`, `ciudad`) |
| `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.scss` | Modify | Same SCSS changes as BreweryList |
| `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.test.tsx` | Modify | Same test rewrite; enrich `mockFarms[0]` with full fields for detail modal assertions |

## Interfaces / Contracts

No new interfaces. `Brewery` and `CoffeeFarm` interfaces remain unchanged. `EntityDetailModal` (`EntityDetailModalProps`, `EntityDetailModalSection`) reused as-is — contract already satisfied by `buildSections` output.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | 3 summary columns rendered | `getAllByRole('columnheader')` → `toHaveLength(3)` |
| Unit | Row click opens detail modal with full fields | `user.click(row)` → `getByRole('dialog')` → assert field values from mock |
| Unit | Modal Edit navigates to correct route | Mock `useNavigate`, click Edit → `expect(navigate).toHaveBeenCalledWith('/breweries/brewery-1/edit')` |
| Unit | Modal Delete opens confirmation | Click Delete in detail modal → assert `DeleteConfirmationModal` visible |
| Unit | Delete confirm/cancel/error flows | Preserve existing tests, adapt row interaction: row click → modal Delete → confirmation |
| Unit | Empty state / error state | Preserve existing tests; no changes to loading/empty/error rendering |

## Migration / Rollout

No migration required. Both `BreweryList` and `CoffeeFarmList` are self-contained feature modules. Reuse existing `EntityDetailModal`, `DeleteConfirmationModal`, and `useDeleteRecord`. Revert to previous files if needed — no shared state modified.

## Open Questions

- [ ] CoffeeFarmList test mock: `mockFarms[1]` currently has only `nombre_finca`, `ciudad`, `variedades_sembradas`, `created_at`, `updated_at`. Modal assertions need a complete second mock or accept that the second row's modal will show `'-'` for null fields. Follow WineProducerList precedent: producer-2 is partial and still works — detail modal renders null fields as `'-'`.

## Risks

| Risk | Mitigation |
|------|------------|
| CoffeeFarmList `mockFarms[1]` incomplete → modal assertions may fail | Follow WineProducerList precedent: partial mocks render `'-'` for nulls via existing `formatArray`/`|| '-'` pattern; detail assertions target mockFarms[0] only |
| Test rewrites miss an existing assertion | Mirror WineProducerList.test.tsx test structure exactly; preserve delete-confirm/cancel/error test intent adapted for row-click |
| SCSS specificity conflicts with EntityDetailModal | No risk: `__row` class is scoped to list BEM block; EntityDetailModal uses its own `.entity-detail-modal` namespace |
