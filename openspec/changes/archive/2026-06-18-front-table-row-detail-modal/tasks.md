# Tasks: Front Table Row Detail Modal

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 450–550 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR — all changes are tightly coupled |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full implementation | PR 1 | EntityDetailModal + both lists + all tests; self-contained slice |

## Phase 1: Shared EntityDetailModal Component

- [x] 1.1 Create `cortex-frontend/src/presentation/components/organisms/EntityDetailModal/EntityDetailModal.tsx` — shared detail modal organism; mirrors DeleteConfirmationModal pattern (native `<dialog>`, `aria-modal`, `getTopmostModal` for Escape stacking); props: `isOpen`, `title`, `sections: { heading, fields: { label, value }[] }[]`, `onEdit`, `onDelete`, `onClose`; implements `handleKeyDown` (Escape only when topmost), `handleBackdropClick`, `handleDialogCancel`; follow React 19 patterns (named imports, no manual memoization)
- [x] 1.2 Create `cortex-frontend/src/presentation/components/organisms/EntityDetailModal/EntityDetailModal.scss` — dialog backdrop (rgba overlay + blur), card content, section headings, field rows, action button row (Edit + Delete); base styles on DeleteConfirmationModal.scss
- [x] 1.3 Create `cortex-frontend/src/presentation/components/organisms/EntityDetailModal/index.ts` — barrel re-export
- [x] 1.4 Add `EntityDetailModal` export to `cortex-frontend/src/presentation/components/organisms/index.ts`

## Phase 2: WineProducerList — Compact + Row-Click Modal

- [x] 2.1 Add `selectedProducer` state (`WineProducer | null`) and `isDetailOpen` state (`boolean`) to `WineProducerList.tsx`; remove `itemId`-based selection (no longer needed — detail modal tracks selected producer directly)
- [x] 2.2 Replace `<thead>` with exactly 3 columns: Nombre Comercial (`nombre_comercial`), Razón Social (`razon_social`), Ciudad (`ciudad`); remove all other `<th>` entries and the Acciones column
- [x] 2.3 Remove the inline `<td>` for actions in `<tbody>`; add `onClick={() => setSelectedProducer(producer); setIsDetailOpen(true)}` to each `<tr>`; add `cursor: pointer` via CSS (see 2.5)
- [x] 2.4 Compose `<EntityDetailModal>` below `<DeleteConfirmationModal>`; build `sections` prop from `selectedProducer` fields grouped: Identification (nombre_comercial, razon_social, nit), Location (direccion, ciudad, pais), Contact (nombre_contacto, celular, correo), Production (marcas, fuente_azucar, tipo_uva, tipo_vino, levaduras_utilizadas), Bottling (botellas_utilizadas, nutrientes_utilizados, conservantes_utilizados, clarificantes_utilizados, produccion_anual), Notes (observaciones, oportunidades); pass `onEdit={() => navigate(`/wine-producers/${selectedProducer.id}/edit`)}`, `onDelete={() => { setIsDetailOpen(false); openModal(selectedProducer.id); }}`, `onClose={() => setIsDetailOpen(false)}`
- [x] 2.5 Update `WineProducerList.scss`: remove `min-width: 3200px` from `&__table`, remove `&__actions`, `&__edit-button`, `&__delete-button` blocks; add `cursor: pointer` and focus-visible outline to `tbody tr`
- [x] 2.6 Update `WineProducerList.test.tsx`: assert `<th>` count === 3; test row click sets state and opens modal; test modal Edit button navigates; test modal Delete button opens DeleteConfirmationModal; keep existing delete-confirmation flow tests unchanged

## Phase 3: AnimalFeedProducerList — Compact + Row-Click Modal

- [x] 3.1 Add `selectedProducer` state (`AnimalFeedProducer | null`) and `isDetailOpen` state (`boolean`) to `AnimalFeedProducerList.tsx`
- [x] 3.2 Replace `<thead>` with exactly 3 columns: Razón Social (`razon_social`), Marca (`marca`), Ciudad (`ciudad`); remove all other `<th>` entries and the Acciones column
- [x] 3.3 Remove the inline `<td>` for actions in `<tbody>`; add `onClick` to each `<tr>`; add `cursor: pointer` via CSS (see 3.5)
- [x] 3.4 Compose `<EntityDetailModal>` below `<DeleteConfirmationModal>`; build `sections` from producer fields: Identification (razon_social, marca, nit), Location (direccion, departamento, ciudad, pais), Contact (nombre_contacto, celular, correo), Production (especies_manejadas, productos_fabricados), Notes (observaciones, oportunidades); pass `onEdit` and `onDelete` handlers analogous to WineProducerList
- [x] 3.5 Update `AnimalFeedProducerList.scss`: remove `min-width: 2200px` from `&__table`; remove `&__actions`, `&__edit-button`, `&__delete-button` blocks; add `cursor: pointer` to `tbody tr`
- [x] 3.6 Update `AnimalFeedProducerList.test.tsx`: assert `<th>` count === 3; test row click opens modal; test modal Edit and Delete actions; keep existing delete tests

## Phase 4: EntityDetailModal Unit Tests

- [x] 4.1 Create `cortex-frontend/src/presentation/components/organisms/EntityDetailModal/EntityDetailModal.test.tsx` — render with mock sections, assert all fields render; fire `onEdit` and assert callback; fire `onDelete` and assert callback; dispatch Escape keydown and assert `onClose`; click backdrop and assert `onClose`; assert `aria-modal="true"` present; assert Escape is ignored when another modal is on top (mock `getTopmostModal` returning a different dialog ref)
