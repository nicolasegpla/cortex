# Apply Progress: wine-producers-first-connection

## Change
wine-producers-first-connection — PR #1 backend CRUD slice + PR #2 frontend list/create/routing activation

## Mode
Strict TDD (active per `openspec/config.yaml` and orchestrator injection)

## Completed Tasks
- [x] 1.1 Create `cortex-backend/app/schemas/wine_producers.py`
- [x] 1.2 Create `cortex-backend/app/services/wine_producer_service.py`
- [x] 1.3 Create `cortex-backend/app/routers/wine_producers.py`
- [x] 1.4 Modify `cortex-backend/app/main.py`
- [x] 1.5 Create `cortex-backend/tests/test_wine_producer_service.py`
- [x] 1.6 Create `cortex-backend/tests/test_wine_producers_router.py`
- [x] 1.7 Create `cortex-backend/tests/test_wine_producers_wiring.py`
- [x] 2.1 Create `cortex-frontend/src/features/wine-producers/index.ts`
- [x] 2.2 Create `cortex-frontend/src/features/wine-producers/WineProducerList.tsx`
- [x] 2.3 Create `cortex-frontend/src/features/wine-producers/WineProducerList.scss`
- [x] 2.4 Create `cortex-frontend/src/features/wine-producers/WineProducerList.test.tsx`
- [x] 2.5 Create `cortex-frontend/src/features/wine-producers/WineProducerCreate.tsx`
- [x] 2.6 Create `cortex-frontend/src/features/wine-producers/WineProducerCreate.test.tsx`
- [x] 2.7 Modify `cortex-frontend/src/app/router.tsx`
- [x] 2.8 Modify `cortex-frontend/src/presentation/pages/DatabasesPage.tsx`

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `cortex-backend/app/schemas/wine_producers.py` | Created | WineProducerCreate (nombre_comercial required, 12 nullable scalars, 8 list[str]\|None arrays), WineProducerUpdate (all optional), WineProducerResponse (+ id, timestamps, from_attributes=True) |
| `cortex-backend/app/services/wine_producer_service.py` | Created | WineProducerService(supabase_client) with create/list_all/get_by_id/update/delete mirroring AnimalFeedProducerService |
| `cortex-backend/app/routers/wine_producers.py` | Created | APIRouter(prefix='/wine-producers'), 5 endpoints, auth via get_current_user, delete role-guarded with require_role(["super_admin"]) |
| `cortex-backend/app/main.py` | Modified | Imported wine_producers and included router after animal_feed_producers |
| `cortex-backend/tests/test_wine_producer_service.py` | Created | 8 unit tests for service CRUD with mocked Supabase |
| `cortex-backend/tests/test_wine_producers_router.py` | Created | 10 integration tests for HTTP endpoints, auth, and validation |
| `cortex-backend/tests/test_wine_producers_wiring.py` | Created | 2 tests verifying route registration and 403 for operativo delete |
| `cortex-frontend/src/features/wine-producers/index.ts` | Created | Barrel exports: WineProducerList, WineProducerCreate |
| `cortex-frontend/src/features/wine-producers/WineProducerList.tsx` | Created | Table with 22 columns, loading/empty/error states, delete with confirmation |
| `cortex-frontend/src/features/wine-producers/WineProducerList.scss` | Created | BEM styles using `@use` and `card-base` mixin |
| `cortex-frontend/src/features/wine-producers/WineProducerList.test.tsx` | Created | 4 vitest tests: renders table, empty state, error state, delete confirmation |
| `cortex-frontend/src/features/wine-producers/WineProducerCreate.tsx` | Created | Form with 5 sections (Identificación, Ubicación, Contacto, Insumos, Producción, Notas), comma-split via parseArray, redirect to /wine-producers on success |
| `cortex-frontend/src/features/wine-producers/WineProducerCreate.test.tsx` | Created | 3 vitest tests: renders form, submits normalized arrays + redirect, handles API error |
| `cortex-frontend/src/app/router.tsx` | Modified | Added /wine-producers and /wine-producers/new routes with ProtectedRoute |
| `cortex-frontend/src/presentation/pages/DatabasesPage.tsx` | Modified | Changed wine-producers card status from 'coming-soon' to 'active' |
| `openspec/changes/wine-producers-first-connection/tasks.md` | Modified | Marked Phase 1 and Phase 2 tasks complete |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 + 1.2 (schemas + service) | `tests/test_wine_producer_service.py` | Unit | ✅ 3/3 (main + animal-feed wiring) | ✅ Written first; failed import | ✅ 8/8 passed | ✅ create/list/get/update/delete each with happy + not-found cases | ✅ Clean mirror of AnimalFeedProducerService |
| 1.3 (router) | `tests/test_wine_producers_router.py` | Integration | ✅ 3/3 | ✅ Written first; failed 404 | ✅ 10/10 passed | ✅ 201, 422, 200 list, 200/404 by id, 200/404 put, 204/404 delete, 401 no-auth | ✅ Clean mirror of animal_feed_producers router |
| 1.4 (wiring) | `tests/test_wine_producers_wiring.py` | Unit | ✅ 3/3 | ⚠️ Verification after wiring (main.py already modified to satisfy router tests) | ✅ 2/2 passed | ✅ 5 routes + 403 operativo delete | ➖ No changes needed |
| 2.2 + 2.3 + 2.4 (list + styles + tests) | `WineProducerList.test.tsx` | Integration | ✅ 7/7 (animal-feed list/create tests) | ✅ Written first; failed import | ✅ 4/4 passed | ✅ loaded table, empty state, error state, delete confirmation | ✅ Extracted formatArray helper |
| 2.5 + 2.6 (create + tests) | `WineProducerCreate.test.tsx` | Integration | ✅ 7/7 (animal-feed list/create tests) | ✅ Written first; failed against stub | ✅ 3/3 passed | ✅ render form, submit normalized arrays + redirect, API error | ✅ Used shared parseArray, grouped fields into fieldsets |
| 2.7 (router) | N/A | Structural | ✅ 7/7 | N/A | N/A | ➖ Single route registration change | ➖ No test written; structural wiring |
| 2.8 (DatabasesPage) | N/A | Structural | ✅ 2/2 (DatabasesPage.test.tsx) | N/A | N/A | ➖ Single status flip | ➖ No test written; covered by existing DatabasesPage.test.tsx |

