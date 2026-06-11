# Apply Progress: Backend-First Read-Only Chat Orchestration — Cumulative Bugfix Progress

## Change
backend-first-read-only-chat-orchestration

## Mode
Strict TDD

## Batch
Post-cutover runtime bugfix/refinement — cumulative SQL observability and query-generation follow-ups

## Completed Tasks (cumulative)

### Phase 1: Infrastructure (PR 1)
- [x] 1.1 Create `app/validators/__init__.py`
- [x] 1.2 Create `app/validators/sql_validator.py`
- [x] 1.3 RED: Write `tests/test_sql_validator.py`
- [x] 1.4 GREEN: `SqlValidator` passes all test cases
- [x] 1.5 Create `app/services/schema_introspection.py`
- [x] 1.6 RED: Write `tests/test_schema_introspection.py`
- [x] 1.7 GREEN: `SchemaIntrospection` passes output-format tests
- [x] 1.8 Create `app/orchestrators/__init__.py`
- [x] 1.9 Create `app/orchestrators/sql_orchestrator.py` — skeleton with 5-step pipeline, steps 2/5 stubbed

### Phase 2: Core Implementation + Wiring (PR 2)
- [x] 2.1 RED: Write `tests/test_sql_orchestrator.py` — full pipeline tests
- [x] 2.2 GREEN: Complete `SqlOrchestrator.run()` — wire `SqlPlanner` and `NlSynthesizer`
- [x] 2.3 Modify `app/planner/prompt_builder.py` — add `build_sql_prompt`
- [x] 2.4 Modify `app/planner/engine.py` — add `SqlPlanner`
- [x] 2.5 Modify `app/synthesizer/engine.py` — add `NlSynthesizer`
- [x] 2.6 RED: Write `tests/test_chat_router.py` — feature-flag routing
- [x] 2.7 GREEN: Modify `app/routers/chat.py` — feature-flag gate
- [x] 2.8 Modify `app/core/config.py` — add `SQL_ORCHESTRATOR_ENABLED: bool = False`
- [x] 2.9 Integration: run full `pytest` suite — 766 passed, 2 unrelated pre-existing failures
- [x] 2.10 Documentation: add inline docstrings to all new public classes/methods

### Phase 3: Cleanup (PR 3)
- [x] 3.1 Remove any stub implementations or TODOs left from Phase 1
- [x] 3.2 Verify feature flag default is `False` (preserves existing behavior until explicitly enabled)

### Phase 4: Cutover (PR 4)
- [x] 4.1 Modify `app/core/config.py` — remove `sql_orchestrator_enabled` field and `SQL_ORCHESTRATOR_ENABLED` property
- [x] 4.2 Modify `app/routers/chat.py` — remove feature-flag gate, AI-planner path, tool-loop path, model-direct path; keep auth → credential resolution → `SqlOrchestrator.run()` → SSE stream only; remove `tool_registry`/`brewery_service` imports/deps
- [x] 4.3 Rewrite `tests/test_chat_router.py` — remove feature-flag tests, AI-planner path tests, tool-loop tests, model-direct tests; keep SSE contract tests, auth tests, error tests; add sole-path assertions that every request routes to `SqlOrchestrator.run()` and nothing else

### Phase 5: Delete Deprecated Modules (PR 4 continued)
- [x] 5.1 Delete `app/executor/engine.py` and `app/executor/__init__.py`
- [x] 5.2 Delete `app/tools/definitions.py`, `app/tools/brewery.py`, `app/tools/registry.py`, `app/tools/__init__.py`
- [x] 5.3 Delete `app/planner/schemas.py` (RetrievalPlan/RetrievalStep)
- [x] 5.4 Modify `app/planner/engine.py` — remove `PlannerEngine`, `validate_plan`; keep `SqlPlanner` only
- [x] 5.5 Modify `app/synthesizer/engine.py` — remove `SynthesizerEngine`; keep `NlSynthesizer` only
- [x] 5.6 Delete `app/utils/chat_router.py`, `app/utils/chat_detail.py`, `app/utils/chat_table.py`, `app/utils/chat_grounding.py`
- [x] 5.7 Delete `app/utils/response_engine.py` — confirmed no remaining routes depended on it after SynthesizerEngine removal
- [x] 5.8 Delete `tests/test_chat_router_unit.py`
- [x] 5.9 Delete `tests/test_ai_planner_pipeline.py`, `tests/test_executor_engine.py`, `tests/test_planner_validation.py`, `tests/test_planner_schemas.py`, `tests/test_tool_definitions.py`, `tests/test_tools_breweries.py`, `tests/test_tools_registry.py`, `tests/test_response_engine.py`, `tests/test_chat_detail.py`, `tests/test_chat_grounding.py`, `tests/test_chat_table.py`

