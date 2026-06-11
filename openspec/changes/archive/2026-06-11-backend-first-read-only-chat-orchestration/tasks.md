# Tasks: Backend-First Read-Only Chat Orchestration (Revised)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 250–300 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR (cutover + cleanup) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Cutover: remove feature flag, old router branches, delete deprecated modules | PR 4 | Base = feature/tracker; tests deleted/rewritten; sole SqlOrchestrator path |

## Phase 4: Cutover — Remove Feature Flag and Old Paths

- [x] 4.1 Modify `app/core/config.py` — remove `sql_orchestrator_enabled` field and `SQL_ORCHESTRATOR_ENABLED` property
- [x] 4.2 Modify `app/routers/chat.py` — remove `SQL_ORCHESTRATOR_ENABLED` gate, AI-planner path, tool-loop path, model-direct path; keep auth → credential resolution → `SqlOrchestrator.run()` → SSE stream only; remove `tool_registry`/`brewery_service` imports/deps
- [x] 4.3 Rewrite `tests/test_chat_router.py` — remove feature-flag tests (SQL_ORCHESTRATOR_ENABLED=True/False routing), AI-planner path tests, tool-loop tests, model-direct tests; keep SSE contract tests, auth tests, error-stream tests; add sole-path assertion: every request routes to `SqlOrchestrator.run()` and nothing else

## Phase 5: Delete Deprecated Modules

- [x] 5.1 Delete `app/executor/engine.py` and `app/executor/__init__.py`
- [x] 5.2 Delete `app/tools/definitions.py`, `app/tools/brewery.py`, `app/tools/registry.py`, `app/tools/__init__.py`
- [x] 5.3 Delete `app/planner/schemas.py` (RetrievalPlan/RetrievalStep)
- [x] 5.4 Modify `app/planner/engine.py` — remove `PlannerEngine`, `validate_plan`; keep `SqlPlanner` only
- [x] 5.5 Modify `app/synthesizer/engine.py` — remove `SynthesizerEngine`; keep `NlSynthesizer` only
- [x] 5.6 Delete `app/utils/chat_router.py`, `app/utils/chat_detail.py`, `app/utils/chat_table.py`, `app/utils/chat_grounding.py`
- [x] 5.7 Investigate `app/utils/response_engine.py` — deleted; no remaining routes depended on it after `SynthesizerEngine` removal
- [x] 5.8 Delete `tests/test_chat_router_unit.py` (tests deleted `app.utils.chat_router`)
- [x] 5.9 Delete `tests/test_ai_planner_pipeline.py`, `tests/test_executor_engine.py`, `tests/test_planner_validation.py`, `tests/test_planner_schemas.py`, `tests/test_tool_definitions.py`, `tests/test_tools_breweries.py`, `tests/test_tools_registry.py`, `tests/test_response_engine.py`

## Phase 6: Verification

- [x] 6.1 Run full `pytest` suite — 424 passed, 0 failed
- [x] 6.2 Verify `SqlOrchestrator` is the only execution path by inspecting `chat.py` — no conditional branching on feature flags or planner types; sole path confirmed
- [x] 6.3 Confirm no imports of deleted modules remain in the codebase (`grep` for `app.executor`, `app.tools`, `app.planner.schemas`, `app.utils.chat_router`, etc.) — zero references found

## Post-Cutover Bugfix: Schema Introspection Transport

- [x] Bugfix 7.1 Modify `app/services/schema_introspection.py` — replace PostgREST `supabase_client.schema("information_schema").table("columns")` chain with `supabase_service.execute_raw(sql)` using the `exec_sql` Postgres RPC
- [x] Bugfix 7.2 Modify `app/orchestrators/sql_orchestrator.py` — pass `supabase_service` to `SchemaIntrospection.fetch()` instead of raw `supabase_client`
- [x] Bugfix 7.3 Rewrite `tests/test_schema_introspection.py` — mock `execute_raw` instead of PostgREST fluent API; assert SQL content and output format
- [x] Bugfix 7.4 Verify full suite still passes after bugfix — 424 passed, 0 failed

