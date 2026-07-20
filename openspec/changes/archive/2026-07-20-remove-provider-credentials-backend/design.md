# Design: Remove Provider Credentials Backend

## Technical Approach

Pure deletion. Remove the `/provider-credentials` CRUD surface, the legacy `/chat/stream` SSE router (Sole non-CRUD consumer of credentials + encryption), `EncryptionService`, and credential schemas. Strip credential params from `ProviderRegistry.list_providers()`. The `cryptography` (Fernet) dependency is removed from `requirements.txt` since its only consumer is deleted. `n8n_chat.py` and its tests are untouched — they have zero imports from the deleted surface. No DB, env, or docs changes (those are CORTEXDIST-23 / -24).

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| `list_providers()` signature | Drop `credential_service` & `user_id` params entirely; drop `configured` field computation | Keep optional params for backward compat | Spec mandates "MUST NOT accept"; no production caller passes them (only `tests/test_adapters/test_registry.py` does). Removing dead params keeps the contract honest. |
| `cryptography` in `requirements.txt` | Remove the line | Keep it | Only `encryption_service.py` + deleted tests import `Fernet`. Verified via grep — no other production or test import. Spec mandates removal. |
| Orphaned modules reachable only via `chat.py` | KEEP `app/orchestrators/sql_orchestrator.py`, `app/utils/text_normalization.py`, `app/services/llm_provider_service.py`, and the legacy schemas in `app/schemas/chat.py` (`ChatRequest`, `ChatMessage`, `ChatEvent`, `ToolCall`, `ToolResult`) | Delete them in this change | Proposal is explicit "pure deletion" of a named file list; none of these appear in the Affected Areas table. Each has its own dedicated passing tests (`test_sql_orchestrator.py`, `test_text_normalization.py`, `test_llm_provider_service.py`, `test_chat_schemas.py`). Expanding scope risks breaking unrelated tests and violates "no invented scope". Tracked in Open Questions for a future cleanup change. |
| `app/schemas/chat.py` | Keep file; remove nothing | Trim orphaned `ChatRequest`/`ChatMessage`/`ChatEvent`/`ToolCall`/`ToolResult` | `N8NChatRequest`, `N8NChatResponse`, `ToolDefinition`, `ToolCallResult` are still imported by `n8n_chat.py` and by adapters (`openai.py`, `anthropic.py`, `gemini.py`, `deepseek.py`, `base.py`). File stays intact; trimming untested-but-passing legacy classes is out of scope. |
| `app/core/config.py` `encryption_key` field | Leave untouched | Remove it | Handoff to CORTEXDIST-24 (docs/config cleanup). Spec line 13: "`ENCRYPTION_KEY` becomes dead config — CORTEXDIST-24 tracks the cleanup." Removing it here would break `.env`-loading tests if any rely on the Settings shape, and is explicitly deferred. |
| `tests/test_chat_router.py` (504 lines) | Delete wholesale | Surgically keep `TestConfigCutover` group | File mixes SSE-stream tests with `TestConfigCutover` (SQL_ORCHESTRATOR_ENABLED absence — vacuously satisfied once `chat.py` is gone) and `_stream_sse` helper tests. Proposal names this file for deletion; "old symbols removed" assertions become vacuous. Deleted in full. |

## Data Flow

Pre-change `/chat/stream` path (deleted):

```
client → chat.py.get_credential_service ─→ ProviderCredentialService ─→ EncryptionService (Fernet)
                                       └→ registry.get_adapter ─→ SqlOrchestrator
```

Post-change, only `/chat/n8n` remains:

