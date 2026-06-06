# Design: Cortex Direct Provider Integrations

## Technical Approach

Replace the current flat `PROVIDER_ADAPTERS` dict + `get_adapter()` factory with a `ProviderRegistry` class that owns adapter instantiation, model catalog, and credential-awareness. DeepSeek reuses the existing `OpenAIAdapter` subclass pattern (base_url override). Gemini gets a standalone adapter using Google's `google-generativeai` SDK. Kimi and Minimax adapters are removed — they were experimental phase-1 providers.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| DeepSeek integration | (A) Subclass OpenAIAdapter, (B) Standalone with openai SDK, (C) Custom HTTP client | A — OpenAIAdapter subclass with `_base_url="https://api.deepseek.com/v1"` | DeepSeek is OpenAI-compatible. Proven pattern already used by Kimi/Minimax. Zero new SDK dependencies. |
| Gemini integration | (A) google-generativeai SDK, (B) OpenAI-compat mode via vertexai, (C) REST HTTP client | A — `google-generativeai` SDK with `GeminiAdapter(LlmProviderAdapter)` | Official SDK handles auth, retries, streaming natively. Rest client is brittle. Vertex AI mode adds GCP dependency we don't need. |
| Kimi/Minimax migration | (A) Remove immediately, (B) Keep as deprecated | A — Remove adapter classes, provider entries, and frontend listings | They were experimental P1 providers. Removing keeps the codebase lean. Pattern preserved for V2 re-add. |
| Registry vs singleton factory | (A) `ProviderRegistry` class, (B) Keep `get_adapter()` function | A — `ProviderRegistry` class with `register()`, `get_adapter()`, `list_providers()` | Needs to own model catalog per provider and respond to credential state. Simple function can't carry that context. |
| Model definitions location | (A) Global MODELS dict, (B) Per-adapter class attribute | B — Each adapter class owns its supported models list | Single source of truth. Adding a provider means adding one file, not touching a central registry. |
| Validation method | (A) Adapter-level `validate()`, (B) Service-level monolith | A — `validate()` on each adapter, called by `test_credential` | Adapts per-provider auth patterns (OpenAI: list models, Anthropic: message test, Gemini: generate). Already partially done. |

## Data Flow

```
 ┌──────────────┐     POST /chat/stream      ┌──────────────┐
 │   Frontend    │ ──────────────────────────> │  Chat Router  │
 │  (React SPA)  │ <── SSE (delta/done/error) │  (FastAPI)    │
 └──────┬───────┘                              └──────┬───────┘
        │                                             │
  GET /provider-credentials                     decrypt key via
  POST /provider-credentials                    ProviderCredentialService
  POST /provider-credentials/test                      │
        │                                    ┌─────────▼──────────┐
        └─────────────────────────────────── │  ProviderRegistry   │
                                             │  .get_adapter(id)   │
                                             │  .list_providers()  │
                                             └─────────┬──────────┘
                                                       │
                    ┌──────────────┬──────────┬────────┼────────┬──────────┐
                    ▼              ▼          ▼        ▼        ▼          ▼
             OpenAIAdapter  AnthropicAd.  GeminiAd.  DeepSeekAd.  (V2...)
             (openai SDK)   (anthropic)   (google)   (openai)
                    │              │          │        │
                    ▼              ▼          ▼        ▼
             api.openai.com  api.anthropic  generativelanguage  api.deepseek.com
                              .com          .googleapis.com
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `cortex-backend/app/adapters/__init__.py` | Create | Package init, re-exports `ProviderRegistry` and all adapters |
| `cortex-backend/app/adapters/base.py` | Create | `LlmProviderAdapter` ABC extracted from `llm_provider_service.py` |
| `cortex-backend/app/adapters/openai.py` | Create | `OpenAIAdapter` class |
| `cortex-backend/app/adapters/anthropic.py` | Create | `AnthropicAdapter` class |
| `cortex-backend/app/adapters/gemini.py` | Create | `GeminiAdapter(LlmProviderAdapter)` using `google-generativeai` |
| `cortex-backend/app/adapters/deepseek.py` | Create | `DeepSeekAdapter(OpenAIAdapter)` with `_base_url="https://api.deepseek.com/v1"` |
| `cortex-backend/app/adapters/registry.py` | Create | `ProviderRegistry` — registration, routing, readiness, listing |
| `cortex-backend/app/services/llm_provider_service.py` | Modify | Remove adapter classes, delegate to `app.adapters` registry |
| `cortex-backend/app/routers/chat.py` | Modify | Use `ProviderRegistry` instead of `get_adapter()` |
| `cortex-backend/app/schemas/chat.py` | Modify | Expand provider literal: `"openai" \| "anthropic" \| "gemini" \| "deepseek"` |
| `cortex-backend/app/schemas/provider_credentials.py` | Modify | No schema changes needed — provider is already free-form `str` |
| `cortex-backend/requirements.txt` | Modify | Add `google-generativeai>=0.8.0` |
| `cortex-backend/tests/test_adapters/` | Create | Separate adapter test modules per provider |
| `cortex-backend/tests/test_llm_provider_service.py` | Modify | Update imports, remove Kimi/Minimax tests, add DeepSeek/Gemini |
| `cortex-backend/tests/test_chat_router.py` | Modify | Update provider values in test payloads |
| `cortex-frontend/src/features/chat/credentialsStore.ts` | Modify | Expand `Provider` type, add deepseek/gemini |
| `cortex-frontend/src/features/chat/store.ts` | Modify | Add default models for deepseek and gemini |
| `cortex-frontend/src/features/chat/ChatSettings.tsx` | Modify | Add Gemini and DeepSeek entries to PROVIDERS list |
| `cortex-frontend/src/features/chat/credentialsStore.test.ts` | Modify | Add test coverage for new providers |
| `cortex-frontend/src/features/chat/store.test.ts` | Modify | Update test expectations for new providers |

## Interfaces / Contracts

```python
# app/adapters/base.py — Unchanged from existing ABC
class LlmProviderAdapter(ABC):
    provider_name: str  # class attr
    provider_display_name: str  # class attr
    models: list[str]  # NEW — per-adapter model list

    @abstractmethod
    async def stream_chat(self, model, messages, api_key) -> AsyncGenerator[str, None]: ...

    def _validate_model(self, model: str) -> None: ...
    async def validate(self, api_key: str) -> bool: ...  # NEW — credential validation
