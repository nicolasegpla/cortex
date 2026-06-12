# Tasks: Coffee Farms First Connection

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~760 (PR #1 ~370, PR #2 ~390) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR1 → PR 2 (stacked-to-main) |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend CRUD: schemas, service, router, main.py wiring, service tests | PR 1 | Base: main; service tests included |
| 2 | Frontend + router tests: CoffeeFarmList, CoffeeFarmCreate, router wiring, DatabasesPage flip, router tests | PR 2 | Base: main; depends on PR1 |

## Phase 1: Backend Foundation — Schemas + Service

- [x] 1.1 Create `cortex-backend/app/schemas/coffee_farms.py` with `CoffeeFarmCreate`, `CoffeeFarmUpdate`, `CoffeeFarmResponse` using `Decimal` for `hectareas_totales`, `hectareas_cafe`, `puntaje_cafe` and `Literal` for `tipo_actividad`, `tipo_proceso`, `nivel_tecnificacion`
- [x] 1.2 Create `cortex-backend/app/services/coffee_farm_service.py` with `create`, `list_all`, `get_by_id`, `update`, `delete` methods backed by Supabase client (no search/inspect/count)
- [x] 1.3 Create `cortex-backend/tests/test_coffee_farm_service.py` with 8 tests: CRUD with mocked Supabase (create/list/get×2/update×2/delete×2)

## Phase 2: Backend Router + Wiring

- [x] 2.1 Create `cortex-backend/app/routers/coffee_farms.py` with 5 endpoints (`POST/GET/GET/{id}/PUT/DELETE /coffee-farms`), auth via `get_current_user`, delete restricted to `super_admin`
- [x] 2.2 Modify `cortex-backend/app/main.py` to import and mount the coffee_farms router
- [x] 2.3 Create `cortex-backend/tests/test_coffee_farms_router.py` with 9 tests: 201/200×2/404×3/204/401 coverage using TestClient + monkeypatch

## Phase 3: Frontend — List + Create Components

- [x] 3.1 Create `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.tsx` with loading/empty/error states, delete button, and data table
- [x] 3.2 Create `cortex-frontend/src/features/coffee-farms/CoffeeFarmCreate.tsx` with fieldset sections, `parseArray` for `variedades_sembradas` and `equipos`, redirect to `/coffee-farms` on success
- [x] 3.3 Create `cortex-frontend/src/features/coffee-farms/index.ts` barrel export

## Phase 4: Frontend Routing + Page Wiring

- [x] 4.1 Modify `cortex-frontend/src/app/router.tsx` to add `/coffee-farms` and `/coffee-farms/new` routes under `ProtectedRoute`
- [x] 4.2 Modify `cortex-frontend/src/presentation/pages/DatabasesPage.tsx` to flip `coffee-farms` card `status` from `coming-soon` to `active`

## Phase 5: Verification

- [x] 5.1 Run `pytest cortex-backend/tests/test_coffee_farm_service.py` — all 8 tests pass
- [x] 5.2 Run `pytest cortex-backend/tests/test_coffee_farms_router.py` — all 9 tests pass
- [x] 5.3 Run `pnpm --filter cortex-frontend test` — verify vitest tests pass for CoffeeFarmList and CoffeeFarmCreate
- [ ] 5.4 Manual: Create a coffee farm via `/coffee-farms/new`, verify it appears in `/coffee-farms` list
