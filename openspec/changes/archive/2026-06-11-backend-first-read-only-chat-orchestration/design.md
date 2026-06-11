# Design: Backend-First Read-Only Chat Orchestration (Revised)

## Technical Approach

Direct cutover: `SqlOrchestrator` becomes the **sole** chat execution path. No feature flag, no runtime toggle, no fallback to the old AI-planner/tool-calling/model-direct paths. The `chat.py` router is reduced to auth → credential resolution → `SqlOrchestrator.run()` → SSE stream. Old modules (`app/executor/`, `app/tools/`, deprecated utils, `PlannerEngine`, `SynthesizerEngine`, `RetrievalPlan` schemas) are **deleted** — not commented out, not left unused. Rollback is `git revert` only.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Old modules: delete vs leave unused | Delete | Left-unused code rots, confuses future readers, and inflates test suites. Direct cutover requires clean removal. |
| Feature flag removal | Remove `SQL_ORCHESTRATOR_ENABLED` from config | No runtime toggle needed. Code revert is the rollback mechanism. |
| Chat router structure | Single-path: `SqlOrchestrator` only | Eliminates 4 branch arms (feature-flag, ai-planner, tool-loop, model-direct) into 1. Simpler, testable, predictable. |
| `SqlPlanner` contract | `human_query_to_sql(human_query)` shape with schema-injected prompt | LLM receives deterministic schema context built by backend, returns one SELECT. Backend parses, validates, executes. |
| Tool-calling removal | Delete `app/tools/` entirely | SQL orchestration replaces function-calling for DB queries. No approved tool execution remains. |
| DB-first routing utilities | Delete `app/utils/chat_router.py`, `chat_detail.py`, `chat_table.py`, `chat_grounding.py` | Already marked `@deprecated`. SQL orchestration supersedes deterministic routing. |
| `PlannerEngine` / `RetrievalPlan` | Delete `PlannerEngine`, `validate_plan`, `RetrievalPlan`/`RetrievalStep` schemas | Replaced by `SqlPlanner` + structured SQL output. No entity-service dispatch remains. |

## Data Flow

```
User → chat.py router
         │
    ┌────┴────┐ (NO branching)
    ▼
SqlOrchestrator.run()
    │
    ├─1. SchemaIntrospection.fetch() → schema_context (DDL text)
    ├─2. SqlPlanner.generate(user_text, schema_context) → SELECT sql
    ├─3. SqlValidator.validate(sql) → None | error_msg
    ├─4. SupabaseService.execute_raw(sql) → rows: list[dict]
    └─5. NlSynthesizer.synthesize(user_text, rows) → NL string → SSE stream
```

