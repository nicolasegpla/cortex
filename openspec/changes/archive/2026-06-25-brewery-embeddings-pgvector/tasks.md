# Tasks: Brewery Embeddings via pgvector (Phase 1)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~600 (migration + service + router + schema + tests) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 Foundation → PR 2 Wiring → PR 3 Admin endpoint |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain (resolved) |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | SQL migration + config + EmbeddingService (text/hash/OpenAI) + unit tests | PR 1 base: main | Pure infra; TDD strict |
| 2 | BreweryService.refresh_embedding + BackgroundTasks on create/update + BreweryResponse schema + integration tests | PR 2 base: PR 1 | Service+router wiring |
| 3 | POST /breweries/{id}/reprocess-embedding + super_admin-only auth tests | PR 3 base: PR 2 | Admin-only; force=True bypass |

## Phase 1: Foundation (PR 1)

- [x] 1.1 RED: `cortex-backend/tests/test_embedding_service.py` — field set includes `nombre_contacto`, excludes PII/metadata, deterministic array sort, label format
- [x] 1.2 GREEN: Create `cortex-backend/app/services/embedding_service.py` with `CANONICAL_FIELDS` (includes `nombre_contacto`), `FIELD_LABELS`, `build_canonical_text(dict) -> str`
- [x] 1.3 RED: Hash determinism tests — identical text → identical SHA-256
- [x] 1.4 GREEN: Implement `compute_hash(text) -> str` SHA-256
- [x] 1.5 RED: `generate_embedding` tests with mocked `AsyncOpenAI` (success returns vector, failure raises, missing key raises)
- [x] 1.6 GREEN: `async generate_embedding(text)` — constructs `AsyncOpenAI(api_key=settings.OPENAI_API_KEY)` per call, reads `EMBEDDING_MODEL`
- [x] 1.7 Create `cortex-backend/sql/006_add_embeddings.sql` — idempotent `ADD COLUMN IF NOT EXISTS` for `embedding vector(1536)`, `embedding_status text DEFAULT 'pending'`, `embedding_model text`, `embedding_source_hash text`, `embedding_updated_at timestamptz`; index on `embedding_source_hash`
- [x] 1.8 Add `OPENAI_API_KEY`, `EMBEDDING_MODEL` (default `text-embedding-3-small`), `EMBEDDING_DIMENSION` (default 1536), `EMBEDDINGS_ENABLED` (default true) to `cortex-backend/app/core/config.py`; document in `cortex-backend/.env.example`

## Phase 2: Wiring (PR 2)

- [x] 2.1 RED: `cortex-backend/tests/test_brewery_service.py` — skip when status='ready' + hash + model match; regenerate on mismatch/error; force=True bypass
- [x] 2.2 GREEN: `BreweryService.refresh_embedding(brewery_id, force=False)` — success writes `embedding`/`status='ready'`/`model`/`hash`/now; failure writes `status='error'` (preserve prior vector)
- [x] 2.3 RED: OpenAI failure path — status='error', prior embedding preserved, no exception escapes
- [x] 2.4 GREEN: try/except around OpenAI call; structured-log error
- [x] 2.5 RED: `cortex-backend/tests/test_breweries_router.py` — `add_task(service.refresh_embedding, brewery_id)` called after create/update
- [x] 2.6 GREEN: Add `background_tasks: BackgroundTasks` to POST/PUT `/breweries` handlers in `cortex-backend/app/routers/breweries.py`; skip when `EMBEDDINGS_ENABLED=false`
- [x] 2.7 RED: Schema tests — `embedding_status`, `embedding_updated_at` present in `BreweryResponse`
- [x] 2.8 GREEN: Extend `BreweryResponse` in `cortex-backend/app/schemas/breweries.py` with both fields

## Phase 3: Admin Reprocess (PR 3)

- [x] 3.1 RED: Router tests — super_admin → 202, operativo → 403, unknown id → 404, `force=True` call propagated
- [x] 3.2 GREEN: `POST /breweries/{id}/reprocess-embedding` in `cortex-backend/app/routers/breweries.py` gated by `require_role(["super_admin"])`; schedules `service.refresh_embedding(id, force=True)`; returns 202

## Phase 4: Verification

- [x] 4.1 Run pytest; no regressions, new tests pass — 539 passed, 0 failed (sdd-verify 2026-06-25)
- [ ] 4.2 Apply migration against Supabase; rerun to confirm idempotency — NOT RUN in verify env (requires live Supabase); static evidence: `sql/006_add_embeddings.sql` uses `ADD COLUMN IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` so idempotent by construction
- [x] 4.3 Spot-check `EMBEDDINGS_ENABLED=false` skips scheduling on create/update — `test_create_brewery_skips_embedding_when_disabled` + `test_update_brewery_skips_embedding_when_disabled` pass
