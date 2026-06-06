# Tasks: Chat-First LLM Workspace

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1800–2200 (backend + frontend, 20+ files) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | ask-always |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Encryption + DB schema foundation | PR 1 | Base: main. Encryption service, SQL migration, schemas. Independent, no dependencies. |
| 2 | Provider adapter layer | PR 2 | Base: PR 1. ABC adapter, OpenAI/Kimi impl, Anthropic/Minimax impl. Depends on PR 1. |
| 3 | Chat streaming backend + SSE endpoint | PR 3 | Base: PR 2. POST /chat/stream SSE, credential service. Depends on PR 2. |
| 4 | Chat UI + credential management UI + routing | PR 4 | Base: PR 3. Zustand store, ChatPage, ChatSettings, router update. Depends on PR 3. |

---

## Phase 1: Encryption + DB Foundation (Work Unit 1)

### 1.1 — Create Fernet encryption service

- [ ] 1.1.1 (RED) Write `test_encryption_service.py`: test `encrypt()` returns `v1:<b64>`, `decrypt()` round-trips plaintext, wrong key raises, key rotation via MultiFernet
- [ ] 1.1.2 (GREEN) Create `cortex-backend/app/services/encryption_service.py`: class `EncryptionService` with `__init__(key: bytes | None = None)`, `encrypt(plaintext: str) -> str`, `decrypt(ciphertext: str) -> str`. Use `cryptography.fernet.MultiFernet`. Raise `ValueError` on decrypt failure
- [ ] 1.1.3 (REFACTOR) Move key validation to module level; add `ENCRYPTION_KEY` env var loading with `load_dotenv()`

### 1.2 — Create SQL migration

- [ ] 1.2.1 Write `cortex-backend/sql/005_create_provider_credentials.sql`: table `provider_credentials(id, user_id, provider, encrypted_api_key, label, created_at, updated_at)`, RLS enabled, UNIQUE(user_id, provider), RLS policies for SELECT/INSERT/UPDATE/DELETE matching `auth.uid()`
- [ ] 1.2.2 Add migration record to `cortex-backend/sql/migrations.json` (or run via Alembic if present — check existing migration setup first)

### 1.3 — Create Pydantic schemas

- [ ] 1.3.1 Create `cortex-backend/app/schemas/chat.py`: `ChatMessage` (role: Literal["user","assistant"], content: str), `ChatRequest` (model: str, messages: list[ChatMessage], provider: Literal["openai","kimi","minimax","anthropic"]), `ChatEvent` (type: Literal["delta","done","error"], data: str | null)
- [ ] 1.3.2 Create `cortex-backend/app/schemas/provider_credentials.py`: `CredentialCreate` (provider: str, api_key: str, label: str | None), `CredentialResponse` (id: str, provider: str, label: str | None, validated_at: datetime | None) — NO api_key field

---

## Phase 2: Provider Adapter Layer (Work Unit 2)

### 2.1 — Create LLM Provider ABC and OpenAI adapter

- [ ] 2.1.1 (RED) Write `test_llm_provider_service.py`: test `LlmProviderAdapter` ABC cannot be instantiated, concrete adapters have `stream_chat()`, routing by provider name
- [ ] 2.1.2 (GREEN) Create `cortex-backend/app/services/llm_provider_service.py`: `class LlmProviderAdapter(ABC)` with `async def stream_chat(self, model: str, messages: list[dict], api_key: str) -> AsyncGenerator[str, None]: ...`; `class OpenAIAdapter(LlmProviderAdapter)` using `openai.AsyncOpenAI`; `class KimiAdapter(OpenAIAdapter)` — override `base_url` to Kimi endpoint; `class MinimaxAdapter(OpenAIAdapter)` — override `base_url`; `class AnthropicAdapter(LlmProviderAdapter)` using `anthropic.AsyncAnthropic` with `messages` → Claude messages format
- [ ] 2.1.3 (REFACTOR) Extract `PROVIDER_ADAPTERS` dict: `{"openai": OpenAIAdapter, "kimi": KimiAdapter, "minimax": MinimaxAdapter, "anthropic": AnthropicAdapter}`. Add `get_adapter(provider: str) -> LlmProviderAdapter`

### 2.2 — Implement provider-specific model routing

- [ ] 2.2.1 Add `MODELS` const: `{"openai": ["gpt-4o", "gpt-4o-mini"], "kimi": ["moonshot-v1-8k", "moonshot-v1-32k"], "minimax": ["MiniMax-Text-01"], "anthropic": ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"]}`
- [ ] 2.2.2 Add validation in `stream_chat()`: raise `ValueError` if model not in `MODELS[provider]`

---

## Phase 3: Chat Streaming + Credential Service (Work Unit 3)

### 3.1 — Create provider credential service

