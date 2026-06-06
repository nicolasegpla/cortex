# Exploration: chat-first-llm-workspace

## Current State

Cortex is a React 19 + Vite frontend and a FastAPI + Supabase backend. The UI today is table-first: the index route renders a static dashboard and the only real workflow is `BreweryList`, a dense data table. Auth is handled by Supabase Auth, with a Zustand store (`useAuthStore`) and a thin `apiClient` that injects the JWT Bearer token.

The backend has a clean modular monolith shape: `routers/`, `services/`, `schemas/`, `core/`. Business logic is tested with `pytest` + `TestClient` + `monkeypatch` against mocked Supabase and service calls. There is no existing chat runtime, no provider credential storage, no encryption layer, and no LLM proxy.

A `features/chat/` folder already exists in the frontend but it is empty (`export {}`), so it is the natural home for the new experience.

## Affected Areas

| Path | Why it is affected |
|------|-------------------|
| `cortex-frontend/src/app/router.tsx` | Must promote chat to the primary route and keep manual search/browse as secondary. |
| `cortex-frontend/src/presentation/layouts/MainLayout.tsx` | Navigation needs to switch from "Dashboard / Breweries" to "Chat / Browse" semantics. |
| `cortex-frontend/src/features/chat/` | Empty folder becomes the main chat feature: store, container, message list, input, provider settings. |
| `cortex-frontend/src/services/api/client.ts` | May need streaming request variant (`fetch` reader) in addition to the current JSON client. |
| `cortex-frontend/package.json` | Likely adds `@ai-sdk/react` (if we adopt the transport pattern) or stays lean with custom SSE. |
| `cortex-backend/app/main.py` | Must register new routers: chat stream and provider credentials. |
| `cortex-backend/app/routers/chat.py` | New streaming LLM endpoint; receives messages, resolves provider, decrypts key, returns SSE. |
| `cortex-backend/app/routers/provider_credentials.py` | New endpoints to save/list/delete credentials; key must never be returned. |
| `cortex-backend/app/services/llm_provider_service.py` | New provider-adapter layer (OpenAI, Kimi, Anthropic, Minimax). |
| `cortex-backend/app/services/encryption_service.py` | New Fernet/AES-GCM service for API-key encryption at rest. |
| `cortex-backend/app/services/provider_credential_service.py` | Supabase CRUD for `provider_credentials`; enforces user isolation. |
| `cortex-backend/app/schemas/chat.py` | Request/response schemas for chat and streaming events. |
| `cortex-backend/app/schemas/provider_credentials.py` | Schemas that explicitly exclude the encrypted key from responses. |
| `cortex-backend/sql/005_create_provider_credentials.sql` | New migration: table, indexes, RLS. |
| `cortex-backend/requirements.txt` | Adds `cryptography`, `openai`, and `anthropic`; possibly `httpx` is already present. |
| `cortex-backend/.env.example` | Adds `ENCRYPTION_KEY` (32-byte base64). |
| `cortex-backend/tests/` | New test modules for chat router, credentials router, encryption, and provider service. |

## Candidate Data Model: Provider Credentials

```sql
CREATE TABLE public.provider_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('kimi','openai','minimax','anthropic')),
    encrypted_api_key TEXT NOT NULL,
    label TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, provider)
);

ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_credentials" ON public.provider_credentials
    FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

Backend encrypts `api_key` with `cryptography.fernet.Fernet` using a per-tenant `ENCRYPTION_KEY` before inserting. The key is decrypted only inside the LLM service when building the outbound provider request. List endpoints return only `id`, `provider`, `label`, `is_default`, `created_at`, `updated_at`.

## Approaches

### 1. Vercel AI SDK v5 on frontend + custom Python stream adapter
Use `@ai-sdk/react` `useChat` with a `DefaultChatTransport` pointing at `/api/chat`. The FastAPI backend returns an AI-SDK-compatible data stream (the protocol is documented in the v5 transport source).

- **Pros:** Modern message-part model out of the box; handles optimistic UI, abort, and error states; aligns with the `ai-sdk-5` skill.
- **Cons:** FastAPI must reverse-engineer and remain compatible with a Node-first protocol; no official Python implementation; easy to drift on SDK upgrades.
- **Effort:** High.

### 2. Custom Zustand chat store + lightweight SSE/NDJSON backend (recommended)
Build a small chat store in `features/chat/store.ts` that appends streamed chunks manually. The backend returns `text/event-stream` or NDJSON lines (`event: delta`, `event: done`).

- **Pros:** No protocol lock-in; works naturally with Python generators; easier to test end-to-end; minimal new dependencies.
- **Cons:** More frontend code for streaming, abort, and error UI; no free tool-calling scaffolding (acceptable for phase 1).
- **Effort:** Medium.

### 3. LangChain/LangGraph Python orchestration with custom frontend
Use `langchain` adapters to stream from multiple providers, then translate to a simple JSON stream.

- **Pros:** Mature abstraction for multi-provider routing.
- **Cons:** Adds a heavy dependency not currently in the project; still requires custom frontend stream handling; overkill for a first chat slice.
- **Effort:** High.

## Recommendation

Adopt **Approach 2** for the first slice.

Reasoning:
- The backend is Python, and the project does not use Next.js, so most of the Vercel AI SDK server value is unavailable.
- Custom SSE keeps the stack aligned with existing FastAPI patterns and makes strict TDD easier (clear request/response units, no opaque transport protocol).
- We can still adopt `@ai-sdk/react` later if we migrate to a Node edge service; the frontend store boundary makes that swap localized.

Implementation outline:
1. Add `cryptography` and provider SDKs (`openai`, `anthropic`) to requirements.
2. Create `provider_credentials` table with RLS and the encryption service test-first.
3. Build provider adapter interface; start with OpenAI, then Kimi (OpenAI-compatible base URL), Anthropic, and Minimax.
4. Add `/provider-credentials` endpoints that accept keys but never return them.
5. Add `/chat` SSE endpoint that reads user credentials, decrypts the key, streams the LLM response.
6. Replace the dashboard index with a `ChatPage`; move manual workflows under a "Browse" nav item.
7. Keep breweries as the first fallback manual view; later client entities follow the same pattern.

## Risks

- **Encryption key rotation:** Fernet makes rotation hard; we should version ciphertext (prepend a key version) even in the first schema so rotation is possible later.
- **Credential leakage:** Any logging in the LLM service or middleware could capture decrypted keys. Tests must verify that credential schemas exclude `encrypted_api_key` from responses.
- **Provider API drift:** Kimi and Minimax advertise OpenAI compatibility but behavior differs (headers, stop reasons, rate limits). The adapter layer must isolate these differences.
- **Streaming test complexity:** Testing SSE requires reading `response.iter_lines()` or similar in pytest; we need stable fixtures for this.
- **Scope exceeds review budget:** This initiative touches frontend routes, backend routers, services, schemas, migrations, dependencies, and tests. The 400-line PR budget will be exceeded quickly; plan chained PRs from the start (credentials → provider adapters → chat UI → integration).

## Ready for Proposal

**Yes.** The codebase has a clear feature folder for chat, an established service/router test pattern, and Supabase as the data layer. The main open decisions for the proposal are:
1. Whether to persist chat messages/sessions in phase 1 or keep the thread in-memory.
2. The exact streaming event shape (minimal SSE vs NDJSON).
3. The chained-PR slicing order, given the 400-line review budget.
