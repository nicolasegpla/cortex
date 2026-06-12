## Exploration: Animal Feed Producers First Connection

### Current State

Cortex has two complete vertical slices that serve as reference implementations:

- **Breweries**: full backend CRUD + `search`/`inspect`/`count` + frontend list/create, archived under SDD.
- **Coffee farms**: full backend CRUD + frontend list/create was just completed (`coffee-farms-first-connection`). The backend service is intentionally CRUD-only (no `search`/`inspect`/`count` yet); `coffee_farms` is already wired in `app/main.py` and active in the UI.

The `animal_feed_producers` table is already defined in `cortex-backend/sql/003_create_animal_feed_producers.sql`:

- UUID PK, `razon_social TEXT NOT NULL`, `marca TEXT`, `nit TEXT`, `direccion TEXT`, `departamento TEXT`, `ciudad TEXT`, `pais TEXT`, `nombre_contacto TEXT`, `celular TEXT`, `correo TEXT`.
- Two `TEXT[]` arrays: `especies_manejadas` and `productos_fabricados`.
- Text notes: `observaciones`, `oportunidades`.
- Trigger, RLS enabled, permissive "Allow all" policy.
- Indexes on `nit`, `ciudad`, and GIN on `especies_manejadas`.

No backend schemas, service, router, tests, or frontend feature exist yet for `animal_feed_producers`. The frontend `DatabasesPage.tsx` already exposes a stub card with `route: '/animal-feed-producers'` and `status: 'coming-soon'`.

### Affected Areas

- `cortex-backend/sql/003_create_animal_feed_producers.sql` — table already defined; must be applied/deployed to Supabase.
- `cortex-backend/app/schemas/animal_feed_producers.py` — new Pydantic `AnimalFeedProducerCreate`, `AnimalFeedProducerUpdate`, `AnimalFeedProducerResponse` schemas.
- `cortex-backend/app/services/animal_feed_producer_service.py` — new Supabase-backed service (CRUD; optionally `search`/`inspect`/`count`).
- `cortex-backend/app/routers/animal_feed_producers.py` — new FastAPI router under `/animal-feed-producers`.
- `cortex-backend/app/main.py` — include the new router.
- `cortex-backend/tests/test_animal_feed_producer_service.py` — service tests mirroring coffee farm tests.
- `cortex-backend/tests/test_animal_feed_producers_router.py` — router tests mirroring coffee farm tests.
- `cortex-backend/tests/test_animal_feed_producers_wiring.py` — minimal route registration + role-guard tests.
- `cortex-frontend/src/features/animal-feed-producers/` — new `AnimalFeedProducerList.tsx`, `AnimalFeedProducerCreate.tsx`, `index.ts`, `AnimalFeedProducerList.scss`.
- `cortex-frontend/src/app/router.tsx` — add `/animal-feed-producers` and `/animal-feed-producers/new` routes.
- `cortex-frontend/src/presentation/pages/DatabasesPage.tsx` — flip `animal-feed` status from `coming-soon` to `active`.

### Approaches

1. **Exact clone-adapt from coffee farms (single large slice)**
   Copy the coffee farms file set, rename identifiers, map fields to `animal_feed_producers`, and include `search`/`inspect`/`count` in the service exactly like breweries.
   - Pros: Perfect pattern parity, future chat integration ready, single mental model.
   - Cons: Likely 1000+ changed lines, far exceeds the 400-line review budget, hard to review safely.
   - Effort: High

2. **Chained PRs: backend first, then frontend (recommended)**
   PR #1: DB migration verification + backend schemas + service + router + wiring/tests. PR #2: frontend list/create components + routing + DatabasesPage activation. Optionally PR #3 adds `search`/`inspect`/`count` when chat needs it.
   - Pros: Respects 400-line budget, each PR is independently reviewable and testable, matches `force-chained` strategy.
   - Cons: Requires orchestrating two review cycles and keeping the frontend PR dependent on the backend PR.
   - Effort: Medium

3. **Minimal CRUD only, defer search/inspect**
   Implement only create/list/get/update/delete in service and router, plus frontend forms. Skip `search`/`inspect`/`count` for now.
   - Pros: Smallest first slice, focuses on the manual connection the user asked for.
   - Cons: Diverges from the breweries service shape; adding chat support later means a follow-up refactor/replication.
   - Effort: Low-Medium

### Recommendation

Use **Approach 2 (chained PRs)** with the first PR sized as Approach 3 (backend CRUD + tests), then a second PR for the frontend. This keeps the first connection under the review budget while still mirroring the coffee-farms/breweries pattern for the parts that are immediately needed. The `search`/`inspect`/`count` helpers can be added in a later, small PR once chat-db access is required for animal feed producers.

Because the `animal_feed_producers` schema is simpler than coffee farms (no `NUMERIC`, no `INTEGER`, no enum `CHECK` constraints), the backend/frontend implementation will be slightly smaller, but the same structural split should be preserved to protect the 400-line budget.

### Risks

- The `003_create_animal_feed_producers.sql` migration exists in repo but may not be applied to the remote Supabase instance yet; deploy/apply must be verified before end-to-end testing.
- `razon_social` is `NOT NULL` in the DB, so the Create schema must mark it required and the frontend form must validate it before submission.
- Text-array fields (`especies_manejadas`, `productos_fabricados`) will reuse the comma-split form pattern, which is brittle if users enter separators other than commas.
- Unlike breweries/coffee farms, `animal_feed_producers` has no categorical `CHECK` constraints, so Pydantic does not need `Literal` validation; however, this means any free-text value will be accepted.
- Strict TDD is mandatory; every backend module must have tests, which consumes a large share of the 400-line budget per PR.
- The prior `coffee-farms-first-connection` change realized ~1,597 lines against the same 400-line target, so line-count discipline during task planning is essential.

### Ready for Proposal

Yes. The orchestrator should tell the user that the coffee-farms pattern is the best reference slice, the `animal_feed_producers` table is already in migrations, and the work can proceed as two chained PRs (backend CRUD + tests, then frontend list/form + routing) while staying within the 400-line review budget.
