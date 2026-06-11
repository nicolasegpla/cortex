# Tasks: AI-First DB-Grounded Chat Orchestration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650–750 (new + modified across 13 files) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation: schemas + planner infrastructure | PR 1 | Base = feature/ai-first-chat; schemas, prompt builder, planner engine |
| 2 | Executor + synthesizer engines | PR 2 | Base = PR 1 branch; plan executor, synthesis engine, unit tests |
| 3 | Integration: wire pipeline + cleanup | PR 3 | Base = PR 2 branch; chat.py wiring, response_engine deprecations, regression tests |

## Phase 1: Foundation — Schemas + Planner Infrastructure

- [x] 1.1 Create `app/planner/__init__.py` with module exports
- [x] 1.2 Create `app/planner/schemas.py` with `RetrievalPlan`, `RetrievalStep`, `ResponseMode`, `Ambiguity` Pydantic models
- [x] 1.3 Create `app/planner/prompt_builder.py` — `build_planner_prompt(registry_metadata, conversation_history) → str`
- [x] 1.4 Create `app/planner/engine.py` — `PlannerEngine.call(context) → RetrievalPlan` with Pydantic validation + retry on `ValidationError`
- [x] 1.5 Add `supported_operations: list[str]` to `EntityMetadata` in `app/schemas/entity_registry.py`
- [x] 1.6 Write unit tests: `RetrievalPlan` validation (unknown entity, bad operation, missing params → ValueError)

## Phase 2: Executor + Synthesizer Engines

- [x] 2.1 Create `app/executor/__init__.py` with module exports
- [x] 2.2 Create `app/executor/engine.py` — `execute_plan(plan, registry) → list[RetrievalResult]`, sequential step dispatch to `EntityService`
- [x] 2.3 Create `app/synthesizer/__init__.py` with module exports
- [x] 2.4 Create `app/synthesizer/engine.py` — `SynthesizerEngine.run(retrieval_data, plan, entity_metadata) → dict`, wraps formatters, enforces empty-retrieval guard, sets `retrieval_attempted=true`
- [x] 2.5 Write unit tests: executor dispatches to correct service method (mock `EntityRegistry` + `BreweryService`); synthesizer enforces retrieval gate on empty results

## Phase 3: Integration — Wire Pipeline + Cleanup

- [x] 3.1 Modify `app/routers/chat.py` — replace `route_query()` call with `planner.run() → executor.run() → synthesizer.run()` pipeline; preserve SSE stream path
- [x] 3.2 Modify `app/utils/response_engine.py` — deprecate `detect_intent()`, `resolve_entity()`, `route_query()` (keep formatters for synthesizer)
- [x] 3.3 Modify `app/utils/entity_registry.py` — deprecate term-based `resolve()`; keep `get_by_key()`, `register()`, enhance `get_prompt_terms()` for planner
- [x] 3.4 Modify `app/tools/definitions.py` — derive tool definitions from registry metadata via `get_prompt_terms()`
- [x] 3.5 Write regression tests: all 29 existing `test_chat_*` / `test_response_engine` tests pass with `response_path=ai-planner` log tag
- [x] 3.6 Write integration test: planner → executor → synthesizer end-to-end with mock LLM returning valid plan JSON

## Phase 4: Cleanup / Documentation (deferred to PR 3)

- [x] 4.1 Add `response_path=ai-planner` log field to all new module entry points
- [x] 4.2 Add docstring to `app/planner/engine.py`: document plan validation rejection + retry behavior
- [x] 4.3 Verify formatter contracts unchanged — run parity comparison against old engine output
