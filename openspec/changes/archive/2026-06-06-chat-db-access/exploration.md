## Exploration: Chat Database Access

### Current State

Cortex's chat is a **pure pass-through streaming architecture**:

1. **Frontend** (`ChatPage.tsx` → `store.ts`): User types a message → Zustand store appends to message list → sends POST `/chat/stream` with `{model, provider, messages}` via `apiClient.stream()` → reads SSE events (`delta`, `done`, `error`) → renders assistant response incrementally.

2. **Backend** (`chat.py` router): Receives `ChatRequest` → resolves provider adapter via `registry.get_adapter()` → decrypts user's API key from `provider_credentials` table → calls `adapter.stream_chat(model, messages, api_key)` → yields SSE text deltas directly to the client.

3. **Adapters** (`base.py`, `openai.py`, etc.): Normalize provider SDKs behind `stream_chat()` interface. No tool/function support currently.

**Database layer**: Supabase is the sole data store. `BreweryService` is the only fully-implemented entity service with CRUD on the `breweries` table. `EntityService` and `entities` router are stubs (return 501). `ProviderCredentialService` manages encrypted API keys.

**Auth**: JWT via Supabase Auth, role-based (`super_admin`, `operativo`). All routes require `get_current_user`.

**Testing**: Strict TDD enforced. Backend tests use `TestClient` + mocked Supabase client + monkeypatch for services. Frontend uses `vitest` + `@testing-library/react`.

### Affected Areas

- `app/routers/chat.py` — needs tool-call interception in the streaming loop
- `app/adapters/base.py` — needs tool schema + tool execution hooks
- `app/adapters/openai.py`, `anthropic.py`, `gemini.py`, `deepseek.py` — need function-calling implementations
- `app/services/brewery_service.py` — needs read-only query methods for tool use
- `app/schemas/chat.py` — needs tool definitions, tool call request/response schemas
- `app/services/llm_provider_service.py` — needs tool-enabled adapter resolution
- `cortex-frontend/src/features/chat/store.ts` — needs to handle tool-call meta-events in SSE stream
- `cortex-frontend/src/features/chat/ChatPage.tsx` — optional: show "looking up data" indicators
- `tests/test_chat_router.py` — needs new test cases for tool flows
- `tests/test_brewery_service.py` — needs tests for new query methods

### Approaches

#### 1. **Server-Side Function Calling (Tools Layer)** — RECOMMENDED
Add a guarded tool layer where the backend registers predefined safe functions (e.g., `list_breweries`, `search_breweries_by_city`, `count_breweries`). The LLM decides when to call them; the backend executes via existing services and returns structured results.

- **Pros**:
  - No unrestricted SQL — LLM can only invoke whitelisted functions
  - Leverages existing `BreweryService` and auth layer
  - Supported by all current providers (OpenAI/Anthropic/Gemini/DeepSeek)
  - Natural extension of adapter pattern — each adapter translates tool schemas to provider format
  - Testable: mock tool execution, assert correct function calls
- **Cons**:
  - Streaming becomes multi-turn (user → LLM → tool call → backend execution → LLM → final response)
  - Not all models handle function calling equally (DeepSeek support is newer)
  - Increases token usage (tool definitions in system prompt)
  - Requires per-adapter implementation of tool schema serialization
- **Effort**: Medium

#### 2. **Hardcoded Query Templates (Parameterized Queries)**
The backend parses the user's intent via lightweight NLP/regex, selects a pre-built parameterized query, executes it against Supabase, and injects results into a prompt template for the LLM.

- **Pros**:
  - Very safe — no LLM-generated queries at all
  - Simple to implement and test
  - Predictable performance
- **Cons**:
  - Inflexible — only handles predefined question patterns
  - Poor UX — "I can only answer questions about X, Y, Z"
  - Doesn't scale as entities/tables grow
  - Defeats the purpose of using an LLM
- **Effort**: Low

#### 3. **LLM-Generated SQL with Sandboxing**
Allow the LLM to generate SQL, but run it through a strict validator/allowlist (e.g., only SELECT, only specific tables, query timeout, row limits).

- **Pros**:
  - Maximum flexibility — user can ask any question
  - Minimal backend code
- **Cons**:
  - Security risk — prompt injection could bypass allowlists
  - Hard to test thoroughly — edge cases in SQL parsing are endless
  - DeepSeek and other providers may generate less reliable SQL
  - Violates the user's explicit constraint: "DO NOT use unrestricted SQL as the default recommendation"
- **Effort**: Medium-High (mostly spent on security hardening)

### Recommendation

**Approach 1: Server-Side Function Calling (Tools Layer)**.

This is the sweet spot for cortex: it provides real value (the LLM can answer "How many breweries are in Bogotá?" or "List breweries that use Cascade hops"), stays secure (whitelisted functions only), and fits the existing architecture. The adapter pattern was built for this kind of extension.

**Minimum Viable Slice (MVP)**:
1. **Tool Definition Layer**: Create `app/tools/` with `brewery_tools.py` exposing:
   - `list_breweries()` — returns all breweries
   - `search_breweries(city=None, country=None, operation_type=None)` — filtered search
   - `get_brewery_by_id(id)` — single brewery
   - `count_breweries()` — total count
2. **Adapter Enhancement**: Extend `LlmProviderAdapter` with `stream_chat_with_tools()` method. Implement for **OpenAI first** (best function-calling support), then triangulate to Anthropic/Gemini.
3. **Chat Router Modification**: In `chat_stream()`, detect if tools are enabled. If the LLM returns a `tool_call`, execute the tool, append result to messages, and re-stream the final response.
4. **Schema Updates**: Add `tools` field to `ChatRequest`, `ToolCall`, `ToolResult` schemas.
5. **Frontend**: Minimal change — just pass `enable_tools: true` flag. The SSE stream already supports multi-turn; we just need a `tool_call` event type for UI feedback (optional for MVP).
6. **Tests**: 
   - Test that `list_breweries` tool is called when user asks "how many breweries"
   - Test that tool results are injected back into the conversation
   - Test that unauthorized tool calls are rejected
   - Test each adapter's tool schema serialization

### Risks

- **Provider parity**: DeepSeek's function calling may be less reliable than OpenAI/Anthropic. We should feature-detect and gracefully fall back to no-tools mode.
- **Streaming complexity**: SSE is currently simplex (one stream). Tool calling requires a request-response-request loop. We need to either buffer the first stream, make it appear seamless to the frontend, or redesign the protocol.
- **Token cost**: Tool definitions in every request increase token usage. Keep tool schemas minimal.
- **Auth leakage**: Tool execution must run with the same user context. `BreweryService` currently doesn't enforce row-level security — it reads all rows. If multi-tenancy is added later, tools must respect it.
- **Testing complexity**: Mocking tool calls across adapters is verbose. We should build shared test fixtures.

### Ready for Proposal

**Yes** — with the following clarifications for the user:
1. Should the first slice support **all four providers** with tools, or start with **OpenAI only** and expand?
2. Should tool execution be **synchronous** (backend blocks until done, then streams final answer) or **asynchronous** (backend sends `tool_call` event to frontend, frontend polls/waits)?
3. Are there **other tables** besides `breweries` that should be in the first tool set, or is breweries-only acceptable for MVP?
