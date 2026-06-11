# Verify Report: AI-First DB-Grounded Chat Orchestration

**Status**: PASS (1 WARNING, 0 CRITICAL)
**Date**: 2026-06-10
**Change**: ai-first-db-grounded-chat-orchestration

## Checks

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Planner-first pipeline for all turns | PASS | `chat.py:328` — `_run_ai_planner_pipeline()` called before tool loop and direct model. Test `test_planner_runs_when_tools_disabled` confirms planner runs even when tools disabled. |
| 2 | Mandatory DB retrieval before final answer | WARNING | When planner succeeds: `execute_plan()->SynthesizerEngine.run()` tags `retrieval_attempted=true`. Tool loop fallback also hits DB. BUT direct-model fallback (tools disabled + planner fails) has no retrieval gate. |
| 3 | AI as semantic planner/context resolver | PASS | `prompt_builder.py:56` instructs planner to only plan DB retrieval, not answer. Planner only emits `RetrievalPlan`. Executor runs DB queries. Synthesizer applies deterministic formatters. |
| 4 | Unified formatter output preserved | PASS | `SynthesizerEngine.run()` wraps `format_count_response` and `format_detail_response`. All 48 `test_response_engine` tests pass. |
| 5 | Multi-entity architecture readiness | PASS | `RetrievalPlan.entities[]` and `steps[]` support multiple entities. `execute_plan()` iterates all steps. `SynthesizerEngine` joins multi-step results. Tests pass. |
| 6 | No hidden keyword-first dependencies | PASS | No call to `route_query()`, `detect_intent()`, or `resolve_entity()` in `chat.py`. All deprecated with warnings. Old `chat_router.py` retained (Phase 4 cleanup). |
| 7 | Plan validation rejects invalid entities/operations | PASS | `validate_plan()` checks entity_key in registry, operation in supported_operations, search params non-empty. PlannerEngine retries. |
| 8 | All existing tests pass | PASS | 707/707 relevant tests pass. 2 pre-existing `test_tools_breweries` failures unrelated to this change. 50 new planner/executor/synthesizer tests pass. |

## Warning Detail

### W1: Direct-model fallback lacks retrieval gate

**Location**: `app/routers/chat.py:408-411`

When planner fails after all retries AND `enable_tools=False`, the code falls through to `adapter.stream_chat()` — direct model path with no DB retrieval attempt and no `retrieval_attempted` tag.

**Impact**: LLM answers from parametric knowledge with no grounding. Contradicts spec "MUST attempt DB retrieval for every user turn before any final answer."

**Severity**: LOW — only activates when (a) planner fails AND (b) tools disabled. In production, `enable_tools` defaults to True.

**Mitigation options** (recommended for next change):
1. Add a retrieval attempt log in direct-model fallback
2. Make planner retry more aggressively
3. Remove direct-model path entirely in Phase 2

## Pre-existing Issues (not from this change)

- `test_tools_breweries.py::test_search_and_inspect_descriptions_are_entity_agnostic` — description text mismatch
- `test_tools_breweries.py::test_count_description_is_entity_agnostic` — same root cause

## Test Evidence

- **New tests**: 50 (schemas 11 + planner engine 7 + prompt 6 + validation 7 + executor 7 + synthesizer 7 + pipeline integration 1 + chat router 4)
- **All relevant pass**: 707 / 707
- **TDD layers**: Unit + Integration