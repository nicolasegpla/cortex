# Apply Progress: ai-first-db-grounded-chat-orchestration

## Change

- Name: `ai-first-db-grounded-chat-orchestration`
- Mode: Strict TDD
- Delivery: force-chained / feature-branch-chain
- Slice: 3 of 3

## Completed Tasks

- [x] 1.1 Create `app/planner/__init__.py` with module exports
- [x] 1.2 Create `app/planner/schemas.py` with `RetrievalPlan`, `RetrievalStep`, `ResponseMode`, `Ambiguity` Pydantic models
- [x] 1.3 Create `app/planner/prompt_builder.py` — `build_planner_prompt(registry_metadata, conversation_history) → str`
- [x] 1.4 Create `app/planner/engine.py` — `PlannerEngine.call(context) → RetrievalPlan` with Pydantic validation + retry on `ValidationError`
- [x] 1.5 Add `supported_operations: list[str]` to `EntityMetadata` in `app/schemas/entity_registry.py`
- [x] 1.6 Write unit tests: `RetrievalPlan` validation
- [x] 2.1 Create `app/executor/__init__.py` with module exports
- [x] 2.2 Create `app/executor/engine.py` — `execute_plan(plan, registry) → list[RetrievalResult]`
- [x] 2.3 Create `app/synthesizer/__init__.py` with module exports
- [x] 2.4 Create `app/synthesizer/engine.py` — `SynthesizerEngine.run(retrieval_data, plan, entity_metadata) → dict`
- [x] 2.5 Write unit tests for executor + synthesizer
- [x] 3.1 Wire `chat.py` to `planner.run() → executor.run() → synthesizer.run()` with SSE preserved and deprecated fallback retained
- [x] 3.2 Deprecate `detect_intent()`, `resolve_entity()`, `route_query()` while keeping formatter contracts
- [x] 3.3 Deprecate lexical `EntityRegistry.resolve()` and expose structured prompt metadata for planner/tool generation
- [x] 3.4 Derive tool definitions from registry metadata via `get_prompt_terms()`
- [x] 3.5 Keep `test_chat_*` and `test_response_engine.py` regression suite green with `response_path=ai-planner` coverage
- [x] 3.6 Add end-to-end planner → executor → synthesizer integration coverage with mock LLM JSON
- [x] 4.1 Add `response_path=ai-planner` log field to planner/executor/synthesizer entry points and successful router pipeline path
- [x] 4.2 Document planner validation rejection + retry behavior in `app/planner/engine.py`
- [x] 4.3 Verify formatter parity against legacy engine contracts through response-engine parity tests and full chat regression suite

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `cortex-backend/app/routers/chat.py` | Modified | Added async AI planner pipeline, planner response synthesis, language detection, and controlled fallback to deprecated router |
| `cortex-backend/app/planner/engine.py` | Modified | Added async `run()`, registry-aware validation, retry logging, and documented rejection behavior |
| `cortex-backend/app/executor/engine.py` | Modified | Added `run()` entry point with `response_path=ai-planner` logging |
| `cortex-backend/app/executor/__init__.py` | Modified | Exported executor `run()` |
| `cortex-backend/app/synthesizer/engine.py` | Modified | Added `language` support and pipeline logging without changing formatter contracts |
| `cortex-backend/app/utils/response_engine.py` | Modified | Marked keyword router helpers as deprecated while preserving formatters and legacy parity path |
| `cortex-backend/app/utils/entity_registry.py` | Modified | Marked `resolve()` deprecated and expanded `get_prompt_terms()` with structured registry metadata |
| `cortex-backend/app/tools/definitions.py` | Modified | Rebuilt tool definitions from entity metadata and exposed `build_tool_definitions()` |
| `cortex-backend/tests/test_chat_router.py` | Modified | Added router expectations for planner path + `response_path=ai-planner` |
| `cortex-backend/tests/test_planner_engine.py` | Modified | Added async planner runner coverage |
| `cortex-backend/tests/test_entity_registry.py` | Modified | Added structured registry metadata coverage |
| `cortex-backend/tests/test_ai_planner_pipeline.py` | Created | Added planner → executor → synthesizer integration test |
| `cortex-backend/tests/test_tool_definitions.py` | Created | Added dynamic tool-definition regression test |
| `openspec/changes/ai-first-db-grounded-chat-orchestration/tasks.md` | Modified | Marked slice 3 and cleanup tasks complete |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 3.1 / 3.5 | `tests/test_chat_router.py` | Integration | `PYTHONPATH=. pytest tests/test_chat_router.py` -> 71 passed | Added planner-path assertions before wiring | Targeted planner-path tests passed after router pipeline changes | Reused existing factual + SSE cases plus new planner/log cases | Small helper extraction in router for stream collection and language detection |
| 3.3 / 3.4 | `tests/test_entity_registry.py`, `tests/test_tool_definitions.py` | Unit | `PYTHONPATH=. pytest tests/test_response_engine.py` -> 43 passed | Added failing assertions for structured prompt metadata and dynamic tool definitions | New registry + tool-definition tests passed after metadata changes | Covered both metadata exposure and generated parameter shapes | Kept generation in one module with metadata-driven mapping |
| 3.6 / 4.1 | `tests/test_ai_planner_pipeline.py`, `tests/test_planner_engine.py` | Integration + Unit | `PYTHONPATH=. pytest tests/test_planner_engine.py tests/test_executor_engine.py tests/test_synthesizer_engine.py` -> prior slice suite green | Added failing async planner runner and end-to-end pipeline tests first | Async planner + pipeline tests passed after `PlannerEngine.run()` and executor `run()` were added | Covered sync + async planner entry points and end-to-end grounded count flow | Shared parsing/validation logic between sync and async planner paths |

## Test Summary

- Safety net: `PYTHONPATH=. pytest tests/test_response_engine.py` -> 43 passed
- Safety net: `PYTHONPATH=. pytest tests/test_chat_router.py` -> 71 passed
- Targeted RED -> GREEN cycles: 7 new/updated tests passed
- Regression: `PYTHONPATH=. pytest tests/test_chat_router.py tests/test_chat_router_unit.py tests/test_chat_detail.py tests/test_chat_table.py tests/test_chat_grounding.py tests/test_chat_schemas.py tests/test_response_engine.py` -> 322 passed
- Pipeline suite: `PYTHONPATH=. pytest tests/test_planner_engine.py tests/test_planner_validation.py tests/test_executor_engine.py tests/test_synthesizer_engine.py tests/test_ai_planner_pipeline.py tests/test_entity_registry.py tests/test_tool_definitions.py` -> 51 passed

## Deviations From Design

- Retained deprecated `route_query()` fallback in the router when planner output cannot be parsed or validated. This preserves current behavior during migration while still making the planner pipeline the primary path.

## Issues Found

- Local pytest execution requires `PYTHONPATH=.` from `cortex-backend`; without it, `tests/conftest.py` cannot import `app`.

## Workload / PR Boundary

- Mode: chained PR slice
- Current work unit: PR 3 / integration + cleanup
- Boundary: backend pipeline wiring, parity/regression coverage, and artifact finalization only
- Estimated review budget impact: focused final slice, no frontend changes required for this work

## Status

19/19 tasks complete for this change. Ready for verify.