### Phase 6: Verification
- [x] 6.1 Run full `pytest` suite — 424 passed, 0 failed
- [x] 6.2 Verify `SqlOrchestrator` is the only execution path by inspecting `chat.py` — sole path confirmed
- [x] 6.3 Confirm no imports of deleted modules remain in the codebase — zero references found

### Post-Cutover Bugfix: Schema Introspection Transport
- [x] Bugfix 7.1 Modify `app/services/schema_introspection.py` — replace PostgREST chain with `supabase_service.execute_raw(sql)` using `exec_sql` Postgres RPC
- [x] Bugfix 7.2 Modify `app/orchestrators/sql_orchestrator.py` — pass `supabase_service` to `SchemaIntrospection.fetch()` instead of raw `supabase_client`
- [x] Bugfix 7.3 Rewrite `tests/test_schema_introspection.py` — mock `execute_raw` instead of PostgREST fluent API; assert SQL content and output format
- [x] Bugfix 7.4 Verify full suite still passes after bugfix — 424 passed, 0 failed

### Post-Cutover Refinement: Dedicated Schema RPC
- [x] Refinement 8.1 Add `SupabaseService.get_chat_schema_metadata()` — dedicated RPC helper
- [x] Refinement 8.2 Modify `app/services/schema_introspection.py` — call `supabase_service.get_chat_schema_metadata()` instead of `supabase_service.execute_raw(...)`; remove `_SCHEMA_SQL` constant
- [x] Refinement 8.3 Update tests — rewrite `tests/test_schema_introspection.py` to mock `get_chat_schema_metadata`; create `tests/test_supabase_service.py` with RPC contract tests
- [x] Refinement 8.4 Run relevant tests — 14 passed, 0 failed

### Post-Cutover Bugfix: Schema-Qualified SQL Generation
- [x] Bugfix 9.1 Modify `app/services/schema_introspection.py` — prefix table names with `public.` in schema output
- [x] Bugfix 9.2 Modify `app/planner/prompt_builder.py` — add rule instructing LLM to use fully qualified table names with `public.` prefix
- [x] Bugfix 9.3 Update tests — rewrite `tests/test_schema_introspection.py` to assert `public.` qualification; add `test_requires_fully_qualified_table_names` to `tests/test_planner_prompt_builder.py`
- [x] Bugfix 9.4 Run full test suite — 430 passed, 0 failed

### Post-Cutover Bugfix: SQL Logging and Cross-Table Search
- [x] Bugfix 10.1 Modify `app/orchestrators/sql_orchestrator.py` — add module logger and structured log line for generated SQL before validation/execution
- [x] Bugfix 10.2 Modify `app/planner/prompt_builder.py` — instruct the model to search across all relevant `public.*` tables and combine parallel tables with `UNION ALL`
- [x] Bugfix 10.3 Modify `app/validators/sql_validator.py` — remove `UNION` from forbidden keywords; keep all mutation/multi-statement/comment protections
- [x] Bugfix 10.4 Update tests — add logging assertion, union-all safe cases, cross-table orchestrator test, adjust unsafe validation test to use multi-statement
- [x] Bugfix 10.5 Run relevant tests — 34 targeted passed; full suite 435 passed, 0 failed

### Post-Cutover Observability Bugfix: Visible SQL Logging
- [x] Bugfix 11.1 Modify `app/orchestrators/sql_orchestrator.py` — use `uvicorn.error` for generated SQL logging and emit a plain `"[{request_id}] SQL: ..."` message before validation/execution
- [x] Bugfix 11.2 Modify `app/routers/chat.py` — pass the router-generated `request_id` into `SqlOrchestrator.run()` so SQL logs correlate with the existing stream logs
- [x] Bugfix 11.3 Update tests — assert the visible SQL log message and request-id propagation from router to orchestrator
- [x] Bugfix 11.4 Run relevant tests — `PYTHONPATH=. pytest tests/test_sql_orchestrator.py` and `PYTHONPATH=. pytest tests/test_chat_router.py` (35 passed, 0 failed)

## Files Changed (this bugfix batch)
| File | Action | What Was Done |
|------|--------|---------------|
| `app/orchestrators/sql_orchestrator.py` | Modified | Added module logger and structured `logger.info(..., extra={"generated_sql": ..., "user_text": ...})` after SQL generation, before validation/execution |
| `app/planner/prompt_builder.py` | Modified | Added rule to search across all relevant `public.*` tables; added `UNION ALL` guidance for parallel tables; removed `UNION` from the forbidden-keyword list |
| `app/validators/sql_validator.py` | Modified | Removed `UNION` from `FORBIDDEN`; mutation/multi-statement/comment protections unchanged |
| `tests/test_sql_orchestrator.py` | Modified | Replaced UNION-based unsafe test with multi-statement; added `test_run_logs_generated_sql_before_execution` and `test_run_executes_union_all_cross_table_search` |
| `tests/test_planner_prompt_builder.py` | Modified | Added `test_instructs_cross_table_search_with_union_all` and `test_forbids_union_without_all` |
| `tests/test_sql_validator.py` | Modified | Added safe `UNION ALL` and `UNION` cases; renamed mutating/union test to `test_mutating_statements_blocked` |

