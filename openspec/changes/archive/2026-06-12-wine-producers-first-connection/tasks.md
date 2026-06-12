# Tasks: wine-producers-first-connection

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650–710 (PR #1: 350–380, PR #2: 300–330) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 (stacked-to-main) |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend: schemas + service + router + wiring + tests | PR 1 | Base: main; independently testable |
| 2 | Frontend: list + create + routing + DatabasesPage card flip | PR 2 | Base: main (retarget after PR 1 merges) |

---

## Phase 1: Backend Infrastructure (PR #1)

- [x] 1.1 Create `cortex-backend/app/schemas/wine_producers.py` — `WineProducerCreate` (nombre_comercial required, 12 nullable scalars, 8 `list[str]|None` arrays), `WineProducerUpdate` (all optional), `WineProducerResponse` (+ id, created_at, updated_at, `from_attributes=True`)
- [x] 1.2 Create `cortex-backend/app/services/wine_producer_service.py` — `WineProducerService(supabase_client)` with create/list_all/get_by_id/update/delete; mirror `AnimalFeedProducerService` patterns
- [x] 1.3 Create `cortex-backend/app/routers/wine_producers.py` — `APIRouter(prefix='/wine-producers')`, 5 endpoints (POST/GET/GET{id}/PUT/DELETE), auth via `get_current_user`, delete role-guarded with `require_role(["super_admin"])`
- [x] 1.4 Modify `cortex-backend/app/main.py` — add `import wine_producers`, `include_router(wine_producers.router)` after `animal_feed_producers`
- [x] 1.5 Create `cortex-backend/tests/test_wine_producer_service.py` — 7 unit tests: create, list_all, get_by_id (exists + not found), update (exists + not found), delete (exists + not found); use `MagicMock` Supabase client
- [x] 1.6 Create `cortex-backend/tests/test_wine_producers_router.py` — 7+ integration tests: 201, 422 (missing nombre_comercial), 200 list, 200 by id, 404, 200 put, 204/404 delete, 401 no-auth
- [x] 1.7 Create `cortex-backend/tests/test_wine_producers_wiring.py` — verify 5 routes registered in `create_app()`; verify 403 for operativo on delete

---

## Phase 2: Frontend Implementation (PR #2)

- [x] 2.1 Create `cortex-frontend/src/features/wine-producers/index.ts` — barrel exports: `WineProducerList`, `WineProducerCreate`
- [x] 2.2 Create `cortex-frontend/src/features/wine-producers/WineProducerList.tsx` — table with all columns, loading/empty/error states, delete with confirmation dialog
- [x] 2.3 Create `cortex-frontend/src/features/wine-producers/WineProducerList.scss` — BEM styles using `@use` and `card-base` mixin
- [x] 2.4 Create `cortex-frontend/src/features/wine-producers/WineProducerList.test.tsx` — vitest tests: renders table, loading/empty states, delete confirmation
- [x] 2.5 Create `cortex-frontend/src/features/wine-producers/WineProducerCreate.tsx` — form with 4 sections (Identificación, Ubicación+Contacto, Insumos [4 arrays], Producción [4 arrays+2 scalars]), comma-split via `parseArray`, redirect to `/wine-producers` on success
- [x] 2.6 Create `cortex-frontend/src/features/wine-producers/WineProducerCreate.test.tsx` — vitest tests: validates required field, submits form, handles API error
- [x] 2.7 Modify `cortex-frontend/src/app/router.tsx` — add `/wine-producers` and `/wine-producers/new` routes with `ProtectedRoute`
- [x] 2.8 Modify `cortex-frontend/src/presentation/pages/DatabasesPage.tsx` — change wine-producers `status` from `'coming-soon'` to `'active'` (1 line)

---

## Verification Notes

- Migration `004_create_wine_producers.sql` must be verified applied to remote Supabase before PR #1 merge
- PR #1 CI must pass before PR #2 retarget to main
- DELETE button UX decision (hide vs show+403): current pattern shows button; API returns 403
