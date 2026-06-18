# Proposal: Front Table Row Detail Modal

## Intent

Wine producer (22 columns, 3200px) and animal feed producer (15 columns, 2200px) list tables are too wide for practical use. Users must scroll horizontally to read records, and Edit/Delete actions are scattered inline. This change introduces a compact table + row-click detail modal pattern to improve readability, mobile usability, and accessibility.

## Scope

### In Scope
- Compact wine producer table to essential columns (name, key identifiers, status)
- Compact animal feed producer table to essential columns (name, key identifiers, status)
- Shared `EntityDetailModal` component in `organisms` layer
- Row-click opens detail modal with full record grouped by section
- Edit/Delete actions moved inside the detail modal
- Keyboard navigation and screen-reader support for row-click and modal
- Touch-friendly row interaction for mobile (no hover-dependent behavior)

### Out of Scope
- Brewery and coffee farm lists (same pattern, deferred)
- Changes to the existing edit form pages (reused as-is via navigation)
- Search, filter, or pagination changes
- Backend API modifications

## Capabilities

### New Capabilities
- `row-detail-modal`: Shared detail modal component accepting structured field definitions, onEdit, onDelete, and onClose callbacks. Renders grouped read-only record data with action buttons.
- `compact-table-rows`: Compact table view pattern for producer entity lists. Shows essential columns only, rows are clickable to open the detail modal.

### Modified Capabilities
- `wine-producers-crud`: Update "Manual wine producer list access" requirement — list uses compact columns and row-click detail modal instead of wide table with inline actions.
- `animal-feed-producers-crud`: Update "Manual animal feed producer list access" requirement — same compact table + detail modal pattern.
- `record-deletion-ux`: Delete action is now triggered from within the detail modal instead of directly from the table row.

## Approach

1. Create `EntityDetailModal` in `@/presentation/components/organisms/` — a generic modal that receives `title`, `sections: { heading: string; fields: { label: string; value: ReactNode }[] }[]`, `onEdit`, `onDelete`, `onClose`, `isOpen`.
2. Update `WineProducerList` and `AnimalFeedProducerList` to render only essential columns, add `onClick` handler per row, and open the shared modal.
3. Stop event propagation on existing inline action elements so row-click does not fire when clicking them (during transition).
4. Detail modal's Edit button navigates to the existing edit route (`/:id/edit`); Delete button opens the existing `DeleteConfirmationModal`.
5. Remove wide-table `min-width` SCSS rules; add clickable-row styles with hover/focus indicators.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-frontend/src/presentation/components/organisms/` | New | Shared `EntityDetailModal` component + export |
| `cortex-frontend/src/features/wine-producers/WineProducerList.tsx` | Modified | Compact columns, row click, modal integration |
| `cortex-frontend/src/features/wine-producers/WineProducerList.scss` | Modified | Remove wide-table rules, add clickable-row styles |
| `cortex-frontend/src/features/wine-producers/WineProducerList.test.tsx` | Modified | Update tests for compact view, modal behavior |
| `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.tsx` | Modified | Same as wine producer list |
| `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.scss` | Modified | Same styling adjustments |
| `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.test.tsx` | Modified | Same test updates |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Modal stacking (detail + delete confirmation) | Medium | Use existing `getTopmostModal` utilities; test escape-key propagation |
| Row-click conflicts with inline action clicks | Low | `event.stopPropagation()` on action buttons during transition |
| Test breakage from column reduction | High | Update DOM assertions to match compact column set |
| Over-generalization of `EntityDetailModal` | Low | Keep API simple (sections + fields); avoid entity-specific logic |

## Rollback Plan

Revert the two list components and SCSS files to their previous state. The new `EntityDetailModal` component can remain unused — no breaking changes to shared APIs. Feature flag is not required since the change is self-contained to two list pages.

## Dependencies

- None. Uses existing `DeleteConfirmationModal`, `useDeleteRecord` hook, and modal utilities.

## Success Criteria

- [ ] Wine producer table renders ≤8 visible columns without horizontal scroll on standard viewport
- [ ] Animal feed producer table renders ≤8 visible columns without horizontal scroll on standard viewport
- [ ] Clicking any row opens the detail modal with full record data grouped by section
- [ ] Edit button in modal navigates to the existing edit form
- [ ] Delete button in modal opens the confirmation flow and removes row on success
- [ ] No hover-dependent interactions; all actions work via click/tap
- [ ] Modal is keyboard-navigable (Tab, Escape, Enter) and screen-reader accessible
- [ ] All existing tests pass after updates
