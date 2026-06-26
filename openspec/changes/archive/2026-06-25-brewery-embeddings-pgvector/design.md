# Design: Brewery Embeddings via pgvector (Phase 1)

## Technical Approach

Introduce a new `EmbeddingService` that builds canonical text, computes SHA-256 hashes, and calls OpenAI `text-embedding-3-small`. `BreweryService` gains a `refresh_embedding()` coordinator. Routers schedule refresh via FastAPI `BackgroundTasks` after create/update, plus an admin-only `POST /breweries/{id}/reprocess-embedding` that forces regeneration. All embedding work is async, best-effort, and never blocks CRUD responses.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Embedding client | New `app/services/embedding_service.py` (not sunk into BreweryService) | Separates concerns: text builder, hash, OpenAI call are testable as a unit. Reusable for future entities. |
| OpenAI async client lifetime | Construct `AsyncOpenAI` per call with `api_key` from config | Simpler than adding a session-scoped dependency. Embedding is infrequent. |
| BackgroundTasks vs Celery | FastAPI `BackgroundTasks` | No new infra; accepted non-durability for phase 1; reprocess endpoint covers recovery. |
| Canonical text builder location | `EmbeddingService.build_canonical_text(brewery: dict) -> str` | Pure function, zero side effects, trivially unit-testable. |
| Hash force-regenerate flag | `refresh_embedding(brewery_id, force=False)` | Same method for background and reprocess — `force=True` skips dedup short-circuit. |

## Data Flow

```
POST/PUT /breweries
       │
       ├─→ BreweryService.create/update() → Supabase INSERT/UPDATE
       │
       └─→ BackgroundTasks.add_task(service.refresh_embedding, id)
                                                          │
                                POST /breweries/{id}/reprocess-embedding ──→ force=True
                                                          │
                          ┌───────────────────────────────┘
                          ▼
              refresh_embedding(brewery_id, force=False)
                          │
                          ├─ Supabase: SELECT current row
                          ├─ EmbeddingService.build_canonical_text(row)
                          ├─ EmbeddingService.compute_hash(text)
                          ├─ [force=False?] hash+model match → SKIP
                          ├─ EmbeddingService.generate_embedding(text)
                          │         │
                          │         ├─ success → Supabase UPDATE: embedding, status='ready', model, hash, now()
                          │         └─ failure → Supabase UPDATE: status='error' (log; preserve prior vector)
                          └─ return
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/services/embedding_service.py` | **Create** | Canonical text builder, SHA-256 hash, OpenAI embedding call |
| `app/services/brewery_service.py` | Modify | Add `refresh_embedding(brewery_id, force)` coordinator method |
| `app/routers/breweries.py` | Modify | Accept `BackgroundTasks`; schedule refresh after create/update; add `POST /{id}/reprocess-embedding` |
| `app/schemas/breweries.py` | Modify | Add `embedding_status`, `embedding_updated_at` to `BreweryResponse` |
| `app/core/config.py` | Modify | Add `OPENAI_API_KEY`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSION`, `EMBEDDINGS_ENABLED` |
| `.env.example` | Modify | Document new env vars |
| `sql/002_add_embeddings.sql` | **Create** | ALTER TABLE: add 5 pgvector columns + index on `embedding_source_hash` |
| `tests/test_embedding_service.py` | **Create** | Unit tests for canonical text builder, hash comparison, dedup logic |
| `tests/test_brewery_service.py` | Modify | Tests for `refresh_embedding` with mocked EmbeddingService |
| `tests/test_breweries_router.py` | Modify | Tests for `BackgroundTasks.add_task` scheduling, reprocess auth, 202/403/404 |

## Interfaces / Contracts

`EmbeddingService` constructor: `(settings: Settings)` — receives config for model, dimension, api key.

```python
class EmbeddingService:
    CANONICAL_FIELDS = [
        "nombre_cerveceria", "razon_social", "nombre_contacto", "nombre_cervecero",
        "direccion", "ciudad", "pais", "tipo_operacion",
        "estilos_cerveza", "maltas_utilizadas", "lupulos_utilizados",
        "levaduras_utilizadas", "utiliza_otros_productos", "marca_equipo",
        "capacidad_brewhouse", "capacidad_fermentacion", "litros_mes",
        "calidad_equipo", "formatos_venta", "donde_vende",
        "observaciones", "oportunidades",
    ]
    FIELD_LABELS = {"nombre_cerveceria": "Cervecería", ...}

    def build_canonical_text(self, brewery: dict) -> str: ...
    def compute_hash(self, text: str) -> str: ...
    async def generate_embedding(self, text: str) -> list[float]: ...
```

`BreweryService.refresh_embedding(self, brewery_id: UUID, force: bool = False) -> None` — no return, updates Supabase row directly.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Canonical text: field ordering, array sorting, label format, PII exclusion | Pure function, no mocks needed |
| Unit | Hash comparison: match skip, mismatch regenerate, model-change regenerate, error-status regenerate | Mock EmbeddingService.generate_embedding |
| Unit | Status state machine: pending→ready, pending→error, ready→error | Mock OpenAI call |
| Integration | Router creates/updates schedule BackgroundTasks.add_task | monkeypatch service methods, assert `add_task` called with correct args |
| Integration | Reprocess endpoint: 202 on success, 403 non-admin, 404 missing | TestClient with mocked auth |

## Migration / Rollout

- **New migration** `sql/002_add_embeddings.sql`: uses `ALTER TABLE ADD COLUMN IF NOT EXISTS` for each column (safe against manual drift). `embedding_status` defaults to `'pending'`. Create index on `embedding_source_hash`. Document as idempotent — rerunnable.
- **Feature flag**: `EMBEDDINGS_ENABLED` defaults to `True`. Set to `False` in `.env` for environments without OpenAI access.
- **No data backfill** in phase 1. Existing rows keep `embedding_status='pending'` until next manual update or reprocess.

## Deferred

- Vector similarity search (`<=>`), HNSW/IVFFlat indexing
- Bulk backfill endpoint
- Durable retry queue (Celery/RQ)
- Admin dashboard for embedding status
- Embeddings for coffee_farms, wine_producers, animal_feed_producers

## Open Questions

None. All decisions ratified by spec.
