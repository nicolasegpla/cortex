# Tasks: Animal Feed Producers First Connection

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650–800 (backend ~350, frontend ~300–450) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain (recommended) |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend CRUD: schemas + service + router + wiring + tests | PR 1 | Base = `develop`; self-contained backend |
| 2 | Frontend: list + create + routing + card activation + tests | PR 2 | Base = PR 1 branch; depends on PR 1 |

---

## Phase 1: PR 1 — Backend Foundation (Schemas, Service, Router)

- [x] 1.1 Create `cortex-backend/app/schemas/animal_feed_producers.py` with `AnimalFeedProducerCreate` (razon_social required, rest nullable), `AnimalFeedProducerUpdate`, `AnimalFeedProducerResponse` Pydantic models
- [x] 1.2 Create `cortex-backend/app/services/animal_feed_producer_service.py` with `AnimalFeedProducerService` class: `create`, `list_all`, `get_by_id`, `update`, `delete` — defer search/inspect/count
- [x] 1.3 Create `cortex-backend/app/routers/animal_feed_producers.py` with FastAPI router at `/animal-feed-producers`; add `require_role(["super_admin"])` delete guard; authenticated endpoints for POST/GET/GET/{id}/PUT/DELETE
- [x] 1.4 Modify `cortex-backend/app/routers/__init__.py` to add `animal_feed_producers` to `__all__`
- [x] 1.5 Modify `cortex-backend/app/main.py` to import and `include_router` the new router
- [x] 1.6 Create `cortex-backend/tests/test_animal_feed_producer_service.py` with 7 unit tests (mocked Supabase: create, list, get existing/missing, update existing/missing, delete)
- [x] 1.7 Create `cortex-backend/tests/test_animal_feed_producers_router.py` with router integration tests: auth guard (401 without token), CRUD ops (201/200/404/204)
- [x] 1.8 Create `cortex-backend/tests/test_animal_feed_producers_wiring.py` verifying route registration and role guard (DELETE returns 403 without super_admin)

---

## Phase 2: PR 2 — Frontend (List, Create, Routing, Card Activation)

- [x] 2.1 Create `cortex-frontend/src/features/animal-feed-producers/index.ts` barrel export for List and Create
- [x] 2.2 Create `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.tsx` with table, loading/empty/error states, delete confirmation
- [x] 2.3 Create `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerCreate.tsx` form: razon_social required, comma-split for especies_manejadas/productos_fabricados, redirects on success
- [x] 2.4 Create `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.scss` (clone-adapt from CoffeeFarmList.scss)
- [x] 2.5 Create `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.test.tsx` with vitest tests: loading, empty, error, delete confirmation
- [x] 2.6 Create `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerCreate.test.tsx` with vitest tests: form render, submit redirects, failure shows error
- [x] 2.7 Modify `cortex-frontend/src/app/router.tsx` to add `/animal-feed-producers` and `/animal-feed-producers/new` routes
- [x] 2.8 Modify `cortex-frontend/src/presentation/pages/DatabasesPage.tsx` to flip `animal-feed` card from `coming-soon` to `active`

---

## Phase 3: Verification Tasks (apply after each PR)

- [x] 3.1 (PR 1) Run `pytest cortex-backend/tests/test_animal_feed_producer_service.py cortex-backend/tests/test_animal_feed_producers_router.py cortex-backend/tests/test_animal_feed_producers_wiring.py` — all must pass
- [x] 3.2 (PR 1) Verify `coffee-farms-first-connection` pattern parity: same CRUD shape, same auth pattern
- [x] 3.3 (PR 2) Run `vitest` on list and create component tests — all must pass
- [ ] 3.4 (PR 2) Manually verify `/animal-feed-producers` loads and `/animal-feed-producers/new` form creates a producer and redirects