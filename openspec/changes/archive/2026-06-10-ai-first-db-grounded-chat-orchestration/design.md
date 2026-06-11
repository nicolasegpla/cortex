# Design: AI-First, DB-Grounded Chat Orchestration

## Technical Approach

Replace keyword/regex intent detection (`detect_intent`, `resolve_entity` in `response_engine.py`) with an AI semantic planner that consumes full conversation context and emits a Pydantic-validated `RetrievalPlan`. The deterministic executor runs each retrieval step against registered `EntityService` protocol adapters. Existing formatters (`format_count_response`, `format_detail_response`, etc.) are preserved but invoked by a new synthesizer stage that enforces the mandatory retrieval gate — no answer leaves without `retrieval_attempted` recorded.

## Architecture Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Planner LLM model | Use the same provider/model from the request (no separate planner model) | Avoids dual-API-key complexity. Pydantic validation catches invalid plans. |
| Plan schema location | `app/planner/schemas.py` — Pydantic `RetrievalPlan`, `RetrievalStep` | Follows project convention of `app/schemas/` for models. Pydantic 2.x with `model_validate` + `ValidationError` for rejection. |
| Executor-service binding | Executor reads `entity_key` from plan step, resolves `EntityRegistration` via `EntityRegistry.get_by_key()`, calls service method | No new abstractions. Same `EntityRegistry` singleton and `EntityService` protocol from predecessor change. |
| Synthesizer vs formatters | Synthesizer WRAPS formatters — does not replace them | Formatters (`format_count_response`, `format_detail_response`, `format_enumeration_response`) already have stable contracts. Synthesizer adds: empty-retrieval guard, `retrieval_attempted` tagging, multi-entity merging. |
| Plan validation boundary | Strict Pydantic: unknown entity_key, unsupported operation, or missing required params → reject plan → planner retries or emits ambiguity | The LLM is the planner, not the executor. Bad plans must be caught before touching the DB. |
| Follow-up resolution | Planner receives full message history (system prompt + all user/assistant turns); registry metadata injected once as prompt fragment | No separate follow-up module. Anaphora resolution is the LLM's job via conversation context. |
| Tool calling coexistence | When `enable_tools=true`, planner runs first. If plan is valid, execute it and return grounded answer without entering tool loop. If planner rejects (ambiguity or invalid), fall through to tool loop. | Backward-compatible. `response_engine` keyword path becomes fallback only during migration. |

## Data Flow

```
User turn + history
      │
      ▼
┌──────────────────┐
│   AI Planner     │  Registry metadata as prompt fragment
│  (provider LLM)  │  Full conversation context
│  → RetrievalPlan │
└──────┬───────────┘
       │
       ▼ Pydantic validation
  ┌────┴────┐
  │  valid? │──No──→ ambiguity → clarifying question (no retrieval)
  └────┬────┘       or retry with validation error feedback
       │ Yes
       ▼
┌──────────────────┐
│  Plan Executor   │  For each step: EntityRegistry.get_by_key(step.entity_key)
│  Runs steps in   │  → service.{operation}(**step.params)
│  order, collects │  → [{entity_key, operation, result, error?}]
│  retrieval_data[]│
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   Synthesizer    │  If retrieval_data is empty: empty-state
│  Wraps formatters│  If single entity + single step: delegate to formatter
│  Tags retrieval  │  If multi-entity: merge results → format response
│  → final answer  │  Always sets retrieval_attempted=true
└──────────────────┘
       │
       ▼
   SSE stream (existing)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/planner/__init__.py` | Create | Planner module init |
| `app/planner/schemas.py` | Create | `RetrievalPlan`, `RetrievalStep`, `ResponseMode` Pydantic models |
| `app/planner/prompt_builder.py` | Create | Builds planner system prompt from registry metadata |
| `app/planner/engine.py` | Create | Calls provider LLM with structured output, validates response |
| `app/executor/__init__.py` | Create | Executor module init |
| `app/executor/engine.py` | Create | `execute_plan(plan, registry) → list[RetrievalResult]` |
| `app/synthesizer/__init__.py` | Create | Synthesizer module init |
| `app/synthesizer/engine.py` | Create | Wraps formatters, enforces retrieval gate, merges multi-entity results |
| `app/routers/chat.py` | Modify | Replace `route_query()` call with `plan → execute → synthesize` pipeline |
| `app/utils/response_engine.py` | Modify | Deprecate `detect_intent()` + `resolve_entity()` + `route_query()` (keep formatters) |
| `app/schemas/entity_registry.py` | Modify | Deprecate lexical keywords; keep structural metadata + add `supported_operations: list[str]` |
| `app/utils/entity_registry.py` | Modify | Deprecate term-based `resolve()`; keep `get_by_key()`, `register()`, `get_prompt_terms()` enhanced for planner |
| `app/tools/definitions.py` | Modify | Tool definitions derived from registry metadata via `get_prompt_terms()` |

## Interfaces / Contracts

```python
# app/planner/schemas.py
from enum import Enum
from pydantic import BaseModel

class ResponseMode(str, Enum):
    DIRECT = "direct"
    CLARIFY = "clarify"

class RetrievalStep(BaseModel):
    entity_key: str
    operation: Literal["count", "search", "inspect"]
    params: dict = Field(default_factory=dict)
    reason: str  # planner's reasoning for tracing

class RetrievalPlan(BaseModel):
    entities: list[str]
    steps: list[RetrievalStep] = Field(min_length=1)
    response_mode: ResponseMode
    ambiguity: str | None = Field(default=None, description="If set, ask user this question")
```

`execute_plan()` returns `list[dict]` per step with `{entity_key, operation, result: list|int, error?: str}`. Synthesizer consumes this + entity metadata → plain-text answer.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `RetrievalPlan` validation rejects invalid steps | Parametrize: unknown entity, bad operation, missing params → `ValidationError` |
| Unit | Plan executor dispatches to correct service method | Mock `EntityRegistry` + `BreweryService`; verify `count()`, `search()`, `inspect()` called per step |
| Unit | Synthesizer enforces retrieval gate on empty results | Empty `retrieval_data` → answer tags `retrieval_attempted=true`, no invented facts |
| Integration | Planner → executor → synthesizer end-to-end | Mock LLM returning valid plan JSON; verify full pipeline output matches formatter contracts |
| Regression | All 29 existing `test_chat_*` / `test_response_engine` tests still pass | Add `response_path=ai-planner` log tag; run parity comparison against old engine output |

## Migration / Rollout

Phase 1 (this change): Build planner/executor/synthesizer alongside existing engine. Add `response_path=ai-planner` log. Compare outputs in shadow mode. Cut over when parity tests pass.

Phase 2 (deferred): Remove keyword detection methods from `response_engine.py`, simplify `EntityMetadata` to structural-only.

## Open Questions

- [ ] Which provider/model for planner? Default: same as request model. Risk: small models may fail structured JSON. Mitigation: Pydantic validation catches this.
- [ ] Should multi-step retrieval be sequential or parallel? Default: sequential (simpler ordering, no concurrency bugs). Defer parallel to Phase 2.
