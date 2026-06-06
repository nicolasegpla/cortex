# Proposal: Chat Database Access via Server-Side Tools

## Intent

Enable the chat to answer questions about real project data (breweries) by giving LLMs access to safe, whitelisted read-only functions — not unrestricted SQL. Users currently get blind answers; this adds a secure tool layer so models can query actual database data.

## Scope

### In Scope
- **Tool Definition Layer** (`cortex-backend/app/tools/`): Whitelisted read-only brewery query functions
- **Adapter Tool Support**: Extend `LlmProviderAdapter` base with tool schema + execution hooks; implement for OpenAI first
- **Chat Router Tool Loop**: Intercept tool calls in `chat_stream()`, execute tools server-side, re-stream final answer
- **Schema Updates**: Add `tools` field to `ChatRequest`, tool call/result types
- **BreweryService Read Methods**: Add `search()`, `count()` query methods for tool use
- **Backend Tests**: TDD for tool execution, adapter tool serialization, router tool loop

### Out of Scope
- Anthropic/Gemini/DeepSeek tool implementations (triangulated in follow-up)
- Frontend tool-call UI indicators (SSE stream handles it transparently)
- Write operations or non-brewery entities
- LLM-generated SQL or sandboxed query execution
- Row-level security enforcement (future multi-tenancy)

## Capabilities

### New Capabilities
- `llm-tools`: Server-side tool execution layer — whitelisted function definitions, tool registry, execution engine, and adapter tool-schema serialization
- `chat-tool-calling`: Chat endpoint tool-call interception — detects tool calls, executes them, injects results, re-streams final response

### Modified Capabilities
- `provider-adapter`: Extended contract — adapters now support optional tool-enabled streaming (`stream_chat_with_tools`)
- `chat-session`: Chat request schema gains optional `tools` parameter; SSE stream may include `tool_call` meta-events

## Approach

1. **Tool Registry** (`app/tools/registry.py`): Central registry of available tools with name, description, JSON schema, and handler function. Tools are read-only by design.
2. **Base Adapter Extension** (`app/adapters/base.py`): Add `supports_tools()` method and `build_tool_payload()` abstract method for provider-specific schema serialization.
3. **OpenAI Adapter** (`app/adapters/openai.py`): Implement `stream_chat_with_tools()` — sends tool definitions, handles `tool_calls` in response, returns tool call metadata.
4. **Tool Execution Loop** (in `chat.py`): If tools enabled, call adapter → if tool_call returned → execute tool → append result to messages → call adapter again → stream final answer. Entirely server-side; frontend sees one seamless SSE stream.
5. **BreweryService Extensions**: Add `search(city?, country?, operation_type?)` and `count()` methods that BreweryService already has the infrastructure for.
6. **Feature Flag**: `enable_tools` boolean on `ChatRequest`. Defaults to `False`. Providers without tool support silently fall back to standard streaming.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-backend/app/tools/` | New | Tool definitions, registry, execution engine |
| `cortex-backend/app/adapters/base.py` | Modified | Add `supports_tools()`, `build_tool_payload()`, `stream_chat_with_tools()` |
| `cortex-backend/app/adapters/openai.py` | Modified | Implement tool schema + tool-call streaming |
| `cortex-backend/app/routers/chat.py` | Modified | Tool-call interception loop in `chat_stream()` |
| `cortex-backend/app/schemas/chat.py` | Modified | Add `tools`, `ToolDefinition`, `ToolCall`, `ToolResult` schemas |
| `cortex-backend/app/services/brewery_service.py` | Modified | Add `search()` and `count()` read methods |
| `cortex-backend/tests/test_chat_router.py` | Modified | Tool flow test cases |
| `cortex-backend/tests/test_brewery_service.py` | Modified | New query method tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| DeepSeek tool calling unreliable | Medium | Feature-detect via `supports_tools()`; fall back to no-tools mode |
| Streaming loop complexity | Medium | Server-side synchronous loop; frontend sees single SSE stream |
| Token cost from tool schemas | Low | Keep tool schemas minimal; only include enabled tools |
| Auth context in tool execution | Low | Tools run with same user context; no RLS yet but design for it |

## Rollback Plan

- **Feature flag off**: Set `enable_tools=False` (default) — chat behaves exactly as before
- **Code path**: Tool logic is additive; if `tools` list is empty or `enable_tools` is false, router takes the existing `stream_chat()` path unchanged
- **Deployment**: Can disable per-provider by returning `supports_tools() = False`

## Dependencies

- Supabase `breweries` table must exist with data (already in place)
- `pytest-cov` for test coverage (not yet in requirements.txt)
- OpenAI SDK already installed (for function calling support)

## Success Criteria

- [ ] User asks "how many breweries are there?" → LLM calls `count_breweries` tool → returns correct count
- [ ] User asks "list breweries in Bogotá" → LLM calls `search_breweries(city="Bogotá")` → returns filtered results
- [ ] Tool calls are invisible to frontend — single seamless SSE stream
- [ ] All four providers work with `enable_tools=False` (backward compatible)
- [ ] OpenAI works with `enable_tools=True`; others fall back gracefully
- [ ] 100% test coverage on tool execution path (TDD enforced)
