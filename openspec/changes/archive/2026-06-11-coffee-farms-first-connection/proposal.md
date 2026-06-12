# Proposal: Coffee Farms First Connection

## Intent

Add the first manual CRUD connection for the `coffee_farms` entity, mirroring the existing breweries vertical slice. The table migration already exists (`002_create_coffee_farms.sql`); this change wires up the backend API, frontend list/create pages, and activates the card in DatabasesPage.

## Scope

### In Scope
- Backend: Pydantic schemas, Supabase-backed service (CRUD only), FastAPI router `/coffee-farms`
- Backend: Service + router tests mirroring breweries test patterns
- Frontend: `CoffeeFarmList.tsx` + `CoffeeFarmCreate.tsx` components
- Frontend: Router entries `/coffee-farms` and `/coffee-farms/new`
- Frontend: Flip `coffee-farms` status from `coming-soon` to `active` in DatabasesPage

### Out of Scope
- `search`/`inspect`/`count` service helpers (deferred until chat-db integration)
- Auth/RLB policies beyond the existing open RLS policy
- Edit/update form (deferred to second iteration)
- Validation refinements beyond Pydantic type safety

## Capabilities

### New Capabilities
- `coffee-farms-crud`: Full CRUD lifecycle for coffee farm entities — backend API (schemas, service, router, tests) + frontend list/create pages + routing activation

### Modified Capabilities
- None

## Approach

Exact clone-adapt from the breweries pattern, split into two chained PRs:
- **PR #1 (backend)**: schemas + service + router + tests. Mirrors `breweries.py` / `brewery_service.py` / `breweries.py` schemas. Strict TDD.
- **PR #2 (frontend)**: `CoffeeFarmList` + `CoffeeFarmCreate` + router + DatabasesPage activation. Uses existing `apiClient`, `Input` atom, `useState` (React 19, no memoization).

Each PR targets the 400-line review budget. `stacked-to-main` strategy.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-backend/app/schemas/coffee_farms.py` | New | Pydantic Create/Response schemas mapped to `coffee_farms` columns |
| `cortex-backend/app/services/coffee_farm_service.py` | New | Supabase-backed CRUD service |
| `cortex-backend/app/routers/coffee_farms.py` | New | FastAPI router under `/coffee-farms` |
| `cortex-backend/app/main.py` | Modified | Include new router |
| `cortex-backend/tests/test_coffee_farm_service.py` | New | Service tests (mocked Supabase) |
| `cortex-backend/tests/test_coffee_farms_router.py` | New | Router tests (mocked Supabase + auth) |
| `cortex-frontend/src/features/coffee-farms/` | New | `CoffeeFarmList.tsx`, `CoffeeFarmCreate.tsx`, `index.ts` |
| `cortex-frontend/src/app/router.tsx` | Modified | Add `/coffee-farms` routes |
| `cortex-frontend/src/presentation/pages/DatabasesPage.tsx` | Modified | Flip `coffee-farms` to `active` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration `002` not applied to remote Supabase | Medium | Verify/apply before end-to-end tests |
| `NUMERIC` columns lose precision with `float` | Medium | Use Python `Decimal` in Pydantic schemas |
| CHECK constraint values mismatch (accents/spaces) | Low | Copy exact DB enum values into `Literal` types |
| Backend PR exceeds 400-line budget with tests | Medium | Split service tests and router tests if needed |

## Rollback Plan

1. Revert both PRs independently — backend revert removes the router inclusion and new files; frontend revert restores `coming-soon` status and removes routes/components.
2. No database rollback needed — the `coffee_farms` table is additive and harmless if unused.
3. If backend PR causes issues, frontend PR is blocked by dependency and never merges.

## Dependencies

- `002_create_coffee_farms.sql` must be applied to the Supabase instance before integration testing.
- Breweries pattern must remain stable as the reference (no concurrent changes to brewery files).

## Success Criteria

- [ ] `pytest cortex-backend/tests/test_coffee_farm_*.py` passes (100% of new tests green)
- [ ] `GET /coffee-farms` returns empty list on fresh DB; `POST /coffee-farms` creates a farm; `GET /coffee-farms/{id}` returns it
- [ ] Frontend `/coffee-farms` renders list; `/coffee-farms/new` creates a farm and redirects to list
- [ ] DatabasesPage shows "Fincas de café" as active (no "Próximamente" badge)
- [ ] Each chained PR stays under 400 lines of diff
