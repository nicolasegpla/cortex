## Exploration: Backend-First Read-Only Chat Orchestration

### Current State

The Cortex chat pipeline already has a **three-phase backend architecture** that is closer to the target than a typical LLM-as-executor setup:

1. **PlannerEngine** (`app/planner/engine.py`) — Calls the LLM to generate a structured `RetrievalPlan` (JSON with entity_key, operation, params). Validates the plan against the EntityRegistry.
2. **ExecutorEngine** (`app/executor/engine.py`) — Executes the validated plan by dispatching to service methods (`count()`, `search()`, `inspect()`). Zero LLM involvement.
3. **SynthesizerEngine** (`app/synthesizer/engine.py`) — Formats retrieval results into plain-text answers deterministically. Zero LLM involvement.

This "ai-planner" path is the **primary** response path in `chat.py`. Two fallback paths exist:
- **Tool Loop** (`model-tools`) — LLM chooses tools via `stream_chat_with_tools`, backend executes them, LLM formats the final answer. This is the true LLM-as-executor path.
- **Direct Model** (`model-direct`) — Plain chat completion with no tools.

The frontend (`ChatPage.tsx` + `store.ts`) sends the full conversation history to `/chat/stream` via SSE and receives `delta`/`done`/`error` events. The frontend is thin and already backend-oriented.

DB access today is through **Supabase PostgREST** (`BreweryService` → `supabase.table(...)`), not raw SQL. The service layer abstracts query construction (ilike, cs, eq, ordering, pagination).

### Affected Areas

- `app/routers/chat.py` — Core chat endpoint; orchestration logic lives here. Must be rewritten or augmented with the new SQL-orchestration flow.
- `app/planner/engine.py` + `app/planner/schemas.py` — Currently emits structured `RetrievalPlan` JSON. Could be repurposed to emit SQL strings, or replaced by a SQL-generating prompt.
- `app/executor/engine.py` — Currently dispatches to service methods. Would be replaced by a SQL executor.
- `app/synthesizer/engine.py` — Currently deterministic formatting. Would be replaced by LLM-based natural-language translation of query results.
- `app/services/brewery_service.py` — Read-only query methods (`search`, `inspect`, `count`) are the current execution layer. Raw SQL execution would bypass this.
- `app/tools/` + `app/utils/chat_router.py` + `app/utils/response_engine.py` — Tool loop and deprecated DB-first router would be obsoleted.
- `app/adapters/base.py` + provider adapters — LLM interface remains, but usage pattern changes (two LLM calls per request: SQL generation + NL translation).
- `tests/test_chat_router.py` — 1200+ lines of tests tightly coupled to the current tool-loop and planner paths. Major rewrite required.
- `tests/test_planner_engine.py`, `tests/test_executor_engine.py`, `tests/test_synthesizer_engine.py` — Would need replacement tests for SQL generation/validation/execution.

### Approaches

1. **Pure SQL Orchestrator (Greenfield)** — Build a new `SqlOrchestrator` module. Flow: user message → LLM generates SQL → backend validates SQL is read-only → backend executes SQL via Supabase RPC/raw postgres → backend sends results + original question to LLM for NL translation → stream response.
   - Pros: Exactly matches user's stated architecture; maximum backend control; natural language flexibility for complex analytical queries.
   - Cons: SQL validation must be bulletproof; schema drift requires prompt updates; two LLM calls add latency/cost; requires raw SQL execution infrastructure not currently present; obsoletes significant existing working code.
   - Effort: High

2. **Planner → SQL (Evolutionary)** — Keep the PlannerEngine but change its output schema from `RetrievalPlan` to a SQL string. Keep the executor but have it run SQL instead of service methods. Add a new "translator" step that sends results to the LLM for NL formatting.
   - Pros: Reuses existing orchestration structure (planner/executor/synthesizer); migration is incremental; existing tests can be adapted.
   - Cons: Planner now needs deep SQL/schema knowledge; hybrid state during migration is complex.
   - Effort: Medium-High

