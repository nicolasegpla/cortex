# Design: Hermes Direct Chat Integration

## Technical Approach

Swap the transport layer in `store.ts` from `apiClient.stream('/chat/stream', ...)` to a new `hermesClient.streamChat({ model, messages, signal })` async generator. The store keeps its Zustand state, UI contract, and legacy `readSSEChunks` for rollback compatibility. The Hermes client encapsulates OpenAI SSE parsing, error classification, and AbortController signal wiring — fixing the current bug where the signal is never passed to `fetch`.

## Architecture Decisions

| Decision | Options considered | Choice | Rationale |
|----------|-------------------|--------|-----------|
| Client shape | AsyncGenerator vs. callback | `async function* streamChat()` → `AsyncGenerator<string>` | Consistent with existing store iteration pattern; no extra deps |
| SSE parser location | Inline in store vs. in client | In Hermes client; store receives plain text deltas | Separation of concerns; store no longer parses SSE |
| `readSSEChunks` fate | Remove vs. keep | Keep in store, unused by Hermes path | Rollback requires it; zero cost |
| Error model | Typed class vs. plain Error | `HermesError { type: 'http'\|'network', status?: number }` | Store can distinguish HTTP 401 from network failure from abort (silent) |
| AbortController signal | Global vs. per-call param | Passed as `signal: AbortSignal` to `streamChat` | Per-call isolation; store already creates one per `sendMessage` |
| Auth token | Env var vs. inline | Hardcoded `hermes-railway-2026` used as `Authorization: Bearer` in client, demarcated `// TEMPORARY: shared test key` | Spec requirement; isolates for later replacement |
| Model catalog | Simplify vs. keep | Unchanged — `PROVIDER_MODELS`, `MODEL_PROVIDER_MAP`, `activeProvider` persist | UI still shows providers; backend path coexists |

## Data Flow

```
User input → ChatPage → useChatStore.sendMessage()
    │
    ├─ Build messages array
    ├─ Create AbortController
    ├─ hermesClient.streamChat({ model, messages, signal })
    │   ├─ POST { model, messages, stream: true }
    │   ├─ Headers: Authorization, Content-Type
    │   ├─ fetch(url, { signal })→ ← AbortController fixed
    │   ├─ Parse SSE: data: {...}→ choices[0].delta.content
    │   └─ Yield text deltas (yield content;)
    │
    ├─ for await (const delta of generator)
    │   └─ Append to assistant message → set() to store
    │
    └─ Complete: set({ isLoading: false })
    └─ HermesError: set({ error: ..., isLoading: false })
    └─ Abort: signal aborted → fetch terminates → generator stops
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/services/hermes/client.ts` | Create | `streamChat()`, `parseSSEChunks()`, `HermesError` class |
| `src/services/hermes/client.test.ts` | Create | Unit tests: mocked fetch, SSE chunks, abort, errors |
| `src/features/chat/store.ts` | Modify | Replace `apiClient.stream()` call with `streamChat()`; iterate text deltas |
| `src/features/chat/store.test.ts` | Modify | Mock `hermesClient` async generator instead of `apiClient.stream` |
| `.env.example` | Modify | Add `VITE_HERMES_CHAT_URL=https://hermes-railway-production-dfdb.up.railway.app` |

## Interfaces / Contracts

```typescript
// services/hermes/client.ts

interface StreamChatParams {
  model: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  signal?: AbortSignal;
}

class HermesError extends Error {
  type: 'http' | 'network';
  status?: number;  // present only for 'http'
}

async function* streamChat(params: StreamChatParams): AsyncGenerator<string, void, undefined>;
```

Store integration (key change within `sendMessage`):
```typescript
// OLD: const stream = await apiClient.stream('/chat/stream', payload);
// OLD: for await (const chunk of readSSEChunks(stream)) { ... }

const generator = streamChat({
  model: state.activeModel,
  messages: messages.map(m => ({ role: m.role, content: m.content })),
  signal: abortController.signal, // ← BUG FIXED: signal reaches fetch
});

for await (const delta of generator) {
  if (abortController.signal.aborted) break;
  assistantContent += delta;
  set({ messages: [...messages, { role: 'assistant', content: assistantContent }] });
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (client) | SSE parsing (standard chunk, `[DONE]`, ignore non-data lines), abort terminates fetch (signal aborted event), HTTP 401/500 → `HermesError`, network failure → `HermesError`, `Authorization` header present | Vitest + mocked global `fetch` + fake `ReadableStream` |
| Unit (store) | `streamChat` called with model+messages+signal, text deltas append correctly, `HermesError` sets store.error, abort stops loading | Vitest + `vi.mock('@/services/hermes/client')` |
| Integration | ChatPage sends message → response streams to UI | Existing ChatPage test adapts mock |

## Migration / Rollout

No data migration. **Rollback**: revert `store.ts` `sendMessage` to call `apiClient.stream('/chat/stream', ...)` with `readSSEChunks`, delete `src/services/hermes/`. Backend `/chat/stream` remains untouched.

## Open Questions

- [ ] Confirm live Hermes endpoint returns `choices[0].delta.content` + `data: [DONE]` before implementing parser
- [ ] Validate model IDs Hermes accepts (direct `gpt-4o` vs. internal alias)
