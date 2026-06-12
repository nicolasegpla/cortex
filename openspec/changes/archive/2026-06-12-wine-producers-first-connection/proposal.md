# Proposal: Wine Producers First Connection

## Intent

Connect the existing `wine_producers` table (migration `004_create_wine_producers.sql`) to the Cortex app with authenticated backend CRUD and a frontend list/create page, flipping the stub card from `coming-soon` to `active`. This mirrors the proven animal-feed and coffee-farms first-connection pattern.

## Scope

### In Scope
- Backend: Pydantic schemas, Supabase-backed CRUD service, FastAPI router under `/wine-producers`, wiring in `main.py`
- Backend: Service tests + router tests + wiring tests (strict TDD)
- Frontend: `WineProducerList.tsx`, `WineProducerCreate.tsx`, routing, `DatabasesPage.tsx` card activation
- Eight `TEXT[]` array fields normalized via comma-split form pattern

### Out of Scope
- `search`, `inspect`, `count` service methods — deferred until chat-DB access is needed
- Dedicated edit form — deferred
- Enum validation on free-text columns — no DB `CHECK` constraints exist

## Capabilities

### New Capabilities
- `wine-producers-crud`: Authenticated backend CRUD API + frontend list/create for `wine_producers`, matching the animal-feed/coffee-farms first-connection shape.

### Modified Capabilities
None.

## Approach

Two chained PRs under the 400-line budget (`force-chained`, `stacked-to-main`):

| PR | Scope | Est. Lines |
|----|-------|------------|
| #1 | Backend schemas + service + router + wiring + tests | ~350-400 |
| #2 | Frontend list + create + routing + DatabasesPage activation | ~300-350 |

PR #1 targets `main` first. PR #2 depends on #1 and targets `main` as a stacked child. `search`/`inspect`/`count` deferred to a future small PR when chat integration requires them.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-backend/app/schemas/wine_producers.py` | New | Pydantic Create/Update/Response schemas |
| `cortex-backend/app/services/wine_producer_service.py` | New | Supabase-backed CRUD service |
| `cortex-backend/app/routers/wine_producers.py` | New | FastAPI router `/wine-producers` |
| `cortex-backend/app/main.py` | Modified | Include new router |
| `cortex-backend/tests/test_wine_producer_service.py` | New | Service unit tests |
| `cortex-backend/tests/test_wine_producers_router.py` | New | Router integration tests |
| `cortex-backend/tests/test_wine_producers_wiring.py` | New | Route registration + role-guard tests |
| `cortex-frontend/src/features/wine-producers/` | New | List, Create, index, styles |
| `cortex-frontend/src/app/router.tsx` | Modified | Add `/wine-producers` routes |
| `cortex-frontend/src/presentation/pages/DatabasesPage.tsx` | Modified | Flip wine-producers card to `active` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration `004` not applied to remote Supabase | Medium | Verify/apply before end-to-end tests |
| Eight array fields bloat schema/form beyond budget | Medium | Group arrays visually (insumos, producción, perfil); keep comma-split pattern |
| `nombre_comercial` NOT NULL not enforced in schema | Low | Mirror DB constraint in Pydantic `Create` schema |
| Prior first-connections exceeded 400-line target | High | Strict task-level line budgets during sdd-tasks phase |

## Rollback Plan

1. Revert PR #2 (frontend) — no data impact, card reverts to `coming-soon`
2. Revert PR #1 (backend) — router removed, service unreachable; no data loss (RLS permissive policy remains)
3. If migration was newly applied, run a down-migration to drop `wine_producers` table (only if no production data exists)

## Dependencies

- `004_create_wine_producers.sql` migration must be applied to the target Supabase instance
- Reference implementations: `animal-feed-producers-first-connection`, `coffee-farms-first-connection`

## Success Criteria

- [ ] `POST/GET/PUT/DELETE /wine-producers` return correct status codes with auth
- [ ] Service tests pass with strict TDD (no implementation without failing test first)
- [ ] Frontend list loads records, shows empty/error states
- [ ] Create form validates `nombre_comercial`, normalizes arrays, redirects on success
- [ ] DatabasesPage wine-producers card links to `/wine-producers` as `active`
- [ ] Each PR stays within 400-line review budget