- [ ] 3.1.1 (RED) Write `test_provider_credential_service.py`: test `save_credential()` encrypts before insert, `get_credentials()` never returns `encrypted_api_key`, `delete_credential()` enforces user isolation (monkeypatch RLS)
- [ ] 3.1.2 (GREEN) Create `cortex-backend/app/services/provider_credential_service.py`: `ProviderCredentialService` with `__init__(supabase: AsyncClient, encryption: EncryptionService)`. Methods: `save_credential(user_id, provider, api_key, label)`, `get_credentials(user_id) -> list[CredentialResponse]`, `delete_credential(user_id, provider)`, `get_decrypted_key(user_id, provider) -> str`

### 3.2 — Create chat SSE router

- [ ] 3.2.1 (RED) Write `test_chat_router.py`: test `POST /chat/stream` returns SSE with `event: delta` chunks, `event: done` on finish, `event: error` on failure; unauthorized returns 401
- [ ] 3.2.2 (GREEN) Create `cortex-backend/app/routers/chat.py`: `POST /chat/stream` accepts `ChatRequest`, resolves adapter via `get_adapter()`, decrypts credential via `ProviderCredentialService`, streams SSE with `event: delta` for each chunk, `event: done` when complete, `event: error` on exception. Include `AbortController` signal handling
- [ ] 3.2.3 (REFACTOR) Extract SSE helper: `_stream_sse(event: str, data: str) -> str`

### 3.3 — Register routers and update env

- [ ] 3.3.1 Modify `cortex-backend/app/main.py`: import and register `router_chat`, `router_provider_credentials`; add `ENCRYPTION_KEY` to `.env.example`
- [ ] 3.3.2 Add `cryptography` to `cortex-backend/requirements.txt`

---

## Phase 4: Chat UI + Credential Settings + Routing (Work Unit 4)

### 4.1 — Create Zustand chat store

- [x] 4.1.1 (RED) Write `test_chat_store.ts`: test `sendMessage()` appends user message and streams assistant delta, `abort()` stops loading, `error` state on failure, message list accumulation
- [x] 4.1.2 (GREEN) Create `cortex-frontend/src/features/chat/store.ts`: `interface ChatSlice` with `messages: ChatMessage[]`, `isLoading: boolean`, `error: string | null`, `activeProvider: Provider`, `sendMessage(text: string): Promise<void>`, `abort(): void`, `clearMessages(): void`. Use `apiClient.stream()` for SSE. Provider from `credentialsStore`
- [x] 4.1.3 (REFACTOR) Add `useShallow` selectors for `messages` and `isLoading`

### 4.2 — Create provider credentials store

- [x] 4.2.1 (RED) Write `test_credentials_store.ts`: test `fetchCredentials()` populates provider map, `saveCredential()` encrypts key in transit (assert no plaintext in mock), `deleteCredential()` removes from map
- [x] 4.2.2 (GREEN) Create `cortex-frontend/src/features/chat/credentialsStore.ts`: `interface CredentialsSlice` with `providers: Record<Provider, CredentialInfo | null>`, `fetchCredentials()`, `saveCredential(provider, key, label)`, `deleteCredential(provider)`. Expose validation status
- [x] 4.2.3 (REFACTOR) Add `validatedProviders` computed: providers where `validated_at !== null`

### 4.3 — Create ChatPage and ChatSettings components

- [x] 4.3.1 Create `cortex-frontend/src/features/chat/ChatPage.tsx`: `"use client"` component. Render `messageList` (scrollable), `ChatInput` (textarea + send), `ProviderSelector` (dropdown of validated providers). Use `useChatStore` + `useCredentialsStore`. Show loading spinner on `isLoading`
- [x] 4.3.2 Create `cortex-frontend/src/features/chat/ChatSettings.tsx`: credential form per provider (API key input + label + Test button). Show validation result (ready/invalid/failed). DELETE credential with confirmation
- [x] 4.3.3 Wire ChatSettings into ChatPage via settings gear icon

### 4.4 — Update router and layout

- [x] 4.4.1 Modify `cortex-frontend/src/app/router.tsx`: set `/` → `ChatPage`, `/browse` → existing `DashboardPage/BreweryList`
- [x] 4.4.2 Modify `cortex-frontend/src/presentation/layouts/MainLayout.tsx`: nav links: "Chat" (/) and "Browse" (/browse). Active link highlight
- [x] 4.4.3 Add `stream()` method to `cortex-frontend/src/services/api/client.ts` returning `ReadableStream` from `EventSource` parsed SSE

---

## Phase 5: Integration + Verification

- [ ] 5.1 Run full pytest suite: `pytest cortex-backend/ -v`
- [ ] 5.2 Run full Vitest suite: `vitest run cortex-frontend/`
- [ ] 5.3 Manual: save OpenAI credential via ChatSettings → verify "ready" status → send "hello" → verify streaming response → stop → verify content retained
- [ ] 5.4 Manual: reload page → verify conversation is cleared (phase 1 in-memory behavior)
- [ ] 5.5 Manual: verify credential list API never returns `encrypted_api_key`