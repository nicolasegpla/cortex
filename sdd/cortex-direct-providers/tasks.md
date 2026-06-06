# Tasks: Cortex Direct Provider Integrations — V1 (OpenAI, Anthropic, Gemini, DeepSeek)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~900–1,050 total (backend ~550, frontend ~250, tests ~250) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Slice 1 → Slice 2 → Slice 3 → Slice 4 |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Adapter extraction + DeepSeek | PR 1 | Base branch = main; remove Kimi/Minimax; extract OpenAI/Anthropic to new package |
| 2 | Gemini adapter + ProviderRegistry | PR 2 | Base = PR 1; add google-generativeai dep, GeminiAdapter, ProviderRegistry |
| 3 | Backend wiring + schemas | PR 3 | Base = PR 2; update chat router, chat schema, wire registry |
| 4 | Frontend + tests | PR 4 | Base = PR 3; update Provider type, ChatSettings, store, and backend test suite |

---

## Phase 1: Adapter Extraction + DeepSeek (TDD)

### Backend — Extract `app/adapters/` package

- [x] 1.1 **RED**: Add `cortex-backend/tests/test_adapters/test_openai_adapter.py` — mock `openai.AsyncOpenAI`, assert `stream_chat` yields deltas, raises `ValueError` on unknown model
- [x] 1.2 **RED**: Add `cortex-backend/tests/test_adapters/test_anthropic_adapter.py` — mock `anthropic.AsyncAnthropic`, assert `stream_chat` yields deltas
- [x] 1.3 **RED**: Add `cortex-backend/tests/test_adapters/test_deepseek_adapter.py` — assert `DeepSeekAdapter` inherits `OpenAIAdapter`, has `_base_url="https://api.deepseek.com/v1"`, `provider_name="deepseek"`
- [x] 1.4 **GREEN**: Create `cortex-backend/app/adapters/__init__.py` — re-exports `LlmProviderAdapter`, `OpenAIAdapter`, `AnthropicAdapter`, `DeepSeekAdapter`
- [x] 1.5 **GREEN**: Create `cortex-backend/app/adapters/base.py` — move `LlmProviderAdapter` ABC from `llm_provider_service.py`; add abstract `validate(self, api_key: str) -> bool` method
- [x] 1.6 **GREEN**: Create `cortex-backend/app/adapters/openai.py` — `OpenAIAdapter(LlmProviderAdapter)` from existing class; add `validate()` via `models.list` endpoint
- [x] 1.7 **GREEN**: Create `cortex-backend/app/adapters/anthropic.py` — `AnthropicAdapter(LlmProviderAdapter)` from existing class; add `validate()` via `messages.create` with `max_tokens=1`
- [x] 1.8 **GREEN**: Create `cortex-backend/app/adapters/deepseek.py` — `DeepSeekAdapter(OpenAIAdapter)` with `_base_url="https://api.deepseek.com/v1"`; `provider_name="deepseek"`; `provider_display_name="DeepSeek"`
- [x] 1.9 **GREEN**: Update `cortex-backend/app/services/llm_provider_service.py` — remove adapter classes and `PROVIDER_ADAPTERS` dict; keep `resolve_model_alias` and `MODELS` (updated in Phase 2); import and re-export from `app.adapters`
- [x] 1.10 **REFACTOR**: Remove `KimiAdapter` and `MinimaxAdapter` from `llm_provider_service.py`; update `MODELS` dict to remove `kimi`/`minimax` entries
- [x] 1.11 **GREEN**: Run all adapter tests — `pytest tests/test_adapters/ -v`

---

## Phase 2: Gemini Adapter + ProviderRegistry (TDD)

### Backend — Gemini SDK + Registry

