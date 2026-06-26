# Brewery Embeddings

## What they are

Brewery embeddings are vector representations of brewery records stored in the `public.breweries` table using Supabase `pgvector`. They are generated with OpenAI `text-embedding-3-small` (1536 dimensions) and are intended for **internal retrieval and ranking only** — there is no user-facing semantic search UI in the current phase.

The backend maintains one embedding per brewery row, plus a small state machine that tracks whether the embedding is fresh, stale, or failed.

## Why they exist

Embeddings let Cortex compare breweries semantically (e.g. "find breweries similar to this one" or rank results by meaning) without relying only on exact text matches. The current phase focuses on keeping the vectors correct and up to date; similarity endpoints may come later.

## What fields are included in the embedding

The embedding is computed from a deterministic, labeled text blob built only from business/craft fields. Fields are sorted and arrays are ordered so identical data always produces identical text and the same SHA-256 hash.

### Included fields

These values are sent to OpenAI as part of the canonical text:

- `nombre_cerveceria`
- `razon_social`
- `nombre_contacto` (the only person-name field intentionally included)
- `nombre_cervecero`
- `ciudad`
- `pais`
- `tipo_operacion`
- `estilos_cerveza`
- `maltas_utilizadas`
- `lupulos_utilizados`
- `levaduras_utilizadas`
- `utiliza_otros_productos`
- `marca_equipo`
- `capacidad_brewhouse`
- `capacidad_fermentacion`
- `litros_mes`
- `calidad_equipo`
- `formatos_venta`
- `donde_vende`
- `observaciones`
- `oportunidades`

### Excluded fields

These values are **never** included in the text sent to OpenAI:

- `id`
- `created_at`, `updated_at`
- `nit`
- `celular_1`, `celular_2`
- `correo`
- `direccion`
- `embedding`, `embedding_status`, `embedding_model`, `embedding_source_hash`, `embedding_updated_at`

## Data-sharing boundary with OpenAI

OpenAI receives **only** the canonical text described above. Phone numbers, email, tax ID, street address, primary keys, timestamps, and embedding metadata are never exported. `nombre_contacto` is the only individual-identifying field that is intentionally shared because it is treated as business context for this phase.

## State machine

`embedding_status` can be `pending`, `ready`, or `error`.

| Event | Trigger | Result |
|---|---|---|
| Create | A brewery is inserted | `pending` (set by the column default) |
| Update | A brewery is updated with a semantic field change while `EMBEDDINGS_ENABLED=true` | `pending` is written in the same update so the row cannot stay misleadingly `ready` if the background task is dropped |
| Excluded-field update | A brewery is updated with only excluded/non-semantic fields | `embedding_status` is left unchanged and no background refresh is scheduled |
| Success | Background refresh calls OpenAI and succeeds | `ready`; `embedding`, `embedding_model`, `embedding_source_hash`, and `embedding_updated_at` are written |
| Failure | Background refresh fails | `error`; the previous `embedding` and `embedding_source_hash` are preserved so a retry does not lose data |
| Force | Admin calls `POST /breweries/{id}/reprocess-embedding` | Bypasses hash/model dedup and schedules a fresh generation |

## How create/update/reprocess behave

### Create (`POST /breweries`)

1. The brewery row is inserted.
2. The database sets `embedding_status` to `pending` by default.
3. If `EMBEDDINGS_ENABLED=true`, a background task is scheduled to call `refresh_embedding(id)`.
4. The API returns `201 Created` immediately; the embedding is not generated synchronously.

### Update (`PUT /breweries/{id}`)

1. The brewery row is updated.
2. If `EMBEDDINGS_ENABLED=true` AND the payload changes at least one canonical semantic field, the same update sets `embedding_status='pending'`.
3. A background task is scheduled to call `refresh_embedding(id)` only when a semantic field changed.
4. The API returns `200 OK` immediately.

Setting `pending` in the primary write protects against dropped background tasks: if the server restarts or the task is lost, the row is at worst `pending` (needs refresh), not `ready` with stale data. Updates that only touch excluded fields (for example `nit`, `correo`, phones, or `direccion`) do not mark the embedding stale, preserving the hash-dedup contract.

### Reprocess (`POST /breweries/{id}/reprocess-embedding`)

1. Only `super_admin` can call this endpoint.
2. The endpoint bypasses hash/model dedup and schedules `refresh_embedding(id, force=True)`.
3. Returns `202 Accepted` immediately.
4. Useful when an operator wants to force regeneration after a config change or to recover from an error state.

## Hash-based deduplication

`refresh_embedding` skips the OpenAI call when all of the following are true:

- `embedding_status == 'ready'`
- `embedding_source_hash` matches the hash of the current canonical text
- `embedding_model` matches the configured `EMBEDDING_MODEL`

If the configured model changes, the hash changes, or the status is `error`/`pending`, the OpenAI call is made.

## Graceful degradation

- If `EMBEDDINGS_ENABLED=false`, no background refresh is scheduled and `embedding_status` is not modified.
- If `EMBEDDINGS_ENABLED=true` but `OPENAI_API_KEY` is missing or the OpenAI call fails, the CRUD operation still succeeds and `embedding_status` becomes `error`.
- Error details are logged; they are not stored in any brewery column.

## Extending the pattern to other tables

To add embeddings to another entity (for example `coffee_farms` or `wine_producers`):

1. Add the same five columns to the target table using a versioned SQL migration:
   - `embedding vector(1536)`
   - `embedding_status text DEFAULT 'pending'`
   - `embedding_model text`
   - `embedding_source_hash text`
   - `embedding_updated_at timestamptz`
2. Add an index on `embedding_source_hash`.
3. Create a service similar to `EmbeddingService` that knows the include/exclude field boundary for that entity, or extend `EmbeddingService` with a new canonical-text builder.
4. Add a `refresh_embedding` method to the entity's service, following the same hash/model dedup and failure-preservation rules.
5. In the create/update routers, when embeddings are enabled, mark `embedding_status='pending'` on update only when a canonical semantic field changes, and schedule `refresh_embedding` as a background task for creates and semantic updates.
6. Add an admin-only `POST /{entity}/{id}/reprocess-embedding` endpoint that calls `refresh_embedding(id, force=True)`.
7. Keep the entity's include/exclude boundary explicit in specs and docs; err on the side of excluding PII from the canonical text sent to OpenAI.

## Configuration

Environment variables used:

- `OPENAI_API_KEY` — required when embeddings are enabled.
- `EMBEDDING_MODEL` — defaults to `text-embedding-3-small`.
- `EMBEDDING_DIMENSION` — must be `1536` to match the database schema.
- `EMBEDDINGS_ENABLED` — defaults to `true`; set to `false` to disable background generation.

## Files involved

- `app/services/embedding_service.py` — canonical text, hashing, OpenAI call.
- `app/services/brewery_service.py` — `refresh_embedding` and CRUD helpers.
- `app/routers/breweries.py` — background-task scheduling and reprocess endpoint.
- `sql/006_add_embeddings.sql` — database migration for the embedding columns.
- `openspec/specs/brewery-embeddings/spec.md` — authoritative spec for the embedding boundary and behavior.
