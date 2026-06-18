# Design: Front Table Row Detail Modal

## Technical Approach

Introduce a shared `EntityDetailModal` organism (mirroring the existing `DeleteConfirmationModal` pattern) and compact both producer list tables to ≤8 essential columns. Rows become clickable; detail opens in the modal with Edit/Delete actions. The two feature list components become thin orchestrators — they own data fetch + state, delegate rendering to the shared modal and compact table markup.

## Architecture Decisions

| # | Choice | Alternatives | Rationale |
|---|--------|-------------|-----------|
| 1 | Shared `EntityDetailModal` in `organisms/` | Per-feature inline modals | Single source of truth for dialog styling, Escape-key handling, and ARIA; follows existing `DeleteConfirmationModal` pattern; extensible to deferred brewery/coffee lists |
| 2 | Native `<dialog>` with `open` + `aria-modal` | React portal or div-based modal | Consistent with `DeleteConfirmationModal`; gives us `onCancel` for Escape, backdrop pseudo-element, focus trapping |
| 3 | Row `onClick` on `<tr>` with `cursor:pointer` | Individual cell links or buttons | Simplest interaction model; touch-friendly (no hover); screen-reader announces clickable row |
| 4 | Edit button navigates to existing `/:id/edit` route | Inline edit panel or modal form | Reuses existing edit pages unchanged; keeps modal read-only |

## Data Flow

```
ProducerList (feature)
  │  apiClient.get<T[]>() → local state
  │  onClick(row) → setSelectedProducer
  ├──► EntityDetailModal (organisms)
  │      ├── onEdit → navigate(`/${entity}/${id}/edit`)
  │      └── onDelete → openModal(id) ──► useDeleteRecord ──► DeleteConfirmationModal
  └──► DeleteConfirmationModal (organisms)
         onConfirm → DELETE /api/{entity}/{id} → filter state
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `cortex-frontend/src/presentation/components/organisms/EntityDetailModal/EntityDetailModal.tsx` | Create | Shared detail modal; props: `isOpen`, `title`, `sections`, `onEdit`, `onDelete`, `onClose` |
| `cortex-frontend/src/presentation/components/organisms/EntityDetailModal/EntityDetailModal.scss` | Create | Dialog backdrop, card content, section grouping, action buttons |
| `cortex-frontend/src/presentation/components/organisms/EntityDetailModal/index.ts` | Create | Re-export barrel |
| `cortex-frontend/src/presentation/components/organisms/index.ts` | Modify | Add `EntityDetailModal` export |
| `cortex-frontend/src/features/wine-producers/WineProducerList.tsx` | Modify | Compact to 7 columns; remove inline actions; add row `onClick` + modal state; compose EntityDetailModal |
| `cortex-frontend/src/features/wine-producers/WineProducerList.scss` | Modify | Remove `min-width: 3200px`; add `cursor:pointer` + focus indicator on `tbody tr`; remove `__actions` block |
| `cortex-frontend/src/features/wine-producers/WineProducerList.test.tsx` | Modify | Assert compact columns; test row-click opens modal; test modal Edit/Delete actions |
| `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.tsx` | Modify | Same as WineProducerList — compact to 7 columns |
| `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.scss` | Modify | Remove `min-width: 2200px`; same clickable-row styles |
| `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.test.tsx` | Modify | Same test updates |

## Interfaces / Contracts

```typescript
// EntityDetailModal/EntityDetailModal.tsx

interface EntityDetailField {
  label: string;
  value: ReactNode;
}

interface EntityDetailSection {
  heading: string;
  fields: EntityDetailField[];
}

interface EntityDetailModalProps {
  isOpen: boolean;
  title: string;
  sections: EntityDetailSection[];
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}
```

Sections map to edit-form groupings: Identification (name, NIT, legal name), Location (address, city, country), Contact (name, phone, email), Production (entity-specific fields), Notes (observations, opportunities).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — `EntityDetailModal` | Renders all sections/fields; Edit/Delete callbacks fire; Escape + backdrop click call `onClose`; `aria-modal` present | Render with jsdom, assert DOM, fireEvent.click/keyDown |
| Unit — `WineProducerList` | Compact columns rendered (check `<th>` count); row click sets state + opens modal; modal Edit navigates; modal Delete opens confirmation | Mock `useDeleteRecord`, `react-router-dom`; assert compact `<th>` node count ≤8 |
| Unit — `AnimalFeedProducerList` | Same as wine list | Same approach |
| Integration | Modal stacking: detail modal → Escape closes detail, not delete | Render both modals; verify `getTopmostModal` resolves correctly |

## Migration / Rollout

No migration required. Feature flag not needed — change is self-contained to two list pages. If rollback is needed, revert list components + SCSS; the unused `EntityDetailModal` component causes no side effects.

## Open Questions

- [ ] Confirm compact column selection: wine (7 cols) and animal feed (7 cols) — names match stakeholder expectations?
