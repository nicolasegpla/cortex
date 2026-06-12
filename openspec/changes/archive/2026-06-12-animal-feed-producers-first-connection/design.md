# Design: Animal Feed Producers First Connection

## Technical Approach

Clone-adapt from `coffee-farms-first-connection` — identical layered architecture (Pydantic schemas → Supabase CRUD service → FastAPI router → React list/create). The `animal_feed_producers` schema is simpler: no `Decimal`, `int`, or enum `CHECK` constraints — only `razon_social` is `NOT NULL`. Chained delivery split: **PR #1** (backend: schemas + service + router + tests), **PR #2** (frontend: list + create + routing + card activation). Each PR targets ≤400 changed lines.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Service layer shape | CRUD-only (create, list_all, get_by_id, update, delete) — defer `search`/`inspect`/`count` | Matches proposal scope; avoids scope creep; those methods are added when chat needs them |
| `razon_social` as primary | Required in `AnimalFeedProducerCreate` (`Field(...)`), no separate `nombre` field | DB migration has only `razon_social NOT NULL`; unlike coffee farms which has both `nombre_finca` and nullable `razon_social` |
| Enum validation | No `Literal` constraints on free-text fields | DB migration has no `CHECK` constraints; enforcing artificial enums would reject valid data |
| Comma-split arrays | Reuse `parseArray()` from CoffeeFarmCreate for `especies_manejadas` and `productos_fabricados` | Proven pattern; known brittleness accepted per proposal risk register |
| File naming | `animal_feed_producers.py` (snake_case) for backend, `AnimalFeedProducerList.tsx` (PascalCase) for frontend | Matches existing conventions exactly (cf. `coffee_farms.py` / `CoffeeFarmList.tsx`) |
| Delete authorization | `require_role(["super_admin"])` — identical to coffee farms | Reuses existing role guard; no new auth plumbing needed |

## Data Flow

```
Browser                     FastAPI                      Supabase
  │                           │                            │
  │  GET /animal-feed-producers│                            │
  ├──────────────────────────►│                            │
  │                           │  table.select("*")         │
  │                           ├───────────────────────────►│
  │                           │◄───────────────────────────┤
  │◄──────────────────────────┤  JSON response             │
  │                           │                            │
  │  POST /animal-feed-producers                           │
  ├──────────────────────────►│                            │
  │                           │  jsonable_encoder(         │
  │                           │    model_dump(             │
  │                           │    exclude_unset=True))    │
  │                           │  table.insert(data)        │
  │                           ├───────────────────────────►│
  │                           │◄───────────────────────────┤
  │◄────── 201 + Response ────┤                            │
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `cortex-backend/app/schemas/animal_feed_producers.py` | Create | `AnimalFeedProducerCreate`, `AnimalFeedProducerUpdate`, `AnimalFeedProducerResponse` Pydantic models |
| `cortex-backend/app/services/animal_feed_producer_service.py` | Create | `AnimalFeedProducerService` class with CRUD methods |
| `cortex-backend/app/routers/animal_feed_producers.py` | Create | FastAPI router at `/animal-feed-producers` with auth guards |
| `cortex-backend/app/routers/__init__.py` | Modify | Add `animal_feed_producers` to `__all__` |
| `cortex-backend/app/main.py` | Modify | Import and `include_router` the new router |
| `cortex-backend/tests/test_animal_feed_producer_service.py` | Create | Service unit tests (mocked Supabase) |
| `cortex-backend/tests/test_animal_feed_producers_router.py` | Create | Router integration tests (TestClient + monkeypatch) |
| `cortex-backend/tests/test_animal_feed_producers_wiring.py` | Create | Route registration + role guard tests |
| `cortex-frontend/src/features/animal-feed-producers/index.ts` | Create | Barrel export for List and Create |
| `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.tsx` | Create | Table list with loading/empty/error states |
| `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerCreate.tsx` | Create | Form with comma-split array inputs |
| `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.scss` | Create | List styles (clone from CoffeeFarmList.scss) |
| `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.test.tsx` | Create | List component tests (vitest) |
| `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerCreate.test.tsx` | Create | Create form tests (vitest) |
| `cortex-frontend/src/app/router.tsx` | Modify | Add `/animal-feed-producers` and `/animal-feed-producers/new` routes |
| `cortex-frontend/src/presentation/pages/DatabasesPage.tsx` | Modify | Flip `animal-feed` card status: `coming-soon` → `active` |

## Interfaces / Contracts

```python
# Key: razon_social is required — rest are nullable TEXT
class AnimalFeedProducerCreate(BaseModel):
    razon_social: str = Field(...)  # only NOT NULL column
    marca: str | None = None
    nit: str | None = None
    direccion: str | None = None
    departamento: str | None = None
    ciudad: str | None = None
    pais: str | None = None
    nombre_contacto: str | None = None
    celular: str | None = None
    correo: str | None = None
    especies_manejadas: list[str] | None = None
    productos_fabricados: list[str] | None = None
    observaciones: str | None = None
    oportunidades: str | None = None
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Service (unit) | CRUD operations call correct Supabase methods | `MagicMock` supabase client; 7 test cases (create, list, get existing/missing, update existing/missing, delete existing/missing) |
| Router (integration) | Endpoints return correct status codes and payloads | `TestClient` + `monkeypatch` on service methods; auth guard (401 without token), CRUD ops (201/200/404/204) |
| Wiring | Routes registered, operative role gets 403 on DELETE | `create_app()` route inspection + role guard verification |
| Frontend List | Loading, empty, error, delete confirmation | `vitest` + `@testing-library/react`; mock `globalThis.fetch`, assert rendered content and state changes |
| Frontend Create | Form rendering, successful submit redirects, failure shows error | `vitest` + `userEvent`; mock `fetch` + `useNavigate`, verify payload normalization and navigation |

## Migration / Rollout

No data migration required — table exists via `003_create_animal_feed_producers.sql`. Verify migration is applied to remote Supabase before E2E testing. Rollback: remove router include + delete new files (backend) / revert router entries + flip card back to `coming-soon` (frontend).

## Open Questions

- [ ] Confirm `003_create_animal_feed_producers.sql` is applied to the remote Supabase instance (blocker for E2E, not for implementation)
- [ ] Accept comma-split array brittleness as known limitation? (proposal risk register says yes)
