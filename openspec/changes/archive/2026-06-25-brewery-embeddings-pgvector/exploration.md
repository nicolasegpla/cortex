# Exploration: pgvector-backed embeddings for `public.breweries` (phase 1)

## Current state

The Cortex backend is a FastAPI modular monolith in `cortex-backend/`. Brewery CRUD lives in three thin layers:

- `app/routers/breweries.py` — HTTP routing and auth (roles `super_admin` / `operativo`).
- `app/services/brewery_service.py` — `BreweryService` with `create`, `update`, `delete`, `get_by_id`, `list_all`, plus `search`/`inspect` for the chat path.
- `app/schemas/breweries.py` — `BreweryCreate`, `BreweryUpdate`, `BreweryResponse`.

Data access goes through `SupabaseService` (`app/services/supabase_service.py`), which wraps the Supabase Python client with the service role key. The `breweries` table DDL is in `sql/001_create_breweries.sql`; it currently has no embedding columns in version control, although the prompt states pgvector columns were added manually in Supabase.

`openai>=1.35.0` is already a dependency, used by the chat adapters (`app/adapters/openai.py`). There is no existing embedding, hashing, status, or background-task infrastructure.

## Affected areas

| Path | Why it is affected |
|------|--------------------|
| `cortex-backend/app/services/brewery_service.py` | Best place to compute canonical text, compare hashes, and call the embedding generator. |
| `cortex-backend/app/routers/breweries.py` | Must accept `BackgroundTasks` and schedule refresh after `create`/`update` return. |
| `cortex-backend/app/schemas/breweries.py` | Needs embedding metadata fields on response (and possibly update) models. |
| `cortex-backend/app/core/config.py` | Needs `OPENAI_API_KEY`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSION`, and an enable flag. |
| `cortex-backend/.env.example` | Document new environment variables. |
| `cortex-backend/sql/001_create_breweries.sql` (or a new migration) | Must version-control the pgvector columns and indexes that were added manually. |
| `cortex-backend/tests/test_brewery_service.py` | Needs tests for hash comparison, status transitions, and background scheduling. |
| `cortex-backend/tests/test_breweries_router.py` | Needs tests that `BackgroundTasks.add_task` is invoked on create/update. |

## Key questions and analysis

### 1. Best integration point for embedding refresh

Hook refresh **inside `BreweryService`** and trigger it from the router after the primary write succeeds.

- `create()` inserts the row, returns the record, then the router schedules `refresh_embedding(brewery_id)`.
- `update()` writes the user fields, then the router schedules `refresh_embedding(brewery_id)`.
- The actual OpenAI call and vector write should be a separate async method on the service so it can be invoked both from `BackgroundTasks` and from a future backfill endpoint without duplicating logic.

Keeping the hook in the service keeps the router thin and makes unit testing straightforward.

### 2. Synchronous-in-request vs. best-effort asynchronous

| Approach | Pros | Cons | Effort |
|----------|------|------|--------|
| **Synchronous in request** | Simple; response always reflects latest embedding; no stale reads. | Blocks HTTP response ~100–800 ms per call; couples CRUD latency to OpenAI; risk of timeout/500 on API hiccup. | Low |
| **FastAPI `BackgroundTasks`** (recommended) | Returns CRUD response immediately; uses built-in FastAPI primitive; no new infra; failure does not fail the user request. | No persistence/retry if process restarts; tasks run sequentially; harder to observe. | Low |
| **Celery / RQ / Supabase Edge Function queue** | Durable retries; observability; scales to bulk backfill. | New infrastructure, dependencies, and operational surface; exceeds phase-1 scope. | High |

**Recommendation**: Use `BackgroundTasks` for phase 1. It matches the existing monolith, requires no new services, and satisfies the "best-effort" requirement. Embed failure should be captured in `embedding_status = 'error'` and surfaced via a future status endpoint or admin panel, not fail the write.

### 3. Canonical text source boundaries

Build a deterministic, ordered text blob from business fields only. Recommended inclusion/exclusion:

**Include** (semantic value):

- `nombre_cerveceria`
- `razon_social`
- `nombre_cervecero`
- `direccion`
- `ciudad`
- `pais`
- `tipo_operacion`
- `estilos_cerveza` (array)
- `maltas_utilizadas` (array)
- `lupulos_utilizados` (array)
- `levaduras_utilizadas` (array)
- `utiliza_otros_productos`
- `marca_equipo`
- `capacidad_brewhouse`
- `capacidad_fermentacion`
- `litros_mes`
- `calidad_equipo`
- `formatos_venta` (array)
- `donde_vende`
- `observaciones`
- `oportunidades`

**Exclude**:

- `id`, `created_at`, `updated_at` — non-semantic metadata.
- `nit` — business identifier; better matched exactly, and may be sensitive in some contexts.
- `celular_1`, `celular_2`, `correo` — direct contact PII; should not be encoded into a searchable vector space.
- `embedding` columns themselves and status fields.

Format each field with a human-readable label so the model sees structure (e.g. `Ciudad: Bogotá`). Sort fields and array items deterministically so identical data always produces identical text and therefore identical hashes.

### 4. Data consistency strategy

Add the following columns to `public.breweries`:

- `embedding vector(1536)` — the pgvector embedding.
- `embedding_status text not null default 'pending'` — `pending`, `ready`, `error`.
- `embedding_text_hash text` — SHA-256 of the canonical text that produced the current embedding.
- `embedding_error text` — last error message when status is `error`.
- `embedded_at timestamptz` — timestamp of the last successful embedding write.

**State machine**:

1. On `create` or `update`, after the row is written, compute the new canonical text and its hash.
2. Fetch the existing `embedding_text_hash` for the row.
3. If the hash is unchanged and status is `ready`, do nothing.
4. Otherwise, set `embedding_status = 'pending'` and schedule the OpenAI call.
5. On success: write `embedding`, `embedding_status = 'ready'`, `embedding_text_hash = <new_hash>`, `embedded_at = now()`.
6. On failure: write `embedding_status = 'error'`, `embedding_error = <message>`, leave previous `embedding` and `embedding_text_hash` untouched so the old vector remains usable.

This gives idempotency, cheap short-circuiting on no-op updates, and graceful degradation on OpenAI failures.

### 5. Dependencies and config for OpenAI

- `openai` is already installed.
- Add to `app/core/config.py`:
  - `openai_api_key: str | None` (`OPENAI_API_KEY`)
  - `embedding_model: str = 'text-embedding-3-small'` (`EMBEDDING_MODEL`)
  - `embedding_dimension: int = 1536` (`EMBEDDING_DIMENSION`)
  - `embeddings_enabled: bool = True` (`EMBEDDINGS_ENABLED`) — allows disabling in tests or local dev.
- Add matching keys to `.env.example`.
- Use a dedicated service key rather than per-user chat credentials; embeddings are a backend capability, not a user-level provider choice.
- Consider encapsulating the OpenAI call in a small `EmbeddingService` or `EmbeddingClient` so it can be mocked in tests and reused for future tables.

## Risks and tradeoffs

- **BackgroundTasks is not durable**: A server restart kills pending tasks. Phase 1 accepts this; backfill and retries will need a real queue later.
- **Manual schema drift**: The pgvector columns exist only in Supabase, not in `sql/`. A migration script must be added and run to keep environments reproducible.
- **Embedding cost and latency**: Every create/update costs one OpenAI embedding call. Bulk imports would be expensive and slow without batching.
- **PII boundary**: Excluding phones/email/NIT from the canonical text reduces leakage risk but also means vector search cannot match by those fields. Keep keyword/ilike search for those fields.
- **Test complexity**: Tests must mock `BackgroundTasks` and the OpenAI async client; `pytest-asyncio` is already configured.
- **Status observability**: There is no admin UI or endpoint to list breweries with `error` status in phase 1. That should be added in the next phase or as a small admin tool.

## What to defer to later phases

- Vector similarity search RPC (`<=>` operator) and HNSW/IVFFlat index tuning.
- Bulk backfill strategy and a dedicated `POST /breweries/backfill-embeddings` endpoint.
- Retry queue with exponential backoff (Celery/RQ/Edge Function).
- Embeddings for coffee farms, wine producers, and animal feed producers.
- Unified cross-table semantic search.
- Admin dashboard showing `pending`/`error` embedding statuses.
- Migration from `BackgroundTasks` to a durable work queue.

## Recommendation

Proceed with phase 1 using **FastAPI `BackgroundTasks`**, a **single `vector(1536)` column on `public.breweries`**, **`text-embedding-3-small`**, and a **SHA-256 content hash** to avoid redundant OpenAI calls. Keep the integration inside `BreweryService` triggered from the router after write. Add the schema columns to version control, add the three config keys, and write unit tests for hash comparison and status transitions before implementation.

## Ready for proposal

Yes. The scope is well bounded, the integration point is clear, and the tradeoffs are understood. The next phase (`sdd-propose`) should ratify the synchronous/best-effort decision, the exact canonical text field list, the column names, and the deferred items.
