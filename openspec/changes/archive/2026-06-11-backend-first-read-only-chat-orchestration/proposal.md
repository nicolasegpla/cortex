# Proposal: Backend-First Read-Only Chat Orchestration

## Intent

Replace legacy AI-planner pipeline with backend-first SQL orchestration as the **only** production path. LLM: (1) generate read-only SQL from `(user_query, schema_context)`, (2) translate DB results to NL. No feature flag, no fallback.

## Scope

### In Scope
- Schema introspection before LLM call
- SQL generation: `human_query_to_sql(human_query)`
- Read-only SQL validator
- SQL execution via Supabase
- NL synthesis from DB results
- **Remove** old planner → executor → synthesizer pipeline
- **Remove** `SQL_ORCHESTRATOR_ENABLED` flag and conditional routing
- **Remove** tool-calling fallback
- New pytest suite

### Out of Scope
- Write/mutation operations
- Multi-step chained SQL
- Any fallback to old path

## Capabilities

### New Capabilities
- `sql-generation`: One read-only SELECT from user intent + schema
- `sql-validation`: Blocks mutations, multi-statement, injection
- `nl-translation`: LLM synthesizes NL from DB results

### Modified Capabilities
- `ai-planner`: SQL-only planner, no RetrievalPlan JSON
- `plan-executor`: Raw SQL execution, no entity dispatch
- `retrieval-synthesizer`: LLM replaces deterministic formatter

### Removed Capabilities
- `chat-tool-calling`: Removed entirely

## Approach

`SqlOrchestrator` sole handler in `chat.py`. Per turn: (1) introspect schema, (2) LLM generates SQL, (3) validate, (4) execute, (5) LLM translates, (6) stream SSE. Old modules deleted.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/routers/chat.py` | Modified | `SqlOrchestrator` sole handler |
| `app/core/config.py` | Modified | Remove `SQL_ORCHESTRATOR_ENABLED` |
| `app/planner/engine.py` | Modified | `PlannerEngine` → `SqlPlanner` |
| `app/planner/prompt_builder.py` | Modified | `build_sql_prompt` |
| `app/executor/engine.py` | Replaced | Entity dispatch → raw SQL |
| `app/synthesizer/engine.py` | Modified | Formatter → `NlSynthesizer` |
| `app/services/schema_introspection.py` | New | Schema fetch |
| `app/validators/sql_validator.py` | New | SQL safety |
| `app/orchestrators/sql_orchestrator.py` | New | Pipeline |
| `tests/test_sql_validator.py` | New | Safety |
| `tests/test_sql_orchestrator.py` | New | Integration |
| `tests/test_schema_introspection.py` | New | Format |
| `tests/test_chat_router.py` | Modified | Remove flag tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Unsafe SQL | Medium | Blacklist + structural checks + read-only DB user |
| Two LLM calls latency | High | Tight token budgets |
| Breaking existing flows | Medium | Full pytest regression |

## Rollback Plan

No runtime toggle. Revert via `git revert <merge-commit>` or checkout prior tag.

## Dependencies

- Supabase raw SQL execution
- AI SDK 5 two-call pattern

## Success Criteria

- [ ] Schema fetched before any LLM call
- [ ] Validator blocks 100% unsafe patterns
- [ ] 90%+ correct answers for entity queries
- [ ] SSE contract unchanged
- [ ] New components >= 80% pytest coverage
- [ ] Zero `SQL_ORCHESTRATOR_ENABLED` references
- [ ] Old planner/executor modules removed
