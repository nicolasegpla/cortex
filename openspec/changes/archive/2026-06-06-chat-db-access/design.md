# Design: Chat Database Access via Server-Side Tools

## Technical Approach

Extend Cortex's chat with a whitelisted tool execution layer that lets LLMs call
read-only brewery query functions. The server intercepts `tool_calls`, executes
them via `BreweryService`, injects results back into the conversation, and
streams the final answer through a single SSE stream — the front end stays
unchanged. OpenAI ships first; other providers fall back to no-tools mode via
`supports_tools()` feature detection.

## Architecture Decisions

| Decision | Options | Tradeoffs | Chosen |
|---|---|---|---|
| Tool execution model | Server-side sync loop vs client-managed async | Sync: simpler, frontend unchanged, single SSE. Async: more interactive but complex client changes | Server-side sync loop |
| Provider rollout | All four at once vs OpenAI-first | All: higher risk, more work. OpenAI-first: ships fast, DeepSeek inherits free (OpenAI-compatible subclass) | OpenAI first; `supports_tools()` gates others |
| Tool Registry design | Class-based vs dict-of-functions | Class: matches ProviderRegistry pattern, typed metadata, testable. Dict: simpler but less structured | Class-based `ToolRegistry` |
| Tool definition format | OpenAI function-calling JSON Schema vs custom | OpenAI: zero-transform for OpenAI/DeepSeek, convertible for Anthropic/Gemini later. Custom: extra mapping layer | OpenAI JSON Schema format |
| Feature flag | `enable_tools` on ChatRequest vs server config | Request-level: per-call control, zero-risk default. Server: simpler but less flexible | `enable_tools: bool = False` |

## Data Flow

```
POST /chat/stream {model, provider, messages, enable_tools: true}
  │
  ├─ enable_tools=False OR not supports_tools()?
  │    └─ adapter.stream_chat(model, messages, key) → SSE deltas → done
  │
  └─ enable_tools=True AND supports_tools()?
       │
       adapter.stream_chat_with_tools(model, messages, tools, key)
         │
         ├─ LLM returns text → SSE deltas → done
         │
         └─ LLM returns tool_calls
              │
              tool_call = extract_fn_name + args
              raw = ToolRegistry.execute(name, args)  ▶ BreweryService.search(...)
              │
              append: {role: assistant, tool_calls}, {role: tool, content: raw}
              │
              adapter.stream_chat_with_tools(model, augmented, tools, key)
                └─ SSE deltas (final answer) → done
```

All tool execution is server-side. The client sees one continuous SSE stream.
Optional meta-event `tool_call` can carry UX hints (e.g., "Fetching breweries…")
without changing the SSE protocol contract.

## File Changes

| File | Action | Description |
|---|---|---|
| `app/tools/__init__.py` | Create | Package init |
| `app/tools/registry.py` | Create | `ToolRegistry`: register, list, execute — mirrors `ProviderRegistry` pattern |
| `app/tools/definitions.py` | Create | `search_breweries` and `count_breweries` tool definitions (name, description, JSON schema, handler ref) |
| `app/tools/breweries.py` | Create | Handler functions calling `BreweryService.search()` / `count()`; receive Supabase client via context |
| `app/adapters/base.py` | Modify | Add `supports_tools() -> bool` (default `False`), `build_tool_payload(tools) -> list[dict]`, `stream_chat_with_tools(...)` abstract |
| `app/adapters/openai.py` | Modify | Implement `supports_tools() → True`, `build_tool_payload()`, `stream_chat_with_tools()` sending OpenAI `tools` param and parsing `tool_calls` from stream chunks |
| `app/adapters/deepseek.py` | Inspect only | Inherits `stream_chat_with_tools` from OpenAI — verify compatibility |
| `app/routers/chat.py` | Modify | Add tool execution loop: detect `tool_calls`, execute via registry, re-stream. Inject `BreweryService` dependency. |
| `app/schemas/chat.py` | Modify | Add `tools: list[ToolDefinition] \| None`, `enable_tools: bool`, `ToolDefinition`, `ToolCall`, `ToolResult` schemas |
| `app/services/brewery_service.py` | Modify | Add `search(city?, country?, operation_type?) -> list[dict]` and `count() -> int` |
| `tests/test_tools_registry.py` | Create | Unit tests for registry: register, execute, missing tool, execution errors |
| `tests/test_tools_breweries.py` | Create | Unit tests for brewery tool handlers with mocked `BreweryService` |
| `tests/test_chat_router.py` | Modify | Integration tests: tool-call path (mock `stream_chat_with_tools` returning `tool_calls`), fallback path, `enable_tools=False` backward compat |
| `tests/test_chat_schemas.py` | Modify | Schema validation: `enable_tools`, `ToolDefinition`, `ToolCall`, `ToolResult` |
| `tests/test_brewery_service.py` | Modify | Tests for `search()` and `count()` with mocked Supabase |
| `tests/test_adapters/test_openai.py` | Modify | Test `build_tool_payload()` output format, `stream_chat_with_tools()` mock |
| `tests/conftest.py` | Modify | Add shared fixtures: `mock_brewery_service`, `mock_tool_registry` |

