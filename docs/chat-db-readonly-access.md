# Chat DB Read-Only Access

Current chat-to-database access is implemented through a server-side tool layer that is intentionally limited to read-only brewery queries. Future expansion can reach more tables, but EVERY new table must be exposed through the same read-only, whitelisted pattern. Raw SQL is not allowed.

## Quick path

1. Read this doc for the current architecture and extension rules.
2. Check `cortex-backend/app/routers/chat.py` for the tool execution loop.
3. Check `cortex-backend/app/tools/registry.py` and `cortex-backend/app/tools/breweries.py` for the current whitelist pattern.
4. Extend one table at a time with strict TDD.

## Answer first

| Topic | Current decision |
| --- | --- |
| Current scope | Breweries only |
| Access mode | Read-only |
| Query model | Server-side whitelisted tools |
| SQL from chat | Forbidden |
| Tool registration | Explicit, per tool |
| Default for future tables | Not exposed until explicitly added |
| Security posture | Read-only by default, least privilege, no arbitrary database execution |

## What is implemented today

The current MVP supports database-backed chat answers only for the `breweries` table.

Today the backend exposes exactly two approved tools:

| Tool | Purpose | Backend path |
| --- | --- | --- |
| `search_breweries` | Search breweries by `city`, `country`, or `operation_type` | `cortex-backend/app/tools/definitions.py`, `cortex-backend/app/tools/breweries.py` |
| `count_breweries` | Return the total brewery count | `cortex-backend/app/tools/definitions.py`, `cortex-backend/app/tools/breweries.py` |

Important boundaries:

- This is NOT generic database access.
- This does NOT expose all Supabase tables.
- This does NOT allow writes, updates, deletes, inserts, or raw query text from the model.
- Tool calling is used only when `enable_tools=true` and the selected adapter supports tools.

## How the chat-to-DB tool layer works

### Flow

1. The client sends `POST /chat/stream` with chat messages and `enable_tools=true`.
2. The backend resolves the provider adapter.
3. If the adapter does not support tools, Cortex falls back to normal chat streaming.
4. If the adapter supports tools, Cortex sends only the registered tool definitions to the model.
5. The model may either:
   - answer directly with text, or
   - request one or more approved tool calls
6. Cortex executes approved tool handlers on the server.
7. Tool results are appended to the server-side conversation.
8. Cortex performs a second tool-enabled model call to produce the final grounded answer.
9. The frontend still receives a single SSE response stream.

### Current backend roles

| File | Responsibility |
| --- | --- |
| `cortex-backend/app/routers/chat.py` | Decides whether tools are enabled, runs the server-side tool loop, and re-streams the final answer |
| `cortex-backend/app/tools/registry.py` | Holds the whitelist of allowed tools and blocks unknown tool names |
| `cortex-backend/app/tools/definitions.py` | Defines the model-visible tool contracts and argument schemas |
| `cortex-backend/app/tools/breweries.py` | Wires brewery tool handlers to `BreweryService` |
| `cortex-backend/app/services/brewery_service.py` | Performs the actual read/query work against Supabase |
| `cortex-backend/app/schemas/chat.py` | Defines `enable_tools`, `ToolDefinition`, and tool-call/result schemas |

## Why unrestricted SQL is forbidden

Unrestricted SQL from a model is forbidden because it breaks the current security model.

| Risk | Why it is unacceptable |
| --- | --- |
| Writes or destructive changes | A prompt-injected model must never be able to mutate business data |
| Table sprawl | The model would gain implicit access to tables that were never reviewed for chat exposure |
| Sensitive field leakage | Raw SQL makes it easy to exfiltrate internal or private columns |
| Unbounded query shape | Arbitrary joins, filters, or scans are hard to reason about and hard to test |
| Weak reviewability | Reviewers cannot prove what the model may execute if the backend accepts free-form SQL |

The safe pattern is the opposite:

- the backend defines the allowed operations
- the model can choose only from those operations
- every tool is readable in code, testable in isolation, and easy to review

## MVP scope

### In scope now

- read-only brewery lookups
- read-only brewery counts
- server-side tool execution through a whitelist registry
- tool-enabled chat only when explicitly requested

### Out of scope now

- access to all tables
- dynamic table discovery
- arbitrary SQL
- write operations of any kind
- automatic tool generation from schema

## Read-only guardrails for every exposed table

These rules are REQUIRED for breweries today and for every future table.

### Required guardrails

- Expose tables through named tools, never through raw SQL text.
- Keep tools read-only by default. No `insert`, `update`, `delete`, `upsert`, RPC writes, or schema changes.
- Prefer narrow query tools over generic "query anything in this table" tools.
- Define an explicit argument schema for every tool.
- Keep handlers server-side only.
- Route handlers through a service layer, not directly from adapter code.
- Return only fields that are safe for chat exposure.
- Add tests before implementation changes.
- Do not register a tool until its read-only behavior and output contract are covered by tests.