Failures at steps 1-4 return grounded error messages. Step 5 only runs on success.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/core/config.py` | Modify | Remove `sql_orchestrator_enabled` field and `SQL_ORCHESTRATOR_ENABLED` property |
| `app/routers/chat.py` | Modify | Remove feature-flag gate, AI-planner path, tool-loop, model-direct path, and all old imports/helpers. Keep only `SqlOrchestrator` path. Remove `tool_registry`/`brewery_service` deps. |
| `app/executor/engine.py` | Delete | Old plan executor for entity-service dispatch |
| `app/executor/__init__.py` | Delete | Module init |
| `app/tools/definitions.py` | Delete | Tool definitions for function calling |
| `app/tools/brewery.py` | Delete | Brewery tool implementations |
| `app/tools/registry.py` | Delete | ToolRegistry class |
| `app/tools/__init__.py` | Delete | Module init |
| `app/planner/schemas.py` | Delete | RetrievalPlan/RetrievalStep schemas |
| `app/planner/engine.py` | Modify | Remove `PlannerEngine`, `validate_plan`. Keep `SqlPlanner`. |
| `app/planner/prompt_builder.py` | Modify | Remove `build_planner_prompt`. Keep `build_sql_prompt`. |
| `app/synthesizer/engine.py` | Modify | Remove `SynthesizerEngine`. Keep `NlSynthesizer`. |
| `app/utils/chat_router.py` | Delete | Already `@deprecated` DB-first routing |
| `app/utils/chat_detail.py` | Delete | Already `@deprecated` detail formatting |
| `app/utils/chat_table.py` | Delete | Already `@deprecated` table formatting |
| `app/utils/chat_grounding.py` | Delete | Already `@deprecated` grounding utils |
| `tests/conftest.py` | Modify | Remove `mock_tool_registry` fixture, `ToolRegistry`/`register_brewery_tools` imports |
| `tests/test_chat_router.py` | Modify | Remove feature-flag tests, AI-planner tests, tool-loop tests, model-direct tests. Keep SSE contract, auth, error tests. Add sole-path orchestration tests. |
| `tests/test_chat_router_unit.py` | Delete | Tests `app.utils.chat_router` (deleted) |
| `tests/test_ai_planner_pipeline.py` | Delete | Tests old AI-planner pipeline |
| `tests/test_executor_engine.py` | Delete | Tests deleted executor |
| `tests/test_planner_engine.py` | Modify | Remove `PlannerEngine` tests; keep/reuse for `SqlPlanner` |
| `tests/test_planner_validation.py` | Delete | Tests `validate_plan` (deleted) |
| `tests/test_planner_schemas.py` | Delete | Tests `RetrievalPlan` schemas (deleted) |
| `tests/test_tool_definitions.py` | Delete | Tests deleted tool definitions |
| `tests/test_tools_breweries.py` | Delete | Tests deleted brewery tools |
| `tests/test_tools_registry.py` | Delete | Tests deleted ToolRegistry |
| `tests/test_response_engine.py` | Delete | Tests old deterministic response engine |

## Key Interfaces

```python
# SqlPlanner — human_query_to_sql contract
class SqlPlanner:
    def __init__(self, llm_call: Callable[[list[dict]], Awaitable[str]]): ...
    async def generate(self, user_text: str, schema_context: str) -> str:
        """Returns one SELECT statement. Raises ValueError if malformed."""

# SqlOrchestrator — sole entry point
class SqlOrchestrator:
    async def run(
        self, user_text: str, messages: list[dict],
        adapter, model: str, api_key: str,
    ) -> str:
        """Returns NL answer or grounded error string."""

# build_sql_prompt — schema-injected prompt
def build_sql_prompt(user_text: str, schema: str) -> str:
    """System prompt with schema context. LLM must return exactly one SELECT."""
```

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `SqlValidator` blocks unsafe SQL | Existing parametrized tests retained |
| Unit | `SchemaIntrospection` format | Existing mock-Supabase tests retained |
| Unit | `SqlPlanner.generate()` returns SELECT | Mock LLM → known SQL; assert extraction logic |
| Integration | `SqlOrchestrator.run()` full pipeline | Mock LLM + Supabase; verify all 5 stages called in order |
| Router | Sole-path: all requests route to SqlOrchestrator | No branching assertions; verify SqlOrchestrator.run called once per request |
| Router | SSE contract preserved | Existing SSE format tests (delta/done/error events) retained |
| Router | Auth + error handling unchanged | Existing 401/400/error-stream tests retained |
| Router | NO feature-flag, NO fallback paths | Assert `SqlOrchestrator` is the only path; remove all old-path assertions |

## Migration / Rollout

**Direct cutover** — deploy the revised code. No runtime flag, no phased rollout. All environments move to SQL orchestration simultaneously. On failure, rollback is `git revert` of the deploy commit. No data migration required; the `exec_sql` Postgres RPC must already exist in all environments before deploy.

## Open Questions

- [ ] Is the `exec_sql` Supabase RPC function deployed in all environments (dev/staging/prod)? Blocking if not.
- [ ] `app/utils/response_engine.py` references — verify no other routes depend on it beyond the deleted paths. If unused after cutover, remove it too.

## Possible Future Improvements

- Replace prompt-only global multi-table SQL generation with a backend-built deterministic global search query that uses a fixed common projection across `public.breweries`, `public.coffee_farms`, `public.animal_feed_producers`, and `public.wine_producers`.
- Move cross-table search shape from prompt guidance to an explicit backend contract (for example: `source`, `record_id`, `display_name`, `city`, `country`, `contact_name`, `phone`, `email`, `search_text`) so heterogeneous tables never depend on LLM-crafted `UNION ALL` structure.
- Keep the LLM focused on intent interpretation and response synthesis while the backend assembles the safest possible SQL for broad/global searches.