## TDD Cycle Evidence (this bugfix batch)
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 10.1 | `tests/test_sql_orchestrator.py` | Integration (mocked) | ✅ 29/29 | ✅ Written | ✅ Passed | ✅ 2 cases (simple SELECT, UNION ALL query) | ✅ Clean |
| 10.2 | `tests/test_planner_prompt_builder.py` | Unit | ✅ 5/5 | ✅ Written | ✅ Passed | ✅ 2 cases (cross-table instruction, UNION without ALL forbidden) | ✅ Clean |
| 10.3 | `tests/test_sql_validator.py` | Unit | ✅ 17/17 | ✅ Written | ✅ Passed | ✅ 2 cases (UNION ALL, UNION) | ✅ Clean |
| 10.4 | `tests/test_sql_orchestrator.py` + `tests/test_sql_validator.py` + `tests/test_planner_prompt_builder.py` | Mixed | ✅ 29/29 | ✅ Written | ✅ Passed | ✅ 4 total cases | ✅ Clean |
| 10.5 | Full backend suite | Integration | ✅ 435/435 | N/A | ✅ Passed | N/A | N/A |

### Test Summary (this bugfix batch)
- **Total tests written**: 5 (2 orchestrator + 2 prompt builder + 1 validator case expansion)
- **Total tests passing**: 435 full suite
- **Relevant tests**: 34 targeted passed, 0 failed
- **Layers used**: Unit, Integration (mocked)
- **Approval tests**: None
- **Pure functions created**: None in this slice

## TDD Compliance Status
- **Bugfix 10.x**: Fully TDD-compliant. All tests written before implementation; tests failed (RED) then passed (GREEN) after production code change.
- **Bugfix 11.x**: Fully TDD-compliant. New request-correlation/log-visibility expectations were written first, failed (missing `request_id` propagation and plain visible log line), then passed after the minimal production changes.

## Files Changed (this observability bugfix batch)
| File | Action | What Was Done |
|------|--------|---------------|
| `app/orchestrators/sql_orchestrator.py` | Modified | Switched generated SQL logging to `uvicorn.error`, added `request_id` parameter, and emitted a plain correlated SQL log line |
| `app/routers/chat.py` | Modified | Passed the router-generated `request_id` into `SqlOrchestrator.run()` |
| `tests/test_sql_orchestrator.py` | Modified | Tightened SQL logging assertion to require a visible correlated log message |
| `tests/test_chat_router.py` | Modified | Added assertion that the router passes `request_id` into the orchestrator |

## TDD Cycle Evidence (this observability bugfix batch)
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 11.1 | `tests/test_sql_orchestrator.py` | Integration (mocked) | ✅ 7/7 | ✅ Written | ✅ Passed | ✅ 2 cases (visible SQL log, existing union-all execution still green) | ✅ Clean |
| 11.2 | `tests/test_chat_router.py` | Integration | ✅ 28/28 | ✅ Written | ✅ Passed | ✅ 2 cases (request contains request_id, existing SSE/log path still green) | ✅ Clean |
| 11.3 | `tests/test_sql_orchestrator.py` + `tests/test_chat_router.py` | Mixed | ✅ 35/35 | ✅ Written | ✅ Passed | ✅ 2 files exercised | ✅ Clean |
| 11.4 | Relevant backend tests | Integration | ✅ 35/35 | N/A | ✅ Passed | N/A | N/A |

### Test Summary (this observability bugfix batch)
- **Total tests written**: 2 expectation changes (1 orchestrator, 1 router)
- **Total tests passing**: 35 targeted
- **Relevant tests**: `tests/test_sql_orchestrator.py` (7 passed), `tests/test_chat_router.py` (28 passed)
- **Layers used**: Integration (mocked), Integration
- **Approval tests**: None
- **Pure functions created**: None

## Deviations from Design
None — this bugfix preserves the backend-first read-only SQL orchestration design while fixing the observed runtime gap (single-table scope and missing SQL observability).

## Issues Found
- None.

## Remaining Tasks
None — all tasks complete.

## Workload / PR Boundary
- Mode: single PR (bugfix slice, well under 400-line budget)
- Current work unit: Post-cutover visible SQL logging bugfix
- Boundary: 2 production files + 2 test files; no changes to query generation, validation rules, execution transport, or old fallback behavior
- Estimated review budget impact: ~20 changed lines

## Status
53/53 tasks complete. Ready for verify or archive.