- [x] 2.1 **RED**: Add `cortex-backend/tests/test_adapters/test_gemini_adapter.py` — mock `google.generativeai.GenerativeModel`, assert `stream_chat` yields text parts, `validate()` returns bool
- [x] 2.2 **RED**: Add `cortex-backend/tests/test_adapters/test_registry.py` — mock `ProviderCredentialService`; assert `register()`, `get_adapter()` dispatches correctly, `list_providers()` returns name/models/configured for V1 set
- [x] 2.3 **GREEN**: Add `google-generativeai>=0.8.0` to `cortex-backend/requirements.txt`
- [x] 2.4 **GREEN**: Create `cortex-backend/app/adapters/gemini.py` — `GeminiAdapter(LlmProviderAdapter)` using `google-generativeai`; `provider_name="gemini"`; `provider_display_name="Google Gemini"`; models: `["gemini-2.0-flash", "gemini-1.5-pro"]`; implement `stream_chat` (async generator over `response.parts`) and `validate()` (generate with `max_tokens=1`)
- [x] 2.5 **GREEN**: Create `cortex-backend/app/adapters/registry.py` — `ProviderRegistry` class: `register(adapter_cls)`, `get_adapter(provider: str) -> LlmProviderAdapter`, `list_providers(credential_service, user_id) -> list[dict]`; singleton instance `_registry`
- [x] 2.6 **GREEN**: Update `cortex-backend/app/adapters/__init__.py` — re-export `ProviderRegistry`, `GeminiAdapter`
- [x] 2.7 **REFACTOR**: Update `cortex-backend/app/services/llm_provider_service.py` — add `MODELS` entries for `gemini` and `deepseek`
- [x] 2.8 **GREEN**: Run `pytest tests/test_adapters/ -v` — all green

---

## Phase 3: Backend Wiring — Router + Schemas (TDD)

### Backend — Chat router and schema updates

- [ ] 3.1 **RED**: Add `cortex-backend/tests/test_chat_router.py` — update provider literal to V1 set; mock `ProviderRegistry`; assert `/chat/stream` returns SSE for each V1 provider
- [ ] 3.2 **RED**: Update `cortex-backend/tests/test_llm_provider_service.py` — remove Kimi/Minimax test cases; add DeepSeek/Gemini model validation tests
- [ ] 3.3 **GREEN**: Update `cortex-backend/app/schemas/chat.py` — change `provider` literal to `Literal["openai", "anthropic", "gemini", "deepseek"]`
- [ ] 3.4 **GREEN**: Update `cortex-backend/app/routers/chat.py` — replace `from app.services.llm_provider_service import get_adapter` with `from app.adapters import ProviderRegistry`; use `registry.get_adapter(request.provider)`; update credential service call signature if needed
- [ ] 3.5 **GREEN**: Update `cortex-backend/app/adapters/registry.py` — import and register all four adapters at module load time via `register()` calls
- [ ] 3.6 **GREEN**: Run `pytest tests/test_chat_router.py tests/test_llm_provider_service.py -v`

---

## Phase 4: Frontend + Test Suite (TDD)

### Frontend — Provider type expansion

- [ ] 4.1 **RED**: Update `cortex-frontend/src/features/chat/credentialsStore.test.ts` — add `gemini` and `deepseek` to `Provider` type test coverage
- [ ] 4.2 **RED**: Update `cortex-frontend/src/features/chat/store.test.ts` — update `DEFAULT_MODELS` to V1 set; remove `kimi`/`minimax` entries
- [ ] 4.3 **GREEN**: Update `cortex-frontend/src/features/chat/credentialsStore.ts` — change `Provider` type to `"openai" | "anthropic" | "gemini" | "deepseek"`; remove `kimi`/`minimax`
- [ ] 4.4 **GREEN**: Update `cortex-frontend/src/features/chat/ChatSettings.tsx` — replace `PROVIDERS` array: OpenAI (`gpt-4o`), Anthropic (`claude-3-5-sonnet-20241022`), Gemini (`gemini-2.0-flash`), DeepSeek (`deepseek-chat`); remove Kimi/Minimax entries
- [ ] 4.5 **GREEN**: Update `cortex-frontend/src/features/chat/store.ts` — update `DEFAULT_MODELS` to V1 set; remove `kimi`/`minimax` entries
- [ ] 4.6 **GREEN**: Run `vitest run src/features/chat/ --reporter=verbose`

### Backend — Test suite reorganization

- [ ] 4.7 **GREEN**: Create `cortex-backend/tests/test_adapters/__init__.py`
- [ ] 4.8 **GREEN**: Ensure `cortex-backend/tests/test_adapters/` covers all four adapters with stream and validate tests
- [ ] 4.9 **GREEN**: Run full backend test suite — `pytest cortex-backend/tests/ -v --tb=short`