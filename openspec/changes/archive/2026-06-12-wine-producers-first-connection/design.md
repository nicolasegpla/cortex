# Design: Wine Producers First Connection

## Technical Approach

Exact clone-adapt from `animal_feed_producers` — the closest structural reference with TEXT[] arrays, no categorical enums, and CRUD-only service. Two chained PRs: **PR #1** (backend schemas + service + router + wiring + tests), **PR #2** (frontend list + create + routing + DatabasesPage card flip). `search`/`inspect`/`count` deferred to a future change.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|----------|---------|-----------|--------|
| Reference slice | animal-feed vs coffee-farms vs breweries | animal-feed: CRUD-only, TEXT[] arrays, no enums — perfect structural match. coffee-farms: Decimals/Literals. breweries: full search/inspect/count. | **animal-feed-producers** |
| Service shape | Full search/inspect/count vs CRUD-only | Full adds ~80 lines/method + tests. CRUD-only mirrors animal-feed and coffee-farms first-connections. | **CRUD-only** (defer search) |
| Chained boundaries | Single PR vs backend-then-frontend | Single PR exceeds 400-line budget. Backend PR is independently testable. Frontend PR needs backend merged first. | **Backend PR #1, Frontend PR #2** |
| Array toggles (8 TEXT[] fields) | Comma-split vs multi-select widget | Multi-select requires UI library or custom component. Comma-split is project convention (animal-feed, coffee-farms). | **Comma-split via parseArray** |
| Form field grouping | Flat 8 arrays vs sections | Flat: confusing wall of inputs. Grouped: Insumos (levaduras, nutrientes, conservantes, clarificantes) + Producción (marcas, tipo_uva, tipo_vino) + Envasado (botellas). | **3 fieldsets** |

## Data Flow

```
Browser ──→ React Router ──→ WineProducerList / WineProducerCreate
                                    │
                            apiClient.get / post / delete
                                    │
                            FastAPI /wine-producers
                                    │
                            WineProducerService
                                    │
                            Supabase public.wine_producers
```

Auth: `get_current_user` → Supabase JWT validation on every request. Delete: `require_role(["super_admin"])`.

## File Changes

### PR #1 — Backend (~350-380 lines)

| File | Action | Description |
|------|--------|-------------|
| `cortex-backend/app/schemas/wine_producers.py` | Create | `WineProducerCreate` (nombre_comercial required, 12 scalars nullable, 8 list[str]\|None), `WineProducerUpdate` (all optional), `WineProducerResponse` (+ id, created_at, updated_at, from_attributes=True) |
| `cortex-backend/app/services/wine_producer_service.py` | Create | `WineProducerService(supabase_client)` with create/list_all/get_by_id/update/delete. Mirrors `AnimalFeedProducerService`. |
| `cortex-backend/app/routers/wine_producers.py` | Create | `APIRouter(prefix='/wine-producers')`, 5 endpoints (POST/GET/GET{id}/PUT/DELETE), auth injected, delete role-guarded |
| `cortex-backend/app/main.py` | Modify | `import wine_producers`, `include_router(wine_producers.router)` after animal_feed_producers |
| `cortex-backend/tests/test_wine_producer_service.py` | Create | 7 tests: create, list, get_by_id (exists + not), update (exists + not), delete (exists + not) |
| `cortex-backend/tests/test_wine_producers_router.py` | Create | 7+ tests: 201, 422 (missing nombre_comercial), 200 list, 200 by id, 404, 200 put, 204/404 delete, 401 no-auth |
| `cortex-backend/tests/test_wine_producers_wiring.py` | Create | Route registration (5 routes), 403 for operativo delete |

### PR #2 — Frontend (~300-330 lines)

| File | Action | Description |
|------|--------|-------------|
| `cortex-frontend/src/features/wine-producers/index.ts` | Create | Barrel exports: `WineProducerList`, `WineProducerCreate` |
| `cortex-frontend/src/features/wine-producers/WineProducerList.tsx` | Create | Table with 18+ columns, loading/empty/error states, delete with confirmation |
| `cortex-frontend/src/features/wine-producers/WineProducerList.scss` | Create | BEM styles using `@use` and `card-base` mixin |
| `cortex-frontend/src/features/wine-producers/WineProducerList.test.tsx` | Create | Renders table, loading/empty states, delete confirmation |
| `cortex-frontend/src/features/wine-producers/WineProducerCreate.tsx` | Create | Form with 4 sections: Identificación, Ubicación+Contacto, Insumos (4 arrays), Producción (4 arrays + 2 scalars), Notas. Comma-split via `parseArray`. |
| `cortex-frontend/src/features/wine-producers/WineProducerCreate.test.tsx` | Create | Validates required field, submits form, handles API error |
| `cortex-frontend/src/app/router.tsx` | Modify | Add `/wine-producers` and `/wine-producers/new` routes with `ProtectedRoute` |
| `cortex-frontend/src/presentation/pages/DatabasesPage.tsx` | Modify | Change wine-producers `status` from `'coming-soon'` to `'active'` (1 line) |

## Interfaces / Contracts

```python
class WineProducerCreate(BaseModel):
    nombre_comercial: str = Field(...)      # NOT NULL
    razon_social: str | None = None
    # ... 9 more nullable scalars
    marcas: list[str] | None = None          # TEXT[]
    tipo_uva: list[str] | None = None
    tipo_vino: list[str] | None = None
    levaduras_utilizadas: list[str] | None = None
    botellas_utilizadas: list[str] | None = None
    nutrientes_utilizados: list[str] | None = None
    conservantes_utilizados: list[str] | None = None
    clarificantes_utilizados: list[str] | None = None
    # ... 4 more nullable scalars
```

API surface: `POST/GET/GET{id}/PUT/DELETE /wine-producers` — identical contract shape to `/animal-feed-producers`.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Service (unit) | Supabase call contracts | MagicMock Supabase, assert table name and call args |
| Router (integration) | HTTP codes, response bodies, auth | TestClient + monkeypatch service methods |
| Wiring (unit) | Route registration, role guard | `create_app()` route check + 403 for operativo |
| Frontend (unit) | Rendering, states, form submit | vitest + @testing-library/react, mock fetch |

## Migration / Rollout

No migration required — `004_create_wine_producers.sql` already exists in repo. Must verify applied to remote Supabase before end-to-end tests.

## Open Questions

- [ ] Is migration `004_create_wine_producers.sql` applied to the remote Supabase instance? Verify before PR #1 merge.
- [ ] Should DELETE button be hidden from non-super_admin in frontend, or shown with 403 error? Current pattern shows button; API returns 403.