```

```python
# app/adapters/registry.py — New
class ProviderRegistry:
    def register(self, adapter_cls: type[LlmProviderAdapter]) -> None: ...
    def get_adapter(self, provider: str) -> LlmProviderAdapter: ...
    def list_providers(self, credential_service, user_id: str) -> list[dict]: ...
    # Returns: [{"id": "openai", "name": "OpenAI", "models": [...], "configured": bool}, ...]
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — adapters | Each adapter `stream_chat()` yields correct chunks, validates models, propagates errors | `unittest.mock.MagicMock` + `AsyncMockIterator` (existing pattern, per-provider test classes) |
| Unit — Gemini adapter | Gemini stream conversion (response.parts iteration), message format translation | Mock `google.generativeai.GenerativeModel` |
| Unit — DeepSeek adapter | Inherits OpenAI behavior, correct base_url, correct provider_name | Test subclass attributes, one integration-style stream test |
| Unit — Registry | Registration dedup, get_adapter() dispatch, list_providers() with/without credentials | Mock credential service, assert correct adapter types and readiness |
| Integration — Router | POST /chat/stream with each V1 provider returns SSE | Existing pattern: mock adapter + TestClient |
| Integration — Credentials | save/test/delete credential cycle for Gemini and DeepSeek | Existing pattern: mock Supabase + encryption |
| Frontend | Provider type expansion, credentials CRUD, settings UI | Vitest + jsdom, existing store test patterns |

## Migration / Rollout

### Phased slices (under 400-line review budget each)

1. **Slice 1 — Adapter extraction + DeepSeek** (~200 lines): Create `app/adapters/` package, extract base + openai + anthropic adapters, add DeepSeek adapter. Remove Kimi/Minimax. Update `llm_provider_service.py` to delegate.

2. **Slice 2 — Gemini adapter + Registry** (~300 lines): Add `google-generativeai` dep, implement `GeminiAdapter`, build `ProviderRegistry`, update chat router and schemas.

3. **Slice 3 — Frontend** (~250 lines): Expand provider types, update settings UI, update store tests.

4. **Slice 4 — Test suite consolidation** (~250 lines): Reorganize adapter tests into `tests/test_adapters/`, add comprehensive Gemini/DeepSeek coverage, update router tests.

No database migration required — provider column is free-form text. No breaking API changes — existing OpenAI and Anthropic paths unchanged.

## Open Questions

- [ ] Gemini model selection: which Google models to support initially? (suggest: `gemini-2.0-flash`, `gemini-1.5-pro`)
- [ ] DeepSeek model selection: `deepseek-chat` (v3) and/or `deepseek-reasoner` (r1)?
- [ ] Gemini free-tier API key format differs from paid — does `validate()` need account-tier detection?
