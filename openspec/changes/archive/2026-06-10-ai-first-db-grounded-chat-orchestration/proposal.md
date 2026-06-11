# Proposal: AI-First, DB-Grounded Chat Orchestration

## Intent

Replace keyword/regex-first deterministic intent detection with an AI semantic planner that interprets full conversation context and emits a typed retrieval plan. Every user turn MUST trigger DB retrieval before producing a final answer — the AI is the planner/context resolver, never the source of truth.

## Scope

### In Scope
- AI planner LLM that outputs validated `RetrievalPlan` (intent, entities[], retrieval_steps[], response_mode)
- Plan executor that runs retrieval steps against registered entity services
- Deterministic synthesizer/formatter pipeline (reuse existing `response_engine` formatters)
- Mandatory retrieval gate — no path answers without DB query
- Multi-entity support in a single turn (planner emits N retrieval steps)
- Semantic follow-up resolution (anaphora, "that one", "the other") via full conversation context
- Keyword/regex heuristics demoted to narrow fallback only
- Plan validation layer (Pydantic) rejecting invalid entities/fields/operations

### Out of Scope
- LLM fine-tuning or custom model training
- Query DAG builder (Option 3 — deferred)
- Real-time streaming of intermediate retrieval steps (deferred)
- Provider-side tool calling as primary path (kept as compatibility layer)
- Cleanup of deprecated `chat_router.py` etc. (deferred to Phase 4)

## Capabilities

> Contract for sdd-spec. Each new capability → `openspec/specs/<name>/spec.md`. Each modified → delta spec in change folder.

### New Capabilities
- `ai-planner`: LLM semantic planner that interprets conversation and outputs validated RetrievalPlan JSON
- `plan-executor`: Deterministic executor that runs retrieval steps from a plan against entity services
- `retrieval-synthesizer`: Synthesis stage combining retrieval results with deterministic formatters + optional LLM rewrite
- `mandatory-retrieal-gate`: Every user turn must attempt DB retrieval before final answer (no direct-model path without retrieval)

### Modified Capabilities
- `chat-tool-calling`: Tool loop becomes fallback/compatibility; planner is primary path; tool definitions derived from registry metadata
- `multi-entity-search`: Entity resolution moves from regex to semantic planner with full conversation context
- `generic-response-engine`: Formatters preserved but invoked by synthesizer stage, not by keyword router
- `entity-registry`: Structural metadata kept; lexical fields (terms, phrases, keywords) deprecated

## Approach

**Option 1 (recommended from exploration)**: LLM Planner → Typed Retrieval Plan → Deterministic Executor → Deterministic Formatter.

1. Planner receives full conversation + registry metadata (entities, fields, tool capabilities)
2. Planner outputs validated JSON plan via Pydantic schema
3. Executor runs `retrieval_steps` against `EntityService` protocol
4. Synthesizer applies existing formatters; optional LLM rewrite for naturalness
5. Empty retrieval → deterministic "not found" with `retrieval_attempted=true` tag
6. Ambiguity → clarifying question before retrieval

Existing infrastructure preserved: `EntityRegistry` singleton, `EntityService` protocol, `ToolRegistry`, `BreweryService`, all formatters, system prompt builder.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-backend/app/routers/chat.py` | Modified | Replace `route_query()` with planner → executor → synthesizer pipeline |
| `cortex-backend/app/utils/response_engine.py` | Modified | Remove `detect_intent()` as primary; keep formatters; add synthesizer stage |
| `cortex-backend/app/utils/entity_registry.py` | Modified | Remove regex-based resolution; keep structural metadata + service binding |
| `cortex-backend/app/schemas/entity_registry.py` | Modified | Deprecate lexical fields; keep structural `EntityMetadata` |
| `cortex-backend/app/planner/` | New | Planner LLM wrapper, prompt builder, plan schema (Pydantic) |
| `cortex-backend/app/executor/` | New | Plan executor — runs retrieval steps against services |
| `cortex-backend/app/synthesizer/` | New | Synthesis stage — formatters + optional LLM rewrite |
| `cortex-backend/app/tools/definitions.py` | Modified | Tool definitions derived from registry metadata, not hand-written |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Planner hallucinates invalid retrieval steps | High | Strict Pydantic validation + fallback to clarifying question |
| Planner token cost per turn | Medium | Cache registry metadata prompt fragment; use cheaper model for planner |
| Migration breaks existing parity tests | Medium | Keep old tests during transition; add planner tests; verify formatter contracts |
| Empty-retrieval reintroduces parametric knowledge | High | Synthesizer tags `retrieval_attempted=true`; system prompt forbids ungrounded answers |
| Multi-entity ambiguity in one turn | Medium | Planner reports `ambiguity` field; system asks user to clarify |

## Rollback Plan

1. Revert `chat.py` router to call `route_query()` instead of planner pipeline
2. Keep new `planner/`, `executor/`, `synthesizer/` directories but disabled behind feature flag
3. Restore `response_engine.detect_intent()` as primary path
4. All deprecated lexical fields in `EntityMetadata` remain present (not deleted) for quick re-enable

## Dependencies

- Prior change `unified-chat-response-architecture` (archived) — provides registry, services, formatters foundation
- Pydantic 2.x (already in requirements)
- LLM provider with structured output support (already available)

## Success Criteria

- [ ] Every user turn triggers at least one DB retrieval before final answer (verified by test)
- [ ] Planner produces valid RetrievalPlan for 95%+ of test queries (invalid → clarifying question)
- [ ] Existing formatter output contract unchanged (parity tests pass)
- [ ] Multi-entity queries return combined results from N retrieval steps
- [ ] No path produces ungrounded parametric answers (all tagged `retrieval_attempted=true` or `retrieval_result=empty`)
- [ ] 671+ existing tests still pass; new planner tests added