## Test Summary
- **Total tests written**: 27 (8 service + 10 router + 2 wiring + 4 list + 3 create)
- **Total tests passing**: 27/27
- **Full frontend suite**: 196 passed (28 test files)
- **Full backend suite**: 461 passed, 5 warnings (from PR #1)
- **Layers used**: Unit (10), Integration (17)
- **Approval tests**: None — no refactoring tasks
- **Pure functions created**: 2 (formatArray, parseArray)

## Deviations from Design
- The create form uses 5 fieldset sections (Identificación, Ubicación, Contacto, Insumos, Producción, Notas) instead of the 4 sections listed in the task description. The additional Notas section is required to match the `observaciones` and `oportunidades` columns in the `wine_producers` schema and follows the animal-feed baseline pattern.

## Issues Found
- `HTTP_422_UNPROCESSABLE_ENTITY` is deprecated in the installed FastAPI/Starlette version; tests emit a DeprecationWarning suggesting `HTTP_422_UNPROCESSABLE_CONTENT`. This is consistent with existing tests (animal_feed, chat) and was not changed to avoid unrelated churn.
- `pnpm build` (tsc -b) fails with pre-existing TypeScript errors in `src/features/chat/ChatSettings.tsx`, `src/features/chat/credentialsStore.ts`, `src/presentation/pages/ConfigPage.tsx`, and `vite.config.ts`. These errors are unrelated to wine-producers and were not fixed to stay within scope.
- The initial `index.ts` barrel export required a temporary stub `WineProducerCreate.tsx` so the list tests could compile while the create test was being written. The stub was replaced by the real implementation driven by `WineProducerCreate.test.tsx`.

## Remaining Tasks
- None. All Phase 1 and Phase 2 tasks are complete.

## Workload / PR Boundary
- **Mode**: stacked PR slice
- **Current work unit**: PR #2 frontend
- **Boundary**: Adds frontend wine-producers feature (list, create, routes, DatabasesPage activation). Does NOT include backend changes; PR #1 backend files remain in working tree as the stacked base.
- **Estimated review budget impact**: ~868 new/changed lines across 6 new feature files + 2 modified files. This exceeds the 400-line single-PR budget but is the agreed PR #2 slice under `force-chained` delivery.

## Status
14/14 tasks complete. Ready for verify phase on PR #2.
