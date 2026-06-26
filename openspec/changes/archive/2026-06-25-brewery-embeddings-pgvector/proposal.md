# Proposal: Brewery Embeddings with pgvector (Phase 1)

## Intent

Generate and store OpenAI `text-embedding-3-small` vectors for each brewery record in Supabase pgvector, enabling future internal semantic retrieval by the chat synthesizer. Phase 1 focuses on **embedding generation and storage only** — no user-facing search UI or vector similarity endpoints.

## Scope

### In Scope
- Add pgvector columns (`embedding`, `embedding_status`, `embedding_text_hash`, `embedding_error`, `embedded_at`) to `public.breweries` and version-control the migration in `sql/`
- Compute deterministic canonical text from brewery profile fields (exclude PII: phone, email, NIT; exclude timestamps and embedding metadata)
- SHA-256 hash comparison to skip redundant OpenAI calls on no-op updates
- Best-effort async embedding refresh via FastAPI `BackgroundTasks` after `create`/`update`
- Graceful degradation: CRUD succeeds even if embedding call fails; status set to `error` with message preserved
- Internal/admin `POST /breweries/{id}/reprocess-embedding` endpoint to retry a single brewery
- Config keys: `OPENAI_API_KEY`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSION`, `EMBEDDINGS_ENABLED`
- Unit tests for hash comparison, status transitions, and background scheduling

### Out of Scope
- Vector similarity search endpoints (`<=>` operator, HNSW/IVFFlat index tuning)
- Bulk backfill endpoint or strategy for existing breweries
- Retry queue with durable persistence (Celery/RQ/Edge Functions)
- Embeddings for other entity types (coffee farms, wine producers, animal feed)
- Admin dashboard for embedding status overview
- User-facing semantic search UI

## Capabilities

### New Capabilities
- `brewery-embeddings`: Canonical text construction, OpenAI embedding generation, pgvector storage, status machine (`pending`/`ready`/`error`), hash-based dedup, and admin reprocess endpoint

### Modified Capabilities
- `breweries-crud`: `create` and `update` operations now schedule background embedding refresh as a side effect; response models include embedding metadata fields

## Approach

1. **Schema**: Add migration SQL for pgvector columns and a B-tree index on `embedding_text_hash`
2. **Config**: Extend `app/core/config.py` with embedding settings and feature flag
3. **Service**: Add `refresh_embedding(brewery_id)` async method to `BreweryService` — computes canonical text, compares hash, calls OpenAI, writes result
4. **Router**: Wire `BackgroundTasks` into `create`/`update` handlers; add `POST /breweries/{id}/reprocess-embedding` guarded by `super_admin`
5. **Response**: Include `embedding_status` and `embedded_at` in `BreweryResponse` schema

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-backend/sql/` | New | Migration adding pgvector columns and index |
| `cortex-backend/app/core/config.py` | Modified | Embedding config keys and feature flag |
| `cortex-backend/app/services/brewery_service.py` | Modified | `refresh_embedding()` method, hash logic, status machine |
| `cortex-backend/app/routers/breweries.py` | Modified | `BackgroundTasks` wiring, reprocess endpoint |
| `cortex-backend/app/schemas/breweries.py` | Modified | Embedding metadata on response models |
| `cortex-backend/.env.example` | Modified | New env var documentation |
| `cortex-backend/tests/` | Modified | Hash, status, and background task tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Server restart kills pending `BackgroundTasks` | Medium | Acceptable for phase 1; admin reprocess endpoint covers recovery |
| OpenAI API outage blocks embeddings | Low | `EMBEDDINGS_ENABLED` flag allows disabling; CRUD continues regardless |
| Schema drift between Supabase and version control | Medium | Migration script added to `sql/` and run before deployment |
| Embedding cost on bulk imports | Medium | Phase 1 excludes bulk imports; defer to backfill phase |

## Rollback Plan

1. Set `EMBEDDINGS_ENABLED=false` in environment to stop all embedding generation immediately
2. Revert the code deployment — existing pgvector columns are harmless and can remain
3. If columns must be removed: run `ALTER TABLE public.breweries DROP COLUMN IF EXISTS embedding, ...` (non-destructive to brewery data)

## Dependencies

- Supabase project with `pgvector` extension enabled (already active)
- OpenAI service key with `text-embedding-3-small` access (already in use for chat)
- `openai>=1.35.0` in `pyproject.toml` (already present)

## Success Criteria

- [ ] `create` and `update` return immediately; embedding writes asynchronously within 2 seconds
- [ ] Identical brewery data produces identical SHA-256 hash and skips redundant OpenAI calls
- [ ] Embedding failure sets `embedding_status='error'` without failing the CRUD operation
- [ ] Admin reprocess endpoint successfully regenerates embedding for a single brewery
- [ ] All new columns and index present in version-controlled SQL migration
- [ ] Unit tests cover hash comparison, all three status transitions, and `BackgroundTasks` scheduling
