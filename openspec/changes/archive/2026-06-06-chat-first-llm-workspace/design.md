# Design: Chat-First LLM Workspace

## Technical Approach

Custom SSE streaming from FastAPI → Zustand chat store, with Fernet-encrypted provider credentials in Supabase. Frontend promotes chat to `/` index; manual browse moves to `/browse`. Provider-agnostic adapter layer isolates SDK differences. Each PR slice targets one concern under 400 lines.

## Architecture Decisions

| Decision | Option | Tradeoff | Choice |
|----------|--------|----------|--------|
| Streaming protocol | SSE vs AI SDK 5 vs NDJSON | SSE: native Python, easy `TestClient.stream()`. AI SDK: rich client but Node-protocol lock-in. NDJSON: simpler but less browser-native. | **SSE `text/event-stream`** with `event: delta`, `event: done`, `event: error` |
| Encryption | Fernet vs AES-GCM vs envelope | Fernet: built-in rotation via `MultiFernet`, simple API. AES-GCM: manual IV management. Envelope: needs KMS. | **Fernet with version prefix** (`v1:<b64>`). `ENCRYPTION_KEY` from env |
| Provider adapter | ABC vs Protocol vs Dict factory | ABC: explicit contract, runtime checks. Protocol: structural, no import. Dict: no type safety. | **ABC with `stream_chat(model, messages, api_key) -> AsyncGenerator[str]`**. Concrete: OpenAIAdapter, KimiAdapter (reuses OpenAI base), AnthropicAdapter, MinimaxAdapter |
| Credential storage | Supabase RLS vs backend-only filter | RLS: user isolation at DB level, defense-in-depth. Backend filter: simpler but leak-prone. | **Supabase RLS** (`user_id = auth.uid()`) + backend never returns `encrypted_api_key` field |
| Chat session | In-memory vs Supabase table | In-memory: phase-1 simplicity, no migration. Table: cross-session persistence but scope creep. | **In-memory for phase 1** (out of scope per proposal). State lives in Zustand store, vanishes on refresh |

## Data Flow

```
Browser                        FastAPI                        Provider API
─────                          ───────                        ────────────
POST /chat/stream ──────────▶ resolve provider ──▶ decrypt key ──▶ POST (streaming)
    {messages, provider}       │                                    │
                               │  ◀── SSE chunks ──────────────────┘
◀── SSE: event: delta ────────┘
◀── SSE: event: done

Credential CRUD:
Browser ──▶ POST/PUT/DELETE /provider-credentials ──▶ encrypt ──▶ Supabase
◀── {id, provider, label} (no key) ─────────────────────────────┘
```

## File Changes

| File | Action | Purpose |
|------|--------|---------|
| `cortex-backend/app/services/encryption_service.py` | Create | Fernet encrypt/decrypt with versioned ciphertext |
| `cortex-backend/app/services/llm_provider_service.py` | Create | ABC adapter + OpenAI/Kimi/Anthropic/Minimax impls |
| `cortex-backend/app/services/provider_credential_service.py` | Create | Supabase CRUD with user isolation |
| `cortex-backend/app/routers/provider_credentials.py` | Create | `GET/POST/DELETE /provider-credentials`; key excluded |
| `cortex-backend/app/routers/chat.py` | Create | `POST /chat/stream` SSE endpoint |
| `cortex-backend/app/schemas/chat.py` | Create | ChatRequest, ChatEvent |
| `cortex-backend/app/schemas/provider_credentials.py` | Create | CredentialCreate, CredentialResponse (no key) |
| `cortex-backend/sql/005_create_provider_credentials.sql` | Create | Table + RLS + `UNIQUE(user_id, provider)` |
| `cortex-backend/app/main.py` | Modify | Register chat + credential routers |
| `cortex-backend/.env.example` | Modify | Add `ENCRYPTION_KEY` |
| `cortex-backend/requirements.txt` | Modify | Add `cryptography`, `openai`, `anthropic` |
| `cortex-frontend/src/features/chat/store.ts` | Create | Zustand: messages[], stream(), abort(), providerState |
| `cortex-frontend/src/features/chat/ChatPage.tsx` | Create | Chat container: message list + input + provider selector |
| `cortex-frontend/src/features/chat/ChatSettings.tsx` | Create | Provider credential CRUD UI |
| `cortex-frontend/src/app/router.tsx` | Modify | `/` → ChatPage, `/browse` → DashboardPage/BreweryList |
| `cortex-frontend/src/presentation/layouts/MainLayout.tsx` | Modify | Nav: Chat / Browse |
| `cortex-frontend/src/services/api/client.ts` | Modify | Add `stream()` method for SSE consumption |

## Interfaces / Contracts

### Python — Provider Adapter ABC

```python
from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator

class LlmProviderAdapter(ABC):
    @abstractmethod
    async def stream_chat(
        self, model: str, messages: list[dict], api_key: str
    ) -> AsyncGenerator[str, None]: ...
```

### Python — Encryption Service

```python
class EncryptionService:
    def __init__(self, key: bytes | None = None) -> None: ...
    def encrypt(self, plaintext: str) -> str:
        """Returns versioned ciphertext: 'v1:<b64>'""" ...
    def decrypt(self, ciphertext: str) -> str: ...
```

### TypeScript — Chat Store

```typescript
interface ChatSlice {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  activeProvider: Provider;
  sendMessage: (text: string) => Promise<void>;
  abort: () => void;
  clearMessages: () => void;
}
```

### TypeScript — Provider Credentials Store

```typescript
interface CredentialsSlice {
  providers: Record<Provider, CredentialInfo | null>;
  fetchCredentials: () => Promise<void>;
  saveCredential: (provider: Provider, key: string, label?: string) => Promise<void>;
  deleteCredential: (provider: Provider) => Promise<void>;
}
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (Python) | Encryption round-trip, adapter model routing | Pure functions, no I/O. Parametrized per provider |
| Integration (Python) | SSE endpoint, credential CRUD | `TestClient` + `httpx.AsyncClient` for streaming; mock Supabase via `monkeypatch`; Fernet key fixture |
| Unit (FE) | Store actions (send, abort, error), message rendering | Vitest + `@testing-library/react`. Mock `fetch` with `ReadableStream`. Zustand `getState()`/`setState()` |
| Integration (FE) | Chat page flow, settings form save/delete | Mock `apiClient.stream()`; test user event sequences |
| Security | Key never in response, encrypted in DB | Assert response schemas exclude `encrypted_api_key`; assert insert payload is ciphertext |

## Migration / Rollout

1. **SQL migration** (`005_create_provider_credentials`): greenfield table, no data migration needed.
2. **Feature isolation**: chat router and credential router are new — zero impact on existing endpoints.
3. **Navigation**: `/` index changes from Dashboard to Chat; `/browse` preserves original dashboard + breweries tree. Login/register paths unchanged.
4. **Rollback**: revert PR chain in reverse (4→1). Table can stay — no data loss. `ENCRYPTION_KEY` removal after revert breaks nothing (endpoints absent).
5. **Key rotation**: versioned ciphertext (`v1:` prefix) enables `MultiFernet([new_key, old_key])` migration script without downtime.

## Open Questions

- [ ] Confirm `anthropic` SDK async streaming API shape for `AsyncGenerator[str]` compatibility
- [ ] Decide if `VITE_API_BASE_URL` needs `/api` path prefix for chat SSE vs current `/` endpoints
