# brewery-embeddings Specification

## Purpose

Generate, store, and maintain OpenAI `text-embedding-3-small` vectors for brewery records in Supabase pgvector as internal retrieval/ranking infrastructure. Phase 1 covers generation, storage, status tracking, hash-based dedup, and an admin reprocess endpoint. No user-facing search in phase 1.

## Non-Goals (Phase 1)

- Vector similarity search endpoints (`<=>` operator), HNSW/IVFFlat index tuning.
- Bulk backfill endpoint or durable retry queue (Celery/RQ/Edge Functions).
- Embeddings for other entity types (coffee farms, wine producers, animal feed).
- Admin dashboard listing `pending`/`error` statuses.
- User-facing semantic search UI.
- Persisting embedding error text in a brewery column (logged only — see graceful degradation).

## Requirements

### Requirement: Canonical embedding text construction

The system MUST build a deterministic, ordered canonical text blob from brewery profile business fields. Each field MUST be labeled human-readably (e.g. `Ciudad: Bogotá`). Fields and array items MUST be sorted deterministically so identical data yields byte-identical text and therefore identical hashes.

The canonical text is the only data sent to OpenAI for embedding generation. The following boundaries are enforced in code and MUST be documented for operators:

| Include (semantic business/craft fields) | Exclude (PII / non-semantic / metadata) |
|---|---|
| `nombre_cerveceria`, `razon_social`, `nombre_contacto`, `nombre_cervecero`, `ciudad`, `pais`, `tipo_operacion`, `estilos_cerveza`, `maltas_utilizadas`, `lupulos_utilizados`, `levaduras_utilizadas`, `utiliza_otros_productos`, `marca_equipo`, `capacidad_brewhouse`, `capacidad_fermentacion`, `litros_mes`, `calidad_equipo`, `formatos_venta`, `donde_vende`, `observaciones`, `oportunidades` | `id`, `created_at`, `updated_at`, `nit`, `celular_1`, `celular_2`, `correo`, `direccion`, `embedding`, `embedding_status`, `embedding_model`, `embedding_source_hash`, `embedding_updated_at` |

**Third-party data boundary**: OpenAI receives only the canonical text constructed from the Include list above. Phone numbers (`celular_1`, `celular_2`), email (`correo`), tax ID (`nit`), street address (`direccion`), primary keys, timestamps, and all embedding metadata columns are never included in the text sent to OpenAI. `nombre_contacto` is intentionally included as business context; it is the only person-name field exported to the embedding provider.

#### Scenario: Identical data yields identical text
- GIVEN two brewery records with identical included fields
- WHEN canonical text is computed for each
- THEN both produce byte-identical text and identical SHA-256 hashes

#### Scenario: PII and metadata excluded
- GIVEN a brewery populated with phone, email, NIT, contact name, street address, and timestamps
- WHEN canonical text is computed
- THEN `nombre_contacto` appears in the text, and none of `nit`, `celular_1`, `celular_2`, `correo`, `direccion`, `id`, `created_at`, `updated_at`, or embedding columns appear in the text

#### Scenario: Array fields sorted deterministically
- GIVEN a brewery whose `estilos_cerveza` array is stored in arbitrary order
- WHEN canonical text is computed
- THEN array items are sorted before concatenation so storage order does not affect the hash

### Requirement: Embedding storage columns

The system MUST store embeddings in `public.breweries` using the existing Supabase columns: `embedding` (`vector(1536)`), `embedding_status` (`text`, default `'pending'`), `embedding_model` (`text`), `embedding_source_hash` (`text`), and `embedding_updated_at` (`timestamptz`). The system MUST NOT use `embedding_text_hash` or `embedded_at`. The schema MUST be version-controlled in `sql/`.

#### Scenario: Migration version-controlled with existing names
- GIVEN the codebase repository
- WHEN the embedding schema is inspected
- THEN a SQL migration adds the five columns and an index on `embedding_source_hash`, and every column name matches the existing Supabase names exactly

### Requirement: Embedding generation and refresh routine

The system MUST generate embeddings using OpenAI `text-embedding-3-small` and MUST expose a single refresh routine invoked both from FastAPI `BackgroundTasks` and the admin reprocess endpoint. On success it MUST write `embedding`, set `embedding_status='ready'`, set `embedding_model` to the configured model, set `embedding_source_hash` to the new hash, and set `embedding_updated_at` to now.

#### Scenario: Successful refresh writes ready status
- GIVEN a brewery with `embedding_status='pending'` and a valid OpenAI key
- WHEN the refresh routine runs successfully
- THEN `embedding`, `embedding_status='ready'`, `embedding_model`, `embedding_source_hash`, and `embedding_updated_at` are all written

#### Scenario: Same routine reused by background and reprocess
- GIVEN the refresh routine is defined once
- WHEN it is invoked from a BackgroundTask or the reprocess endpoint
- THEN both paths execute the same logic without duplication

### Requirement: Hash-based dedup with model awareness

The system MUST compute a SHA-256 hash of the canonical text. It MUST skip the OpenAI call when `embedding_status='ready'` AND `embedding_source_hash` equals the new hash AND `embedding_model` equals the configured model. Otherwise it MUST regenerate.

#### Scenario: No-op update skips embedding call
- GIVEN a brewery with `embedding_status='ready'`, matching hash and model
- WHEN an update changes only excluded fields or nothing semantic
- THEN no OpenAI call is made and the existing vector is preserved

