# Proposal: Remaining Front Table Detail Modals

## Intent

BreweryList (26 columns, 3000px) and CoffeeFarmList (23 columns, 3000px) still render wide tables with horizontal scroll and inline Edit/Delete actions. This change extends the already-established compact-row + EntityDetailModal pattern to these two remaining tables for consistent UX.

## Scope

### In Scope
- Compact BreweryList to 3 summary columns: `nombre_cerveceria`, `razon_social`, `ciudad`
- Compact CoffeeFarmList to 3 summary columns: `nombre_finca`, `razon_social`, `ciudad`
- Row-click opens EntityDetailModal with full record grouped by section
- Edit/Delete actions live inside the detail modal (no inline actions)
- SCSS: remove `min-width: 3000px`, add clickable-row styles
- Test rewrites: assert compact columns, row-click modal, modal Edit/Delete

### Out of Scope
- EntityDetailModal changes (reused as-is, no modifications)
- Backend API modifications
- Search, filter, or pagination changes
- Hover-open behavior (explicitly excluded)
- Shared utility extraction (deferred per CORTEX.md Rule 2)

## Capabilities

> This section is the CONTRACT between proposal and specs phases.

### New Capabilities
- `breweries-crud`: Frontend brewery list with compact columns and row-click detail modal (no existing spec).

### Modified Capabilities
- `compact-table-rows`: Extend "supported producer lists" requirement to include brewery and coffee-farm lists.
- `coffee-farms-crud`: Update "Manual coffee farm list access" requirement — list uses compact columns and row-click detail modal instead of wide table with inline actions.

## Approach

Mirror the reference pattern from WineProducerList/AnimalFeedProducerList directly:
1. Replace wide table markup with 3 summary columns per list
2. Add `selectedRecord` state + row `onClick` handler
3. Compose existing `EntityDetailModal` with `buildSections` for each entity
4. Remove inline Edit/Delete buttons; actions live in modal
5. Update SCSS: remove forced `min-width`, add `cursor: pointer` on rows
6. Rewrite tests to assert compact columns, row-click opens modal, modal Edit/Delete

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-frontend/src/features/breweries/BreweryList.tsx` | Modified | 3 summary columns, modal state, row click, `buildSections` |
| `cortex-frontend/src/features/breweries/BreweryList.scss` | Modified | Remove `min-width: 3000px`, add clickable-row styles |
| `cortex-frontend/src/features/breweries/BreweryList.test.tsx` | Modified | Compact columns, row-click modal, modal Edit/Delete |
| `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.tsx` | Modified | Same transformation as BreweryList |
| `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.scss` | Modified | Same SCSS changes |
| `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.test.tsx` | Modified | Same test updates |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Test rewrites are substantial | High | Mirror WineProducerList.test.tsx structure exactly |
| CoffeeFarmList mock is partially populated | Medium | Complete mock object before modal assertions |
| TypeScript null handling for modal fields | Low | Follow existing formatter pattern from reference lists |

## Rollback Plan

Revert BreweryList and CoffeeFarmList components, SCSS, and tests to their previous state. No shared components are modified. The existing EntityDetailModal remains untouched.

## Dependencies

- None. Reuses existing EntityDetailModal, DeleteConfirmationModal, useDeleteRecord hook.

## Success Criteria

- [ ] BreweryList renders 3 visible columns without horizontal scroll
- [ ] CoffeeFarmList renders 3 visible columns without horizontal scroll
- [ ] Clicking any row opens EntityDetailModal with full record data
- [ ] Edit button navigates to existing edit route
- [ ] Delete button opens confirmation flow and removes row on success
- [ ] No hover-dependent interactions; all actions via click/tap
- [ ] All existing tests pass after rewrites
