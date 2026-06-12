## Exploration: Wine Producers First Connection

### Current State

Cortex has three complete vertical slices that serve as reference implementations:

- **Breweries**: full backend CRUD + `search`/`inspect`/`count` + frontend list/create, archived under SDD.
- **Coffee farms**: full backend CRUD + frontend list/create (`coffee-farms-first-connection`), CRUD-only service.
- **Animal feed producers**: full backend CRUD + frontend list/create (`animal-feed-producers-first-connection`), CRUD-only service.

The `wine_producers` table is already defined in `cortex-backend/sql/004_create_wine_producers.sql`:

- UUID PK, `nombre_comercial TEXT NOT NULL`, `razon_social TEXT`, `nit TEXT`, `direccion TEXT`, `ciudad TEXT`, `pais TEXT`, `nombre_contacto TEXT`, `celular TEXT`, `correo TEXT`.
- Eight `TEXT[]` arrays: `marcas`, `tipo_uva`, `tipo_vino`, `levaduras_utilizadas`, `botellas_utilizadas`, `nutrientes_utilizados`, `conservantes_utilizados`, `clarificantes_utilizados`.
- Plain text fields: `fuente_azucar`, `produccion_anual`.
- Text notes: `observaciones`, `oportunidades`.
- Trigger, RLS enabled, permissive "Allow all" policy.
- Indexes on `nit`, `ciudad`, and GIN on `marcas`/`tipo_uva`.

No backend schemas, service, router, tests, or frontend feature exist yet for `wine_producers`. The frontend `DatabasesPage.tsx` already exposes a stub card with `route: '/wine-producers'` and `status: 'coming-soon'`.

### Affected Areas

- `cortex-backend/sql/004_create_wine_producers.sql` — table already defined; must be applied/deployed to Supabase.
- `cortex-backend/app/schemas/wine_producers.py` — new Pydantic `WineProducerCreate`, `WineProducerUpdate`, `WineProducerResponse` schemas.
- `cortex-backend/app/services/wine_producer_service.py` — new Supabase-backed service (CRUD; optionally `search`/`inspect`/`count`).
- `cortex-backend/app/routers/wine_producers.py` — new FastAPI router under `/wine-producers`.
- `cortex-backend/app/main.py` — include the new router.
- `cortex-backend/tests/test_wine_producer_service.py` — service tests mirroring coffee farm tests.
- `cortex-backend/tests/test_wine_producers_router.py` — router tests mirroring coffee farm tests.
- `cortex-backend/tests/test_wine_producers_wiring.py` — minimal route registration + role-guard tests.
- `cortex-frontend/src/features/wine-producers/` — new `WineProducerList.tsx`, `WineProducerCreate.tsx`, `index.ts`, `WineProducerList.scss`.
- `cortex-frontend/src/app/router.tsx` — add `/wine-producers` and `/wine-producers/new` routes.
- `cortex-frontend/src/presentation/pages/DatabasesPage.tsx` — flip `wine-producers` status from `coming-soon` to `active`.

### Approaches

1. **Exact clone-adapt from animal feed producers (single large slice)**
   Copy the animal feed producers file set, rename identifiers, map fields to `wine_producers`, and include `search`/`inspect`/`count` in the service exactly like breweries.
   - Pros: Perfect pattern parity, future chat integration ready, single mental model.
   - Cons: Likely 1000+ changed lines, far exceeds the 400-line review budget, hard to review safely. The eight array fields make the schema and form especially large.
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

Use **Approach 2 (chained PRs)** with the first PR sized as Approach 3 (backend CRUD + tests), then a second PR for the frontend. This keeps the first connection under the review budget while still mirroring the animal-feed/coffee-farms pattern for the parts that are immediately needed. The `search`/`inspect`/`count` helpers can be added in a later, small PR once chat-db access is required for wine producers.

Because `wine_producers` has many more `TEXT[]` fields than prior verticals, the schema and frontend form will be the largest parts. Consider grouping array inputs visually in the form (insumos, producción, perfil) to keep the UI maintainable.

### Risks

- The `004_create_wine_producers.sql` migration exists in repo but may not be applied to the remote Supabase instance yet; deploy/apply must be verified before end-to-end testing.
- `nombre_comercial` is `NOT NULL` in the DB, so the Create schema must mark it required and the frontend form must validate it before submission.
- No user-provided target table shape was included in the request; the migration file is the only source of truth. If the user expected different columns, scope will change.
- The eight text-array fields will reuse the comma-split form pattern, which is brittle if users enter separators other than commas.
- Unlike breweries/coffee farms, `wine_producers` has no categorical `CHECK` constraints, so Pydantic does not need `Literal` validation; however, this means any free-text value will be accepted.
- Strict TDD is mandatory; every backend module must have tests, which consumes a large share of the 400-line budget per PR.
- Prior first-connection changes exceeded the 400-line target, so line-count discipline during task planning is essential.

### Ready for Proposal

Yes. The orchestrator should tell the user that the animal-feed-producers pattern is the best reference slice, the `wine_producers` table is already in migrations, and the work can proceed as two chained PRs (backend CRUD + tests, then frontend list/form + routing) while staying within the 400-line review budget.