## Interfaces / Contracts

```python
# ToolDefinition (schemas/chat.py)
class ToolDefinition(BaseModel):
    name: str
    description: str
    parameters: dict  # JSON Schema for function arguments

# ToolRegistry (tools/registry.py)
class ToolRegistry:
    def register(self, definition: ToolDefinition, handler: Callable) -> None: ...
    def list_definitions(self, names: list[str] | None = None) -> list[ToolDefinition]: ...
    def execute(self, name: str, arguments: dict) -> str: ...  # raises ValueError

# Base adapter additions
class LlmProviderAdapter(ABC):
    def supports_tools(self) -> bool: return False  # concrete default
    def build_tool_payload(self, tools: list[ToolDefinition]) -> list[dict]: ...  # abstract
    async def stream_chat_with_tools(
        self, model: str, messages: list[dict], tools: list[ToolDefinition], api_key: str
    ) -> AsyncGenerator[str | ToolCallResult, None]: ...  # abstract new
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit — ToolRegistry | Register, list, execute, missing tool raises `ValueError`, handler raises propagates | `MagicMock` handlers, parametrized error cases |
| Unit — BreweryService | `search()` with city/country/op_type filters, `count()` returns int, empty results | Mock Supabase table chain, assert `.eq()` and `.select()` calls |
| Unit — OpenAIAdapter | `build_tool_payload()` produces correct OpenAI `tools` JSON, `stream_chat_with_tools()` yields deltas and `ToolCallResult` | Mock `AsyncOpenAI.chat.completions.create` stream |
| Unit — Chat schemas | `enable_tools` defaults to `False`, tool definition validation, tool result serialization | Parametrized Pydantic `ValidationError` tests |
| Integration — Chat router | Tool-call path: mock adapter returns `tool_calls`, assert final SSE has `delta` events, assert `done`. No-tools path: verify existing flow unchanged. `enable_tools=False` behaves as before. | `TestClient` with dependency overrides |
| Integration — Tool loop | Two-turn loop: mock first `stream_chat_with_tools` returns tool call, mock second returns text. Assert both calls made, tool result injected. | Fixture composition |

**TDD order**: Schemas → Registry → BreweryService → Adapter base → OpenAI tool stream → Chat router tool loop.

## Migration / Rollout

No database migration required — tool execution is read-only on existing `breweries` table.
`enable_tools` defaults to `False` — existing clients are unaffected. Per-provider rollout:
OpenAI ships first (`supports_tools() = True`). DeepSeek gets it for free (inherits OpenAI adapter).
Anthropic and Gemini require separate implementations in follow-up changes.

## Open Questions

- [ ] Should meta-event SSE types (`tool_call`, `tool_result`) be added in this slice or deferred?
- [ ] Should `BreweryService.search()` return full brewery dicts or a compact projection for tool use?
