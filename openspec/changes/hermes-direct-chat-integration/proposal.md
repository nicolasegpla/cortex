# Proposal: Direct Hermes Railway Chat Integration

## Intent

Replace the backend-mediated chat transport (`POST /chat/stream` → Cortex SQL orchestrator) with a direct frontend-to-Hermes call to `POST /v1/chat/completions`. This eliminates the unnecessary backend hop, uses Hermes' native OpenAI-compatible SSE format, and serves as a test integration for the direct-provider architecture.

## Scope

### In Scope
- New `hermes/client.ts` service: `streamChat({ model, messages, signal })` with OpenAI-compatible SSE parsing
- `store.ts` transport swap: call Hermes client instead of `apiClient.stream('/chat/stream', ...)`
- AbortController fix: wire `signal` into `fetch` so cancellation actually terminates the HTTP request
- `VITE_HERMES_CHAT_URL` env var for configurable Hermes endpoint
- Static `Authorization: Bearer hermes-railway-2026` header (temporary test integration; NOT production-safe)
- Unit tests for Hermes client (mocked fetch, SSE chunks, abort)

### Out of Scope
- Session key exchange flow or per-user key rotation
- Model ID mapping / catalog discovery
- Provider credential UI removal (deferred until Hermes path is verified)
- Backend `/chat/stream` router deprecation (separate cleanup change)
- Conversation truncation or summarization for large histories
- Backend-side changes

## Capabilities

> Contract with sdd-spec.

### New Capabilities
- `hermes-chat-client`: Dedicated Hermes client service with OpenAI-compatible SSE streaming, AbortController wiring, and configurable base URL. Covers transport, parsing, and abort behavior.

### Modified Capabilities
- `chat-session`: Requirement "Backend-Mediated Multi-Provider Chat" changes to direct frontend-to-Hermes transport. The browser now sends chat requests directly to Hermes Railway. The "Prevent direct provider access" scenario is replaced by "Static-bearer-authenticated direct Hermes access." All other chat-session requirements (workspace entry, model-as-source-of-truth, conversation states, stop/reload behavior) remain unchanged.

## Approach

**Swap the transport layer, not the UI/store boundary.** The Zustand store keeps message state, loading/error flags, and AbortController lifecycle. A new `hermes/client.ts` module encapsulates:
1. Building the OpenAI-compatible payload (`{ model, messages, stream: true }`)
2. Setting `Authorization: Bearer hermes-railway-2026` and `Content-Type: application/json`
3. Calling `fetch` with the `AbortController.signal`
4. Parsing OpenAI-style SSE (`data: {...}` lines, `data: [DONE]` terminator) into an async generator of text deltas

The store calls this generator and appends deltas to the assistant message exactly as it does today. The SSE format change is the only parsing difference.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-frontend/src/services/hermes/client.ts` | New | Hermes client with SSE streaming and abort |
| `cortex-frontend/src/services/hermes/client.test.ts` | New | Unit tests for client |
| `cortex-frontend/src/features/chat/store.ts` | Modified | Transport swap, AbortController signal wiring |
| `cortex-frontend/src/features/chat/store.test.ts` | Modified | Mock Hermes client instead of apiClient |
| `cortex-frontend/.env.example` | Modified | Add `VITE_HERMES_CHAT_URL` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CORS blocks frontend origin | Medium | Verify Hermes Railway CORS config before implementation; client handles error state |
| SSE format differs from OpenAI spec | Low | Client parser handles both `data: {...}` and `[DONE]`; test with real endpoint first |
| Shared static bearer token = shared memory/access across users | High | **Explicitly documented as NOT production-safe.** Acceptable for test integration only. |
| AbortController still leaks on error | Low | Signal wired into fetch; test abort behavior explicitly |
| Full message history hits token limits | Medium | Document as known limitation; truncation is a follow-up |

## Rollback Plan

1. Revert `store.ts` to call `apiClient.stream('/chat/stream', ...)` — the backend path remains unchanged
2. Remove `hermes/client.ts` and `hermes/client.test.ts`
3. Remove `VITE_HERMES_CHAT_URL` from `.env.example`
4. No database or backend migration required

## Dependencies

- Hermes Railway `/v1/chat/completions` endpoint must be reachable and CORS-enabled for the frontend origin
- Hermes must accept `Authorization: Bearer hermes-railway-2026` and return OpenAI-compatible SSE

## Open Questions

1. **SSE payload shape**: Does Hermes stream `chat.completion.chunk` with `delta.content` or a custom structure? Confirm before writing the parser.
2. **Model catalog**: What model IDs does Hermes expose? Does `gpt-4o` map directly or need aliases?
3. **Error format**: Does Hermes return SSE error events or HTTP status codes for failures?

## Success Criteria

- [ ] Chat messages send full history directly to Hermes and receive streamed responses
- [ ] Stop button terminates the HTTP request (verified via network tab — no pending fetch after stop)
- [ ] Hermes client unit tests pass with mocked SSE chunks and abort scenarios
- [ ] No regression in chat UI behavior (loading states, error display, message append)
- [ ] `VITE_HERMES_CHAT_URL` configurable; default points to production Railway URL
