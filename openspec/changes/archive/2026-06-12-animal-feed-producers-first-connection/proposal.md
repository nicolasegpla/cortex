# Proposal: Animal Feed Producers First Connection

## Intent

Implement the first manual CRUD connection for `animal_feed_producers`, mirroring the successful `coffee-farms-first-connection` pattern. The DB table already exists in migrations; no backend schemas, service, router, tests, or frontend features exist yet. The frontend already has a stub card marked `coming-soon`.

## Scope

### In Scope
- Backend: Pydantic schemas, Supabase-backed CRUD service, FastAPI router, `main.py` wiring
- Backend: Service tests, router tests, wiring tests (strict TDD)
- Frontend: `AnimalFeedProducerList` component, `AnimalFeedProducerCreate` form, routing
- Frontend: Activate the `animal-feed` card in `DatabasesPage.tsx`

### Out of Scope
- `search`, `inspect`, `count` service methods (deferred until chat integration)
- Edit form / update UI (deferred)
- Role-based access beyond existing auth guard

## Capabilities

### New Capabilities
- `animal-feed-producers-crud`: Authenticated backend CRUD API and frontend list/create for `animal_feed_producers`, mirroring the coffee-farms first-connection scope.

### Modified Capabilities
- None

## Approach

**Clone-adapt from coffee farms with chained delivery:**
1. **PR #1 (backend):** Schemas + CRUD service + router + wiring + tests. Mirrors coffee-farms backend pattern, adapted to the simpler `animal_feed_producers` schema (no NUMERIC, no enum CHECKs, two TEXT[] arrays).
2. **PR #2 (frontend):** List component, create form, router entries, DatabasesPage activation. Mirrors coffee-farms frontend pattern.

Both PRs target ≤400 changed lines each. The `especies_manejadas` and `productos_fabricados` arrays reuse the comma-split input pattern from coffee farms.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-backend/app/schemas/animal_feed_producers.py` | New | Pydantic Create/Update/Response schemas |
| `cortex-backend/app/services/animal_feed_producer_service.py` | New | Supabase CRUD service |
| `cortex-backend/app/routers/animal_feed_producers.py` | New | FastAPI router at `/animal-feed-producers` |
| `cortex-backend/app/main.py` | Modified | Include new router |
| `cortex-backend/tests/test_animal_feed_producer_*.py` | New | Service, router, wiring tests |
| `cortex-frontend/src/features/animal-feed-producers/` | New | List, Create, index, styles |
| `cortex-frontend/src/app/router.tsx` | Modified | Add routes |
| `cortex-frontend/src/presentation/pages/DatabasesPage.tsx` | Modified | Flip card to `active` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration `003_create_animal_feed_producers.sql` not applied to remote Supabase | Medium | Verify/apply before end-to-end testing |
| `razon_social` NOT NULL not enforced in form | Low | Mark required in Pydantic schema + frontend validation |
| Comma-split arrays brittle for non-comma separators | Medium | Accept as known limitation; document for future improvement |
| Line budget exceeded (coffee-farms hit ~1,597 lines) | High | Enforce chained PRs; split backend/frontend strictly |

## Rollback Plan

- **Backend:** Remove router include from `main.py`, delete new schema/service/router/test files. No data migration needed — the table remains but is unused.
- **Frontend:** Revert router entries and DatabasesPage card to `coming-soon`. Delete feature directory.
- Both PRs are independently revertible with no cross-dependency data corruption.

## Dependencies

- `coffee-farms-first-connection` pattern as reference implementation (completed and archived)
- Supabase migration `003_create_animal_feed_producers.sql` applied to remote instance

## Success Criteria

- [ ] All backend CRUD endpoints return correct status codes and payloads under auth
- [ ] All backend tests pass (pytest) with no failures
- [ ] Frontend list loads records and shows empty/error states correctly
- [ ] Frontend create form submits valid data and redirects to list on success
- [ ] DatabasesPage card shows `active` status and navigates to `/animal-feed-producers`
- [ ] Each PR stays within 400 changed lines