```
client → n8n_chat.py → N8NChatService → n8n webhook (no encryption, no credentials)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `app/main.py` | Modify | Remove `chat` and `provider_credentials` from the `app.routers` import block (lines 13, 18) and the two `include_router` calls (lines 48, 50). Keep `n8n_chat`. |
| `app/routers/__init__.py` | Modify | Remove `'chat'` and `'provider_credentials'` from `__all__`. |
| `app/routers/chat.py` | Delete | Legacy `/chat/stream` SSE router. Sole non-CRUD consumer of `ProviderCredentialService` + `EncryptionService`. |
| `app/routers/provider_credentials.py` | Delete | `/provider-credentials` CRUD router (list/create/delete/test). |
| `app/services/provider_credential_service.py` | Delete | CRUD + decrypt service. |
| `app/services/encryption_service.py` | Delete | `EncryptionService` (Fernet). Zero consumers after deletions. |
| `app/schemas/provider_credentials.py` | Delete | `CredentialCreate`, `CredentialResponse`. |
| `app/adapters/registry.py` | Modify | `list_providers(self) -> list[dict]` — drop `credential_service`/`user_id` params and the `configured` branch. Docstring updated. `configured` key stays in output dicts as `False` (no credential source) OR is removed; spec says "adapter-availability metadata" — we remove the `configured` key, since its only meaning was credential-readiness. |
| `tests/test_adapters/test_registry.py` | Modify | Remove `mock_credential_service` fixture, `test_list_providers_includes_configured_status`, `test_list_providers_unconfigured_when_no_credential`. Remove `MagicMock`/`AsyncMock` imports if unused. Update `test_list_providers_*` to assert no `configured` key. |
| `tests/test_provider_credentials_router.py` | Delete | Tests deleted router. |
| `tests/test_provider_credentials_schemas.py` | Delete | Tests deleted schemas. |
| `tests/test_provider_credential_service.py` | Delete | Tests deleted service. |
| `tests/test_encryption_service.py` | Delete | Tests deleted `EncryptionService`. |
| `tests/test_chat_router.py` | Delete | Tests deleted `/chat/stream` (see Architecture Decisions). |
| `requirements.txt` | Modify | Remove `cryptography>=42.0.0` line (line 13). |

## Interfaces / Contracts

```python
# app/adapters/registry.py — final signature
def list_providers(self) -> list[dict]:
    """Return metadata for all registered providers (adapter-presence only)."""
    # returns: [{ "id", "name", "models" }]  — no "configured" key
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Spec scenario: no `/provider-credentials` routes | Routes table after app construction | `test_main.py` already asserts expected routes; add assertion `'/provider-credentials' not in paths` and `'/chat/stream' not in paths` and `'/chat/n8n' in paths` to lock the deletion (RED → GREEN). |
| Spec scenario: `EncryptionService` not importable | Import attempt fails | New one-line test in `test_main.py` or `tests/test_encryption_removed.py`: `pytest.raises(ImportError)` on `import app.services.encryption_service`. |
| Unit: `list_providers()` | No-arg call works, no `configured` key, V1 providers only | `tests/test_adapters/test_registry.py` trimmed — keep `test_list_providers_returns_all_registered`, `test_list_providers_excludes_non_v1_providers`, `test_registry_singleton_exists`, `test_register_*`, `test_get_adapter_*`. |
| Regression: n8n path | `/chat/n8n` unchanged | Existing `tests/test_n8n_chat_router.py`, `tests/test_n8n_chat_service.py` must pass unmodified. |
| Regression: adapters | Adapters still import `ToolDefinition`/`ToolCallResult` from `app.schemas.chat` | Existing `tests/test_adapters/test_*_adapter.py` pass unmodified. |
| Module hygiene | No import of deleted modules anywhere | Run `pytest --collect-only` (collection fails if any test file imports a deleted module) plus `pytest -q`. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. The change deletes HTTP routes but does not introduce new routing logic or process integration.

## Migration / Rollout

No migration. Single-commit revert restores all deletions/edits. No DB mutations, no env changes. `ENCRYPTION_KEY` config field stays as dead config (CORTEXDIST-24 handoff). Deploy note: any external client still calling `/chat/stream` or `/provider-credentials/*` will receive 404 — frontend was sole caller and was removed in PR #39, so blast radius is zero.

## Open Questions

- [ ] Should the now-orphaned `ChatRequest`/`ChatMessage`/`ChatEvent`/`ToolCall`/`ToolResult` schemas, `sql_orchestrator.py`, `text_normalization.py`, and `llm_provider_service.py` be filed as a separate cleanup change (post-CORTEXDIST-24)? Recommended: yes, but explicitly out of scope here.
- [ ] After deleting `chat.py`, do we want a module-level guard test that `/chat/stream` returns 404? Recommended yes (added to `test_main.py`); confirm with reviewer.