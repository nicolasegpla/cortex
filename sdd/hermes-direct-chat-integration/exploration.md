## Exploration: Direct Hermes Railway chat integration from the frontend

### Current State

The chat path is **backend-mediated** today:

- **Frontend entry:** `cortex-frontend/src/features/chat/ChatPage.tsx` renders messages and delegates sending to `useChatStore.sendMessage()`.
- **Frontend state/transport:** `cortex-frontend/src/features/chat/store.ts` keeps `messages`, `isLoading`, `error`, `activeProvider`, `activeModel`, and an `_abortController`. On send it calls `apiClient.stream('/chat/stream', { model, messages, provider, enable_tools: true })` and parses custom SSE events (`event: delta`, `event: done`, `event: error`) with its own `readSSEChunks` generator.
- **API client:** `cortex-frontend/src/services/api/client.ts` has a generic `stream(endpoint, body)` helper that POSTs to `VITE_API_BASE_URL`, attaches the Supabase `Authorization: Bearer <jwt>` header, and returns `response.body` as a `ReadableStream`.
- **Backend entry:** `cortex-backend/app/routers/chat.py` exposes `POST /chat/stream`. It validates the Supabase JWT, fetches the decrypted provider API key from Supabase via `ProviderCredentialService`, resolves the provider adapter, and runs `SqlOrchestrator`.
- **Backend orchestrator:** `cortex-backend/app/orchestrators/sql_orchestrator.py` introspects the Supabase schema, asks the LLM for a read-only `SELECT`, validates it, executes it, and asks the LLM to synthesize a natural-language answer, then streams it back as SSE.
- **Credentials:** `cortex-frontend/src/features/chat/credentialsStore.ts` and `ChatSettings.tsx` manage per-provider API keys through backend endpoints (`/provider-credentials`).

Important existing issue: the store creates an `AbortController` but **never passes its signal to `fetch`**, so abort only breaks the local chunk loop; the HTTP request keeps running.

No Hermes integration, env var, or prior art exists in the repo yet.

### Affected Areas

- `cortex-frontend/src/features/chat/store.ts` — switch transport target, payload shape, SSE format, and AbortController wiring.
- `cortex-frontend/src/services/api/client.ts` — current `stream()` is coupled to the Cortex backend URL and does not accept custom headers, external URLs, or signals.
- `cortex-frontend/src/features/chat/credentialsStore.ts` and `ChatSettings.tsx` — per-provider API key UI/storage becomes chat-irrelevant if Hermes owns providers; likely replaced by session-key configuration or removed.
- `cortex-frontend/src/features/auth/store.ts` — `user.id` is the natural value for `X-Hermes-Session-Key`, unless Hermes requires an exchanged token.
- `cortex-backend/app/routers/chat.py` and the SQL orchestrator stack — become unused for the chat UI; should be deprecated/removed in a follow-up to avoid dead-code maintenance.
- `cortex-frontend/.env.example` — needs a Hermes URL env var (e.g. `VITE_HERMES_CHAT_URL`).
- `cortex-frontend/src/features/chat/store.test.ts` and `client.test.ts` — mocks and assertions must change for the new transport and SSE format.

### Approaches

1. **Direct fetch inside the store (minimal change)**
   - Replace `apiClient.stream('/chat/stream', ...)` with an inline `fetch` to `https://hermes-railway-production-dfdb.up.railway.app/v1/chat/completions`.
   - Keep OpenAI-style SSE parsing inline.
   - **Pros:** fewest files touched, fastest spike.
   - **Cons:** store becomes harder to test, no reusable client, duplicated streaming logic, harder to mock in tests.
   - **Effort:** Low

2. **Dedicated Hermes client service (recommended)**
   - Create `cortex-frontend/src/services/hermes/client.ts` with a `streamChat({ model, messages, signal })` function.
   - The client builds the OpenAI-compatible payload, sets `X-Hermes-Session-Key`, wires `AbortController` signal, and exposes an async generator that yields parsed text deltas.
   - `store.ts` keeps message/state logic and calls the new client.
   - **Pros:** clear separation, easy to unit-test, reusable across features, local dev/staging URLs configurable via env var.
   - **Cons:** one new module and matching test file.
   - **Effort:** Medium

3. **Adopt Vercel AI SDK 5**
   - Add `@ai-sdk/react` and use `useChat` with `DefaultChatTransport` pointing at Hermes.
   - **Pros:** handles streaming state, abort, and React integration out of the box.
   - **Cons:** new dependency, SDK expects `UIMessage`/`parts` shape and data-stream responses that may not match Hermes' raw OpenAI SSE, conflicts with existing Zustand store design, heavier refactor.
   - **Effort:** Medium–High

### Recommendation

Go with **Approach 2: dedicated Hermes client service**.

- Keep the existing Zustand message store and UI; only swap the transport layer.
- Introduce `VITE_HERMES_CHAT_URL` (default to the Railway URL) so local/dev/staging are not hardcoded to production.
- For `X-Hermes-Session-Key`, prefer an exchange flow: the frontend sends its Supabase JWT to a small backend endpoint that returns a short-lived Hermes session key. This preserves the auth boundary and avoids exposing a long-lived secret in the browser. If Hermes accepts the raw Supabase `user.id`, use that as a fallback but document the spoofing risk.
- Wire the `AbortController` signal into `fetch` so cancellation actually terminates the request.
- Keep the old `/chat/stream` backend path behind a feature flag or remove it after the Hermes path is verified, to avoid maintaining dead code.

### Risks

- **CORS:** Hermes Railway must allow the frontend origin and the `X-Hermes-Session-Key` header; otherwise the browser blocks the request.
- **SSE format mismatch:** Hermes likely streams standard OpenAI `data: {...}` lines ending with `data: [DONE]`, not the current `event: delta` format. The parser must be rewritten.
- **Auth boundary change:** Moving from backend-verified Supabase JWT + encrypted provider keys to a frontend-sent session key changes the threat model; the session key source and rotation must be defined.
- **AbortController not wired today:** even the existing implementation leaks the HTTP request on stop; this must be fixed as part of the move.
- **Model IDs:** The frontend currently tracks provider-specific IDs (`gpt-4o`, `claude-...`, `gemini-...`, `deepseek-...`). Hermes may expose a different catalog or aliases; a mapping layer may be needed.
- **History payload growth:** Sending the full `messages` array on every request increases latency/cost and may hit token limits; conversation truncation or summarization may be needed later.
- **Dead backend code:** The SQL orchestrator and chat router become unused for chat; leaving them in creates maintenance overhead.
- **Testing:** mocking `fetch`, `ReadableStream`, `AbortController`, and OpenAI SSE chunks in jsdom/Vitest is non-trivial.

### Ready for Proposal

Yes. The orchestrator should tell the user:

- The current chat is backend-mediated through `POST /chat/stream` with custom SSE events.
- The recommended path is a thin Hermes client in the frontend that posts to Hermes' `/v1/chat/completions`, sends full history, uses `X-Hermes-Session-Key`, and wires `AbortController`.
- Open questions before spec/design: how is `X-Hermes-Session-Key` issued/validated by Hermes, what is the exact SSE payload shape, and what model catalog does Hermes expose?