## Post-Cutover Refinement: Dedicated Schema RPC

- [x] Refinement 8.1 Add `SupabaseService.get_chat_schema_metadata()` — dedicated RPC helper that calls `get_chat_schema_metadata` without inlining SQL
- [x] Refinement 8.2 Modify `app/services/schema_introspection.py` — call `supabase_service.get_chat_schema_metadata()` instead of `supabase_service.execute_raw(...)`; remove `_SCHEMA_SQL` constant
- [x] Refinement 8.3 Update tests — rewrite `tests/test_schema_introspection.py` to mock `get_chat_schema_metadata`; create `tests/test_supabase_service.py` with RPC contract tests
- [x] Refinement 8.4 Run relevant tests — 14 passed, 0 failed

## Post-Cutover Bugfix: Schema-Qualified SQL Generation

- [x] Bugfix 9.1 Modify `app/services/schema_introspection.py` — prefix table names with `public.` in schema output
- [x] Bugfix 9.2 Modify `app/planner/prompt_builder.py` — add rule instructing LLM to use fully qualified table names with `public.` prefix
- [x] Bugfix 9.3 Update tests — rewrite `tests/test_schema_introspection.py` to assert `public.` qualification; add `test_requires_fully_qualified_table_names` to `tests/test_planner_prompt_builder.py`
- [x] Bugfix 9.4 Run full test suite — 430 passed, 0 failed

## Post-Cutover Bugfix: SQL Logging and Cross-Table Search

- [x] Bugfix 10.1 Modify `app/orchestrators/sql_orchestrator.py` — add structured logging of generated SQL before validation/execution
- [x] Bugfix 10.2 Modify `app/planner/prompt_builder.py` — instruct LLM to search across all relevant `public.*` tables and use `UNION ALL` for parallel tables
- [x] Bugfix 10.3 Modify `app/validators/sql_validator.py` — allow safe read-only `UNION ALL` / `UNION`, keep mutation/multi-statement/comment protections
- [x] Bugfix 10.4 Update tests — add logging assertion, union-all safe cases, cross-table orchestrator test, adjust unsafe validation test
- [x] Bugfix 10.5 Run relevant tests — 34 targeted passed; full suite 435 passed, 0 failed

## Post-Cutover Observability Bugfix: Visible SQL Logging

- [x] Bugfix 11.1 Modify `app/orchestrators/sql_orchestrator.py` — switch generated SQL logging to `uvicorn.error` and emit a plain message string with `request_id`
- [x] Bugfix 11.2 Modify `app/routers/chat.py` — pass router `request_id` into `SqlOrchestrator.run()`
- [x] Bugfix 11.3 Update tests — assert visible SQL log line and request-id propagation
- [x] Bugfix 11.4 Run relevant tests — `PYTHONPATH=. pytest tests/test_sql_orchestrator.py tests/test_chat_router.py` (35 passed, 0 failed)

## Post-Cutover Bugfix: Heterogeneous Cross-Table Search

- [x] Bugfix 12.1 Modify `app/planner/prompt_builder.py` — instruct LLM that UNION ALL across tables must project the same columns in the same order; forbid SELECT * in UNION ALL branches; recommend a common domain projection with NULL casts for missing columns
- [x] Bugfix 12.2 Modify `app/validators/sql_validator.py` — reject SELECT * in UNION/UNION ALL queries before execution
- [x] Bugfix 12.3 Update tests — add prompt-builder assertions for common projection and SELECT * prohibition; add validator tests for UNION/UNION ALL with SELECT *; add orchestrator end-to-end guardrail test
- [x] Bugfix 12.4 Run relevant tests — `PYTHONPATH=. pytest tests/test_planner_prompt_builder.py tests/test_sql_validator.py tests/test_sql_orchestrator.py` (40 passed, 0 failed); full suite 441 passed, 0 failed
