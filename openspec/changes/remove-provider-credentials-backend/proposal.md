# Proposal: Remove Provider Credentials Backend

## Intent

n8n owns agents, models, providers, and credentials. Cortex backend must stop storing, encrypting, or listing AI provider API keys. Removes `/provider-credentials` API, service, schemas, legacy `/chat/stream` router, and `EncryptionService`. `/chat/n8n` stays operational.

## Scope

### In Scope
- Delete `provider_credentials` router, service, schemas, and tests
- Delete legacy `chat.py` (`/chat/stream`) — dead code; frontend caller removed in PR #39
- Delete `encryption_service.py` — zero consumers after `chat.py` removal
- Clean `ProviderRegistry.list_providers()` credential params and `__init__.py` exports
- Update `test_adapters/test_registry.py`

### Out of Scope
- Supabase table drop (CORTEXDIST-23)
- `ENCRYPTION_KEY` env/config cleanup (CORTEXDIST-24) — document as handoff
- `n8n_chat.py` or its tests

## Capabilities

### New Capabilities
_None_

### Modified Capabilities
- `provider-credentials`: Backend surface deleted entirely
- `chat-session`: Legacy `/chat/stream` SSE path removed; only `/chat/n8n` remains
- `provider-registry`: `list_providers()` drops `credential_service`/`user_id` params

## Approach

Pure deletion. `n8n_chat.py` has zero imports from provider credentials or encryption. `chat.py` is dead code — its removal eliminates the only non-CRUD consumer of both services. `ENCRYPTION_KEY` becomes dead config for CORTEXDIST-24.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/main.py` | Modified | Remove provider_credentials import + include_router |
| `app/routers/provider_credentials.py` | Removed | CRUD router |
| `app/routers/chat.py` | Removed | Legacy /chat/stream SSE — dead code |
| `app/routers/__init__.py` | Modified | Remove from __all__ |
| `app/services/provider_credential_service.py` | Removed | CRUD + decrypt service |
| `app/services/encryption_service.py` | Removed | Fernet encrypt/decrypt |
| `app/schemas/provider_credentials.py` | Removed | CredentialCreate/Response |
| `app/adapters/registry.py` | Modified | Drop credential params from list_providers |
| `tests/test_provider_credentials_*.py` | Removed | 3 test files |
| `tests/test_chat_router.py` | Removed | Legacy chat tests |
| `tests/test_encryption_service.py` | Removed | Encryption tests |
| `tests/test_adapters/test_registry.py` | Modified | Remove credential mocks |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| External client still calls `/chat/stream` | Low | Frontend was sole caller (PR #39) |
| `list_providers()` signature change breaks callers | Low | No production caller uses credential args |

## Rollback Plan

Revert the single commit. All changes are file deletions/edits — no DB mutations, no env changes.

## Dependencies

- CORTEXDIST-21 (frontend) — DONE, merged PR #39
- CORTEXDIST-23 (DB) — next
- CORTEXDIST-24 (docs) — next; will document ENCRYPTION_KEY removal

## Success Criteria

- [ ] No `/provider-credentials` endpoints registered
- [ ] No service creates/lists/validates/decrypts/deletes AI provider API keys
- [ ] No `ProviderCredentialService` or `EncryptionService` import in any router
- [ ] All provider-credentials and legacy-chat tests deleted
- [ ] `/chat/n8n` tests pass; `n8n_chat.py` unchanged
- [ ] `test_registry.py` passes without credential mocks
- [ ] `ENCRYPTION_KEY` documented as dead config for CORTEXDIST-24