#### Scenario: Model change forces regeneration
- GIVEN a brewery embedded with a previous model and `EMBEDDING_MODEL` is changed
- WHEN refresh runs
- THEN the OpenAI call is made because `embedding_model` no longer matches

#### Scenario: Error status forces regeneration
- GIVEN a brewery with `embedding_status='error'`
- WHEN refresh runs
- THEN the OpenAI call is made regardless of hash match

### Requirement: Embedding status state machine

The system MUST track embedding state in `embedding_status` with values `pending`, `ready`, and `error`.

| Transition | Trigger | Resulting `embedding_status` | Other columns |
|---|---|---|---|
| create | new brewery inserted | `pending` (column default) | none written |
| update | brewery updated with a semantic field change while `EMBEDDINGS_ENABLED=true` | `pending` | no embedding columns written; the row is explicitly marked stale so it cannot stay misleadingly `ready` if the background refresh is dropped |
| excluded-field update | brewery updated with only excluded/non-semantic fields | unchanged | no embedding columns written and no background refresh is scheduled |
| success | OpenAI call succeeds | `ready` | write `embedding`, `embedding_model`, `embedding_source_hash`, `embedding_updated_at` |
| failure | OpenAI call fails | `error` | previous `embedding` and `embedding_source_hash` preserved; `embedding_updated_at` not advanced |

#### Scenario: New record starts pending
- GIVEN a brewery is created
- WHEN the row is inserted
- THEN `embedding_status='pending'` and no embedding vector is written yet

#### Scenario: Semantic update marks embedding status pending
- GIVEN an existing brewery with `embedding_status='ready'` and `EMBEDDINGS_ENABLED=true`
- WHEN the brewery is updated through the API with a change to a canonical semantic field (for example `nombre_cerveceria`)
- THEN the HTTP response returns immediately with `embedding_status='pending'` and a background refresh is scheduled

#### Scenario: Excluded-field-only update does not mark embedding pending
- GIVEN an existing brewery with `embedding_status='ready'` and `EMBEDDINGS_ENABLED=true`
- WHEN the brewery is updated through the API with only excluded/non-semantic fields (for example `nit`, `correo`, `celular_1`, `celular_2`, or `direccion`)
- THEN the HTTP response returns immediately with `embedding_status` unchanged and no background refresh is scheduled

#### Scenario: Failure sets error without losing prior vector
- GIVEN a brewery with a prior successful embedding
- WHEN a refresh fails after a semantic update
- THEN `embedding_status='error'` but the previous `embedding` and `embedding_source_hash` remain usable

### Requirement: Graceful degradation on embedding failure

The system MUST NOT fail a brewery create or update when embedding generation fails. It MUST set `embedding_status='error'`. Phase 1 has no dedicated error-text column, so error detail MUST be logged to server logs and MUST NOT be persisted in a brewery column.

#### Scenario: CRUD succeeds despite embedding failure
- GIVEN embeddings enabled and the OpenAI call fails
- WHEN a brewery is created or updated
- THEN the HTTP write succeeds and `embedding_status='error'` is recorded

#### Scenario: Error detail logged not stored
- GIVEN a refresh fails
- WHEN the failure is handled
- THEN the error message appears in server logs and no brewery column stores the error text

### Requirement: Embedding configuration and feature flag

The system MUST read `OPENAI_API_KEY`, `EMBEDDING_MODEL` (default `text-embedding-3-small`), `EMBEDDING_DIMENSION` (default `1536`), and `EMBEDDINGS_ENABLED` (default `true`) from configuration. When `EMBEDDINGS_ENABLED=false` it MUST NOT schedule embedding generation and MUST leave `embedding_status` unchanged.

#### Scenario: Disabled flag skips scheduling
- GIVEN `EMBEDDINGS_ENABLED=false`
- WHEN a brewery is created or updated
- THEN no background embedding refresh is scheduled and `embedding_status` is not modified

#### Scenario: Enabled with missing key degrades gracefully
- GIVEN `EMBEDDINGS_ENABLED=true` and `OPENAI_API_KEY` unset
- WHEN a refresh is attempted
- THEN `embedding_status='error'` and the CRUD operation still succeeds

### Requirement: Admin reprocess embedding endpoint

The system MUST expose `POST /breweries/{id}/reprocess-embedding`. It MUST bypass the hash dedup short-circuit and force regeneration for a single brewery. It MUST authorize only `super_admin`; any other authenticated role MUST receive `403 Forbidden`. It MUST return `202 Accepted` and MUST NOT block on the OpenAI call. A missing brewery MUST return `404 Not Found`.

#### Scenario: Super admin forces reprocessing
- GIVEN a `super_admin` user and an existing brewery
- WHEN the user calls `POST /breweries/{id}/reprocess-embedding`
- THEN the response is `202 Accepted`, hash dedup is bypassed, and regeneration is scheduled

#### Scenario: Non-super-admin forbidden
- GIVEN an `operativo` user
- WHEN the user calls the reprocess endpoint
- THEN the response is `403 Forbidden`

#### Scenario: Unknown brewery not found
- GIVEN a `super_admin` user and a non-existent brewery id
- WHEN the user calls the reprocess endpoint
- THEN the response is `404 Not Found`
