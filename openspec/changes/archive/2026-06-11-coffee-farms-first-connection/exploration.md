## Exploration: Coffee Farms First Connection

### Current State

Cortex already has a complete breweries vertical slice that serves as the reference implementation:

- **DB**: `cortex-backend/sql/001_create_breweries.sql` defines the `breweries` table; `002_create_coffee_farms.sql` already exists with the exact `coffee_farms` schema from the screenshot (UUID PK, text fields, numeric fields, integer, text arrays, enum CHECKs, indexes, trigger, RLS policy).
- **Backend**: `app/routers/breweries.py`, `app/services/brewery_service.py`, and `app/schemas/breweries.py` implement CRUD plus internal `search`/`inspect`/`count` helpers. `app/main.py` wires the router.
- **Frontend**: `src/features/breweries/BreweryList.tsx` and `BreweryCreate.tsx` use local `useState`, the shared `apiClient`, and the project `Input` atom. `src/app/router.tsx` registers `/breweries` and `/breweries/new`. `src/presentation/pages/DatabasesPage.tsx` lists databases and marks `coffee-farms` as `coming-soon`.
- **Tests**: Backend has `tests/test_brewery_service.py` and `tests/test_breweries_router.py` using mocked Supabase and mocked auth.

No `coffee_farms` backend code, frontend feature, or tests exist yet.

### Affected Areas

- `cortex-backend/sql/002_create_coffee_farms.sql` — table already defined; must be applied/deployed to Supabase.
- `cortex-backend/app/schemas/coffee_farms.py` — new Pydantic Create/Update/Response schemas.
- `cortex-backend/app/services/coffee_farm_service.py` — new Supabase-backed service (CRUD; optionally `search`/`inspect`/`count`).
- `cortex-backend/app/routers/coffee_farms.py` — new FastAPI router under `/coffee-farms`.
- `cortex-backend/app/main.py` — include the new router.
- `cortex-backend/tests/test_coffee_farm_service.py` — service tests mirroring brewery tests.
- `cortex-backend/tests/test_coffee_farms_router.py` — router tests mirroring brewery tests.
- `cortex-frontend/src/features/coffee-farms/` — new `CoffeeFarmList.tsx`, `CoffeeFarmCreate.tsx`, `index.ts`.
- `cortex-frontend/src/app/router.tsx` — add `/coffee-farms` and `/coffee-farms/new` routes.
- `cortex-frontend/src/presentation/pages/DatabasesPage.tsx` — flip `coffee-farms` status from `coming-soon` to `active`.

### Approaches

1. **Exact clone-adapt from breweries (single large slice)**  
   Copy the breweries file set, rename identifiers, map fields to `coffee_farms`, and include `search`/`inspect`/`count` in the service exactly like breweries.
   - Pros: Perfect pattern parity, future chat integration ready, single mental model.
   - Cons: Likely 1000+ changed lines, far exceeds the 400-line review budget, hard to review safely.
   - Effort: High

2. **Chained PRs: backend first, then frontend (recommended)**  
   PR #1: DB migration verification + backend schemas + service + router + tests. PR #2: frontend list/create components + routing + DatabasesPage activation. Optionally PR #3 adds `search`/`inspect`/`count` when chat needs it.
   - Pros: Respects 400-line budget, each PR is independently reviewable and testable, matches `stacked-to-main` chained strategy.
   - Cons: Requires orchestrating two review cycles and keeping the frontend PR dependent on the backend PR.
   - Effort: Medium

3. **Minimal CRUD only, defer search/inspect**  
   Implement only create/list/get/update/delete in service and router, plus frontend forms. Skip `search`/`inspect`/`count` for now.
   - Pros: Smallest first slice, focuses on the manual connection the user asked for.
   - Cons: Diverges from the breweries service shape; adding chat support later means a follow-up refactor/replication.
   - Effort: Low-Medium

### Recommendation

Use **Approach 2 (chained PRs)** with the first PR sized as Approach 3 (backend CRUD + tests), then a second PR for the frontend. This keeps the first connection under the review budget while still mirroring the breweries pattern for the parts that are immediately needed. The `search`/`inspect`/`count` helpers can be added in a later, small PR once chat-db access is required for coffee farms.

### Risks

- The `002_create_coffee_farms.sql` migration exists in repo but may not be applied to the remote Supabase instance yet; deploy/apply must be verified before end-to-end testing.
- `NUMERIC` fields (`hectareas_totales`, `hectareas_cafe`, `puntaje_cafe`) need careful typing. Using Python `float` in Pydantic can lose precision; `Decimal` is safer and maps cleanly to Supabase/Postgres `numeric`.
- Text-array fields (`variedades_sembradas`, `equipos`) will reuse the breweries comma-split form pattern, which is brittle if users enter separators other than commas.
- `tipo_actividad`, `tipo_proceso`, and `nivel_tecnificacion` have CHECK constraints; frontend selects and Pydantic `Literal` must match the exact DB values (including accents/spaces).
- The long field list will produce a tall form; mobile UX may need future sectioning, but breweries already uses fieldset sections so the same pattern applies.
- Strict TDD is mandatory; every backend module must have tests, which consumes a large share of the 400-line budget per PR.

### Ready for Proposal

Yes. The orchestrator should tell the user that the breweries pattern is clear, the `coffee_farms` table is already in migrations, and the work can proceed as two chained PRs (backend CRUD + tests, then frontend list/form + routing) while staying within the 400-line review budget.
