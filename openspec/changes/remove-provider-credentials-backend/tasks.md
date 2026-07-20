# Tasks: Remove Provider Credentials Backend

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1800-2200 (mostly deletions; ~30-50 net additions) |
| 400-line budget risk | High (preset 800-line budget also exceeded) |
| Chained PRs recommended | No (single-pr-default) |
| Decision needed before apply | No (pure deletion, single-commit revert) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: High

### Work Units (single PR, work-unit commits)

| Unit | Focused test command | Rollback boundary |
|------|----------------------|-------------------|
| WU1 — provider credentials surface | `pytest tests/test_main.py -v` | encryption_service.py, provider_credential_service.py, schema/router, 3 provider-credential tests, test_encryption_service.py, requirements.txt L13 |
| WU2 — legacy /chat/stream SSE | `pytest tests/test_main.py::TestMain::test_no_chat_stream_route -v` | app/routers/chat.py + tests/test_chat_router.py |
| WU3 — ProviderRegistry refactor | `pytest tests/test_adapters/test_registry.py -v` | registry.py + test_registry.py edits |
| WU4 — verification gate | `cd cortex-backend && pytest -q && pytest --collect-only` | N/A |

Runtime harness (all units): `cd cortex-backend && pytest -q`.

## Phase 1: WU1 — Provider Credentials Surface
- [x] 1.1 RED: add `test_no_provider_credentials_routes` + `test_encryption_service_not_importable` to `tests/test_main.py::TestMain` (assertions per WU1 table); confirm `pytest tests/test_main.py -v` fails
- [x] 1.2 Delete backend: `app/routers/provider_credentials.py`, `app/services/provider_credential_service.py`, `app/schemas/provider_credentials.py`, `app/services/encryption_service.py`
- [x] 1.3 Delete tests: `tests/test_provider_credentials_router.py`, `tests/test_provider_credentials_schemas.py`, `tests/test_provider_credential_service.py`, `tests/test_encryption_service.py`
- [x] 1.4 Edit `app/main.py`: drop `provider_credentials` import + `include_router`; `app/routers/__init__.py`: remove `'provider_credentials'`
- [x] 1.5 Edit `requirements.txt`: remove `cryptography>=42.0.0` (line 13)
- [x] 1.6 Confirm GREEN: `pytest tests/test_main.py -v` passes both new guards, no import errors
- [x] 1.7 Commit WU1 (`chore(provider-credentials): delete CRUD + EncryptionService; lock 404 + ImportError guards`)

## Phase 2: WU2 — Legacy `/chat/stream` SSE Deletion
- [x] 2.1 RED: add `test_no_chat_stream_route` to `tests/test_main.py::TestMain` (`/chat/stream` not in paths + 404; `/chat/n8n` still wired); confirm fails
- [x] 2.2 Delete `app/routers/chat.py` + `tests/test_chat_router.py`
- [x] 2.3 Edit `app/main.py`: drop `chat` import + `include_router`; `app/routers/__init__.py`: remove `'chat'`
- [x] 2.4 Confirm GREEN: `pytest tests/test_main.py tests/test_n8n_chat_router.py -v` → 404 guard passes + n8n wired
- [x] 2.5 Commit WU2 (`chore(chat): delete dead /chat/stream SSE + tests`)

## Phase 3: WU3 — ProviderRegistry Refactor
- [x] 3.1 Edit `app/adapters/registry.py`: drop `credential_service`/`user_id` from `list_providers()`; remove `configured` key + branch; docstring → "adapter-presence only"
- [x] 3.2 Edit `tests/test_adapters/test_registry.py`: remove `mock_credential_service` fixture + 2 `configured` tests; drop unused `MagicMock`/`AsyncMock`; assert `"configured" not in provider` in remaining list_providers tests
- [x] 3.3 Confirm GREEN: `pytest tests/test_adapters/ -v` all pass
- [x] 3.4 Commit WU3 (`refactor(registry): drop credential params + configured key from list_providers`)

## Phase 4: WU4 — Verification Gate
- [x] 4.1 `pytest -q && pytest --collect-only` green; regression sweep `tests/test_n8n_chat_router.py tests/test_n8n_chat_service.py tests/test_main.py tests/test_adapters/ tests/test_chat_schemas.py` all pass
- [x] 4.2 `git grep -nE "ProviderCredentialService|EncryptionService|provider_credentials"` → no production hits; record apply-progress handoff (CORTEXDIST-23/-24 deferred)

## Spec → Tasks Trace

provider-credentials 404 → 1.1, 1.4; EncryptionService ImportError → 1.1, 1.2, 1.5. chat-session MODIFIED (n8n-only) → 2.1, 2.3, 2.4, 4.1; REMOVED SSE → 2.2. provider-registry MUST NOT accept params → 3.1, 3.2; show providers → 3.1, 3.2, 3.3; exclude Kimi/OpenClaw → 3.3.