3. **SQL-as-a-Tool (Incremental)** — Add a new `execute_sql` tool to the existing tool registry. The backend validates the SQL before execution. The LLM can choose to use this tool or existing tools. Gradually shift to SQL-only as confidence grows.
   - Pros: Minimal disruption; can A/B test SQL vs structured plans; gradual migration; leverages existing tool infrastructure.
   - Cons: LLM still acts as executor (chooses when to use SQL); doesn't fully achieve backend-first orchestration.
   - Effort: Medium

4. **Backend NL Translation of Deterministic Results** — Keep the current planner/executor/synthesizer architecture, but replace the deterministic `SynthesizerEngine` with an LLM-based translation step. The backend still controls execution (planner + executor), but adds LLM natural-language formatting.
   - Pros: Closest to current working code; backend already controls execution; smallest test churn; read-only safety is already guaranteed.
   - Cons: Doesn't add SQL generation capability; LLM translation adds latency and may reduce determinism.
   - Effort: Low-Medium

### Recommendation

**Approach 2 (Planner → SQL Evolutionary)** is the best fit for this codebase because:

- The existing planner/executor/synthesizer architecture is already well-structured and tested.
- The migration can be done incrementally: first teach the planner to emit SQL, then add a SQL validator, then add a SQL executor, then replace synthesis with LLM translation.
- The frontend contract (SSE `/chat/stream`) remains unchanged.
- It respects the strict TDD constraint by allowing incremental test-driven changes.

However, given the user's explicit architectural intent (backend generates SQL, validates it, executes it, sends results to LLM for translation), we should design the change as a **new orchestration layer** that supersedes the current paths, not as an extension of the tool loop.

### Risks

1. **SQL Safety / Read-Only Validation** — Even with read-only whitelisting, LLM-generated SQL could be harmful (CPU-intensive queries, recursive CTEs, pg_read_file, etc.). A robust validator must blacklist dangerous functions and patterns, not just mutation keywords.
2. **Schema Drift** — The SQL generation prompt must include the current DB schema. Schema changes require prompt updates. A schema introspection service should be built to auto-refresh this.
3. **Latency & Cost** — Two LLM calls per request (SQL generation + NL translation) vs current one-call planner path. The current deterministic synthesis is free and fast.
4. **Supabase SQL Execution** — Raw SQL execution via Supabase requires either: (a) a stored RPC function with security definer, (b) direct postgres connection (not PostgREST), or (c) the `supabase.rpc()` method calling a Postgres function. This is a new infrastructure dependency.
5. **Test Rewrite Burden** — `test_chat_router.py` is 1200+ lines tightly coupled to the current flow. A new orchestrator requires a new test suite.
6. **Migration Seam Complexity** — The old tool loop, planner, and deprecated DB-first router must be cleanly removed or isolated to avoid dead code.
7. **LLM SQL Hallucination** — LLMs may generate invalid SQL, wrong table/column names, or non-existent functions. Retry logic (already present in PlannerEngine) must be adapted.

### Ready for Proposal

**Yes.** The codebase has a solid foundation (planner/executor/synthesizer separation, entity registry, robust tests) that can be evolved into the target architecture. The proposal should define:

1. A new `SqlOrchestrator` class/module that replaces the current chat flow.
2. Schema introspection service (fetch tables/columns from Supabase).
3. SQL generation prompt and validation rules.
4. SQL execution strategy (Supabase RPC vs direct postgres).
5. LLM-based result translation step.
6. Incremental migration plan with clear deprecation of tool loop and old router.
7. Test strategy for the new orchestrator.

The orchestrator should tell the user: "The exploration is complete. The current architecture already has backend-controlled planning and execution, which gives us a strong migration base. The main work is replacing structured plans with SQL generation, adding a read-only SQL validator, and introducing LLM-based natural language translation of results. I'm ready to write the proposal."
