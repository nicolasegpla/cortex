# Tasks: Remaining Front Table Detail Modals

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 480–530 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR (all 6 files) |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full implementation | PR 1 | All 6 files modified together; pattern is direct mirror of WineProducerList |

## Phase 1: Foundation — BreweryList Component

- [x] 1.1 Add `useNavigate` import from `react-router-dom` to `BreweryList.tsx`
- [x] 1.2 Add `EntityDetailModal` to the import from `@/presentation/components/organisms` in `BreweryList.tsx`
- [x] 1.3 Add `selectedBrewery` state (`useState<Brewery | null>`) and `isDetailOpen` state (`useState<boolean>`) to `BreweryList.tsx`
- [x] 1.4 Add `buildSections(brewery: Brewery)` function to `BreweryList.tsx` with sections: Identificación (`nombre_cerveceria`, `razon_social`, `nit`), Ubicación (`direccion`, `ciudad`, `pais`), Contacto (`nombre_contacto`, `celular_1`, `celular_2`, `correo`), Producción (`maltas_utilizadas`, `lupulos_utilizados`, `levaduras_utilizadas`, `utiliza_otros_productos`, `estilos_cerveza`, `tipo_operacion`), Equipos (`marca_equipo`, `capacidad_brewhouse`, `capacidad_fermentacion`, `litros_mes`, `calidad_equipo`, `formatos_venta`, `donde_vende`), Notas (`observaciones`, `oportunidades`)
- [x] 1.5 Add `handleRowClick`, `handleCloseDetail`, `handleEdit` (navigates to `/breweries/${id}/edit`), `handleDelete` (closes detail modal, calls `openModal(id)`) handlers to `BreweryList.tsx`
- [x] 1.6 Replace the 26-column `<thead>` with 3 columns: `Nombre`, `Razón Social`, `Ciudad`
- [x] 1.7 Replace the `<tbody>` row rendering with 3 `<td>` cells (`nombre_cerveceria`, `razon_social || '-'`, `ciudad || '-'`) and `onClick={() => handleRowClick(brewery)}` on the `<tr>`, removing inline Edit/Delete `<td>` and `__actions` div
- [x] 1.8 Add `EntityDetailModal` JSX below the table with `selectedBrewery`, `title=selectedBrewery.nombre_cerveceria`, `sections=buildSections(selectedBrewery)`, `onEdit=handleEdit`, `onDelete=handleDelete`, `onClose=handleCloseDetail`
- [x] 1.9 Fix `itemLabel` derivation to use `selectedBrewery` (currently uses `breweries.find`) and wire it correctly for `DeleteConfirmationModal`

## Phase 2: Foundation — CoffeeFarmList Component

- [x] 2.1 Add `useNavigate` import from `react-router-dom` to `CoffeeFarmList.tsx`
- [x] 2.2 Add `EntityDetailModal` to the import from `@/presentation/components/organisms` in `CoffeeFarmList.tsx`
- [x] 2.3 Add `selectedFarm` state (`useState<CoffeeFarm | null>`) and `isDetailOpen` state (`useState<boolean>`) to `CoffeeFarmList.tsx`
- [x] 2.4 Add `buildSections(farm: CoffeeFarm)` function to `CoffeeFarmList.tsx` with sections: Identificación (`nombre_finca`, `razon_social`, `nit`, `marca`), Ubicación (`direccion`, `departamento`, `ciudad`, `pais`), Contacto (`nombre_contacto`, `celular`, `correo`), Producción (`tipo_actividad`, `hectareas_totales`, `hectareas_cafe`, `numero_arboles`, `variedades_sembradas`, `tipo_proceso`), Calidad (`puntaje_cafe`, `nivel_tecnificacion`, `equipos`), Notas (`observaciones`, `oportunidades`)
- [x] 2.5 Add `handleRowClick`, `handleCloseDetail`, `handleEdit` (navigates to `/coffee-farms/${id}/edit`), `handleDelete` (closes detail modal, calls `openModal(id)`) handlers to `CoffeeFarmList.tsx`
- [x] 2.6 Replace the 23-column `<thead>` with 3 columns: `Nombre`, `Razón Social`, `Ciudad`
- [x] 2.7 Replace the `<tbody>` row rendering with 3 `<td>` cells (`nombre_finca`, `razon_social || '-'`, `ciudad || '-'`) and `onClick={() => handleRowClick(farm)}` on the `<tr>`, removing inline Edit/Delete `<td>` and `__actions` div
- [x] 2.8 Add `EntityDetailModal` JSX below the table with `selectedFarm`, `title=selectedFarm.nombre_finca`, `sections=buildSections(selectedFarm)`, `onEdit=handleEdit`, `onDelete=handleDelete`, `onClose=handleCloseDetail`
- [x] 2.9 Fix `itemLabel` derivation to use `selectedFarm` and wire it correctly for `DeleteConfirmationModal`

## Phase 3: SCSS — Both Lists

- [x] 3.1 In `BreweryList.scss`: remove `min-width: 3000px` from `&__table`; remove `&__actions`, `&__edit-button`, `&__delete-button` blocks entirely
- [x] 3.2 In `BreweryList.scss`: add `&__row { cursor: pointer; &:focus-visible { outline: 2px solid $color-accent-primary; outline-offset: -2px; } }` to `tbody tr`
- [x] 3.3 In `CoffeeFarmList.scss`: apply identical SCSS changes as 3.1 and 3.2

## Phase 4: Tests — Both Lists

- [x] 4.1 Rewrite `BreweryList.test.tsx` to mirror `WineProducerList.test.tsx`: mock `useNavigate`; assert 3 columnheaders; assert row click opens `EntityDetailModal`; assert modal Edit navigates to `/breweries/brewery-1/edit`; assert modal Delete calls `openModal`; preserve delete-confirm/cancel/error flow tests adapted to row-click → modal Delete path
- [x] 4.2 Rewrite `CoffeeFarmList.test.tsx` applying the same pattern: mock `useNavigate`; assert 3 columnheaders; assert row click opens `EntityDetailModal`; assert modal Edit navigates to `/coffee-farms/farm-1/edit`; assert modal Delete calls `openModal`; preserve delete-confirm/cancel/error flow tests adapted to row-click → modal Delete path; enrich `mockFarms[0]` with full fields for detail modal assertions

## Phase 5: Verification

- [x] 5.1 Run existing test suite: `cd cortex-frontend && pnpm test --run` — all tests pass
- [x] 5.2 Smoke-test `/breweries` and `/coffee-farms` pages in browser — 3-column table renders, row click opens detail modal with all sections, Edit navigates, Delete opens confirmation
