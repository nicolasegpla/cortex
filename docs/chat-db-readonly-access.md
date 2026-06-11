# Chat DB Read-Only Access

Current chat-to-database access is backend-first and read-only. The backend owns schema discovery, SQL validation, SQL execution, and final response delivery. The LLM is limited to two jobs: generate SQL from `(user_text, schema_context)` and synthesize a natural-language answer from grounded rows.

## Quick path

1. Read this doc for the current SQL-only chat architecture.
2. Check `cortex-backend/app/routers/chat.py` for the sole chat route.
3. Check `cortex-backend/app/orchestrators/sql_orchestrator.py` for the pipeline.
4. Check `cortex-backend/app/services/{schema_introspection,supabase_service}.py` for DB metadata and execution.

## Answer first

| Topic | Current decision |
| --- | --- |
| Current scope | Read-only chat across the current domain tables |
| Access mode | Read-only only |
| Query model | Backend-first SQL orchestration |
| SQL from chat | Allowed only through validated backend execution |
| Fallback path | None |
| Table coverage | `public.breweries`, `public.coffee_farms`, `public.animal_feed_producers`, `public.wine_producers` |
| Security posture | Read-only by default, validated SQL, least privilege, backend-owned execution |

## What is implemented today

The backend now routes every chat request through a single SQL pipeline:

1. backend fetches schema metadata through `get_chat_schema_metadata()`
2. LLM generates one read-only SQL query from `user_text + schema_context`
3. backend validates the SQL
4. backend executes it through `exec_sql`
5. LLM synthesizes the final natural-language answer from grounded rows

Important boundaries:

- This is NOT direct model-to-database execution.
- This does NOT allow writes, updates, deletes, inserts, DDL, or multi-statement SQL.
- This no longer uses tool-calling, planner fallback, or direct model fallback.
- The backend remains the system of control; the LLM is a constrained component inside it.

## How the chat-to-DB SQL layer works

### Flow

1. The client sends `POST /chat/stream`.
2. The backend resolves the provider adapter and credential.
3. `SqlOrchestrator` fetches schema metadata from Supabase through `get_chat_schema_metadata()`.
4. `SqlPlanner` builds a schema-injected prompt and requests one read-only SQL statement.
5. `SqlValidator` blocks unsafe SQL before execution.
6. `SupabaseService.execute_raw()` executes the validated query through `exec_sql`.
7. `NlSynthesizer` turns grounded rows into a natural-language answer.
8. The frontend receives the answer through the existing SSE stream.

### Current backend roles

| File | Responsibility |
| --- | --- |
| `cortex-backend/app/routers/chat.py` | Receives chat requests and routes them to `SqlOrchestrator` |
| `cortex-backend/app/orchestrators/sql_orchestrator.py` | Owns the full backend-first SQL pipeline |
| `cortex-backend/app/planner/engine.py` | Calls the LLM to generate one SQL statement |
| `cortex-backend/app/planner/prompt_builder.py` | Builds the schema-injected SQL prompt and global-search rules |
| `cortex-backend/app/validators/sql_validator.py` | Blocks unsafe SQL before execution |
| `cortex-backend/app/services/schema_introspection.py` | Formats schema metadata returned by Supabase RPC |
| `cortex-backend/app/services/supabase_service.py` | Calls `get_chat_schema_metadata()` and `exec_sql` RPCs |
| `cortex-backend/app/synthesizer/engine.py` | Calls the LLM to synthesize a grounded answer |

## Why unrestricted SQL is still forbidden

The system now uses SQL, but NOT unrestricted SQL.

| Risk | Why it is unacceptable |
| --- | --- |
| Writes or destructive changes | A prompt-injected model must never mutate business data |
| Unreviewable query shape | Arbitrary SQL with no guardrails is hard to reason about and test |
| Sensitive field leakage | Free-form SQL can expose columns that were not intended for chat |
| Multi-statement injection | Chained statements would bypass the read-only contract |
| Unsafe cross-table unions | Heterogeneous `SELECT *` unions break at runtime and are not reviewable |

The safe pattern is:

- backend provides schema context
- LLM proposes one SQL candidate
- backend validates and executes
- backend returns only grounded results

## MVP scope

### In scope now

- read-only SQL generation from natural-language chat
- schema metadata fetched by backend from Supabase RPC
- SQL execution through read-only RPC
- natural-language synthesis from grounded result rows
- global multi-table search across the current domain tables

### Out of scope now

- write operations of any kind
- direct model execution against the DB
- feature-flagged fallback chat paths
- arbitrary unvalidated SQL
- automatic schema mutation or table creation from chat

## Required read-only guardrails

### Required guardrails

- Only one SQL statement per request.
- No comments, no multi-statement payloads, no mutating keywords.
- Tables must be schema-qualified with `public.`.
- Schema metadata must come from backend-owned RPCs, not model guesses.
- Global multi-table unions must use a common projection; heterogeneous `SELECT *` unions are rejected.
- Execution must stay behind backend validation and RPC boundaries.
- Changes must be implemented with strict TDD.

### Strong recommendations

- Prefer explicit projections over `SELECT *` for multi-table/global search.
- Keep result size bounded.
- Log generated SQL for runtime debugging.
- Add deterministic backend-built global search if prompt-only multi-table SQL remains fragile in production.

## Extension checklist

Use this checklist when expanding the current domain coverage.

### 1. Confirm the table is safe to expose

- [ ] The table has a real chat use case.
- [ ] The table can be exposed read-only.
- [ ] Safe fields are known.
- [ ] Unsafe fields are known and excluded from prompts/results when needed.

### 2. Add schema metadata support

- [ ] The table appears in `get_chat_schema_metadata()` output.
- [ ] The schema formatter exposes the table with `public.<table_name>`.

### 3. Keep the SQL contract safe

- [ ] The planner prompt still constrains the LLM to one read-only SQL statement.
- [ ] The validator still blocks mutation, comments, and unsafe structural patterns.
- [ ] Multi-table queries use a common projection when needed.

### 4. Verify synthesis remains grounded

- [ ] The final answer is built only from DB results.
- [ ] Empty results produce a grounded “not found” style answer.
- [ ] Execution failures do not fall back to hallucinated free-form answers.

## Strict TDD expectations

This architecture must evolve under strict TDD.

`RED -> GREEN -> REFACTOR`

### Minimum test expectations

- [ ] Planner tests for SQL extraction and prompt rules
- [ ] Validator tests for safe and unsafe SQL
- [ ] Schema introspection tests for RPC and output shape
- [ ] Supabase service tests for metadata/execution RPC calls
- [ ] Orchestrator tests for pipeline order, grounded failures, and synthesis
- [ ] Router tests for SSE behavior and sole-path execution

## Possible future improvements

- Build global multi-table search SQL in the backend with a deterministic common projection instead of relying only on prompt guidance.
- Standardize one cross-table shape such as `source`, `record_id`, `display_name`, `city`, `country`, `contact_name`, `phone`, `email`, `search_text`.
- Keep the LLM focused on intent interpretation and final answer synthesis while the backend assembles the safest global-search SQL.

## Related files

- `README.md`
- `docs/CORTEX.md`
- `docs/README.md`
- `cortex-backend/app/routers/chat.py`
- `cortex-backend/app/orchestrators/sql_orchestrator.py`
- `cortex-backend/app/planner/prompt_builder.py`
- `cortex-backend/app/validators/sql_validator.py`
- `cortex-backend/app/services/schema_introspection.py`
- `cortex-backend/app/services/supabase_service.py`