### Strong recommendations

- Prefer projections over `select("*")` when exposing a table to chat for the first time.
- Keep result size bounded.
- Keep filters explicit and typed.
- Add a second tool only when the first tool no longer matches a real user question cleanly.

## Extension checklist: add a new table safely

Use this checklist when expanding from breweries to another table.

### 1. Confirm the table is safe to expose

- [ ] The table has a real chat use case.
- [ ] The table can be exposed read-only.
- [ ] The safe fields are known.
- [ ] The unsafe fields are known and excluded.
- [ ] The initial supported queries are narrow and explicit.

### 2. Add service-layer read methods

Create or extend a service in `cortex-backend/app/services/` with only the read operations you intend to expose.

Rules:

- one method per approved query shape when possible
- no write methods used by chat tools
- keep query logic deterministic and reviewable

Example pattern:

```python
class CustomerService:
    def search(self, city: str | None = None) -> list[dict]: ...
    def count(self) -> int: ...
```

### 3. Define tool contracts

Add tool definitions in `cortex-backend/app/tools/definitions.py`.

Rules:

- use explicit names like `search_customers` or `count_customers`
- describe the real business intent
- define a strict argument schema
- do not add a generic `run_sql` or `query_table` tool

### 4. Add table-specific handlers

Create a tool module similar to `cortex-backend/app/tools/breweries.py`.

Rules:

- handlers accept structured arguments only
- handlers call the service layer
- handlers serialize only safe output

Recommended shape:

```python
def make_search_handler(service: CustomerService):
    def handler(arguments: dict) -> str:
        results = service.search(city=arguments.get("city"))
        return json.dumps(results)
    return handler

def register_customer_tools(registry: ToolRegistry, service: CustomerService) -> None:
    registry.register(SEARCH_CUSTOMERS_TOOL, make_search_handler(service))
```

### 5. Register the tools explicitly

Update the backend dependency wiring so the `ToolRegistry` registers the new table tools intentionally.

Current pattern:

- `cortex-backend/app/routers/chat.py` builds a fresh `ToolRegistry`
- `register_brewery_tools(...)` adds the current whitelist

Future pattern:

- add a matching `register_<table>_tools(...)`
- wire the required service dependency
- register only the tools that passed security and test review

### 6. Keep read-only as the default

Before merging, verify all of these remain true:

- [ ] No write path was added to the chat tool layer.
- [ ] No raw SQL input from the model is executed.
- [ ] Unknown tool names still fail in `ToolRegistry.execute()`.
- [ ] The new table is exposed only through explicit whitelist registration.
- [ ] The doc for this architecture still describes the new scope truthfully.

## Strict TDD expectations

This architecture must evolve under strict TDD, not doc-first optimism.

`RED -> GREEN -> REFACTOR`

### Minimum test expectations for a new table exposure

- [ ] Schema tests for the new tool definitions or request/result structures when applicable
- [ ] Registry tests proving the new tools are registered and executable
- [ ] Service tests proving the read methods call Supabase as intended
- [ ] Handler tests proving arguments map correctly to service calls and outputs are serialized correctly
- [ ] Router/integration tests proving the tool path executes server-side and re-streams the grounded answer
- [ ] Negative tests proving unknown tools or invalid cases do not create unsafe behavior

### Current examples in the repo

| Test file | What it proves |
| --- | --- |
| `cortex-backend/tests/test_tools_registry.py` | Whitelist registration and unknown-tool blocking |
| `cortex-backend/tests/test_tools_breweries.py` | Brewery handler wiring and output behavior |
| `cortex-backend/tests/test_brewery_service.py` | Brewery read/query behavior against mocked Supabase |
| `cortex-backend/tests/test_chat_router.py` | End-to-end server-side tool loop and fallback behavior |

## Review checklist

Use this before approving any expansion beyond breweries.

- [ ] The doc still says exactly which tables are currently exposed.
- [ ] The new tools are read-only.
- [ ] No unrestricted SQL was introduced.
- [ ] The output shape is intentionally constrained.
- [ ] Tests were written first and cover both happy path and guardrails.
- [ ] The registry remains an explicit whitelist, not dynamic discovery.

## Related files

- `docs/CORTEX.md`
- `docs/README.md`
- `cortex-backend/app/routers/chat.py`
- `cortex-backend/app/tools/registry.py`
- `cortex-backend/app/tools/definitions.py`
- `cortex-backend/app/tools/breweries.py`
