# Tasks: chat-db-access

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650-900 (new + modified across 16 files) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No (orchestrator resolved: force-chained, feature-branch-chain)
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema + Tool Registry + Brewery handlers | PR 1 | Base: main; 5 new files + 1 modified |
| 2 | Adapter tool support + schemas wiring | PR 2 | Base: PR1; modifies adapters + schemas |
| 3 | Chat router tool loop + integration tests | PR 3 | Base: PR 2; final wiring + tests |

## Phase 1: Foundation — Schemas + Tool Registry + Brewery Handlers

- [x] 1.1 RED: Write failing test `tests/test_chat_schemas.py` — `enable_tools: bool` defaults to `False`, `ToolDefinition` validates, `ToolCall` and `ToolResult` serialize correctly
- [x] 1.2 GREEN: Add `enable_tools: bool`, `ToolDefinition`, `ToolCall`, `ToolResult` to `app/schemas/chat.py`
- [x] 1.3 RED: Write failing test `tests/test_tools_registry.py` — `register()`, `list_definitions()`, `execute()` raises `ValueError` on missing tool
- [x] 1.4 GREEN: Create `app/tools/__init__.py` and `app/tools/registry.py` with `ToolRegistry` class
- [x] 1.5 RED: Write failing test `tests/test_tools_breweries.py` — handlers call `BreweryService` with correct filters, return serialized dict
- [x] 1.6 GREEN: Create `app/tools/definitions.py` with `search_breweries` and `count_breweries` tool definitions (OpenAI JSON Schema format)
- [x] 1.7 GREEN: Create `app/tools/breweries.py` with handler functions calling `BreweryService.search()` / `count()`
- [x] 1.8 REFACTOR: Register brewery tools in `ToolRegistry` at module level

## Phase 2: Adapter Tool Support

- [x] 2.1 RED: Write failing test `tests/test_adapters/test_openai.py` — `build_tool_payload()` outputs correct OpenAI `tools` JSON, `supports_tools()` returns `True`
- [x] 2.2 GREEN: Add `supports_tools() → bool` (default `False`) and `build_tool_payload(tools) → list[dict]` to `app/adapters/base.py` `LlmProviderAdapter`
- [x] 2.3 GREEN: Implement `supports_tools() → True` and `build_tool_payload()` in `app/adapters/openai.py`
- [x] 2.4 RED: Write failing test `tests/test_adapters/test_openai.py` — `stream_chat_with_tools()` yields deltas and `ToolCallResult`
- [x] 2.5 GREEN: Add abstract `stream_chat_with_tools()` to `app/adapters/base.py` and implement in `app/adapters/openai.py`
- [x] 2.6 REFACTOR: Verify DeepSeek inherits `stream_chat_with_tools` from OpenAI adapter correctly

## Phase 3: Chat Router Tool Loop + Integration

- [ ] 3.1 RED: Write failing test `tests/test_brewery_service.py` — `search(city?, country?, op_type?)` calls Supabase with correct `.eq()` filters, `count()` returns `int`
- [ ] 3.2 GREEN: Add `search()` and `count()` methods to `app/services/brewery_service.py`
- [ ] 3.3 RED: Write failing test `tests/test_chat_router.py` — tool-call path: mock adapter returns `tool_calls`, assert final SSE has delta events
- [ ] 3.4 GREEN: Modify `app/routers/chat.py` — add tool execution loop: detect `tool_calls`, execute via registry, re-stream with augmented messages
- [ ] 3.5 GREEN: Add `conftest.py` fixtures `mock_brewery_service`, `mock_tool_registry`
- [ ] 3.6 INTEGRATION: Verify two-turn tool loop (mock first returns tool_call, second returns text), assert both calls made and tool result injected
- [ ] 3.7 VERIFY: `enable_tools=False` path unchanged (backward compat) — existing tests pass

## Phase 4: Cleanup

- [ ] 4.1 Update module docstrings for `app/tools/`, `app/adapters/base.py`
- [ ] 4.2 Remove any temporary mock stubs used during development
