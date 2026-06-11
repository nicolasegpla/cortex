## Exploration: AI-First, DB-Grounded Chat Orchestration

### Current State

The chat stack has a **dual-path architecture** with a DB-first deterministic router and an LLM tool-loop fallback:

1. **`cortex-backend/app/routers/chat.py`** — Main orchestrator:
   - If `enable_tools && adapter.supports_tools()`: injects entity-aware system prompt, calls `route_query()` for deterministic DB-first handling. If handled, returns immediately. Otherwise enters LLM tool loop (`stream_chat_with_tools`).
   - If tools disabled/unsupported: streams direct LLM response with **zero DB retrieval**.
   - In the tool loop, if model returns no tool calls, it streams model prose directly — **no mandatory retrieval**.

2. **`cortex-backend/app/utils/response_engine.py`** — Generic response engine (replaced legacy `chat_router.py`):
   - `resolve_entity()` → term matching via regex `\bterm\b`, falls back to target search across all services.
   - `detect_intent()` → regex/phrase-list ladder: count phrases → field keywords → table keywords → enumeration phrases → detail patterns.
   - `route_query()` → `if intent.type == ...` dispatch ladder calling `service.count()`, `service.search()`, `service.inspect()`.
   - Formatters (`format_count_response`, `format_field_response`, `format_detail_response`, `format_enumeration_response`) are deterministic and entity-agnostic via registry metadata.

3. **`cortex-backend/app/utils/entity_registry.py`** — Singleton registry:
   - `register(metadata, service)` binds entity metadata + service.
   - `resolve(messages)` scans latest user message for entity terms via regex.
   - `search_entities(target)` searches all services, returns entity only if exactly one matches.

4. **`cortex-backend/app/schemas/entity_registry.py`** — `EntityMetadata` model:
   - Mixes **structural metadata** (`fields`, `display_order`, `search_field`, `service`, `tool_names`) with **lexical understanding** (`terms_es/en`, `count_phrases_es/en`, `enumeration_phrases`, field `keywords_es/en`).

5. **Tools layer** (`app/tools/definitions.py`, `app/tools/breweries.py`, `app/tools/registry.py`):
   - OpenAI-format tool definitions with brewery-specific parameter schemas.
   - Tool handlers bind directly to `BreweryService` methods.
   - `ToolRegistry` mirrors `ProviderRegistry` pattern — whitelisted execution.

6. **Deprecated but present**:
   - `chat_router.py`, `chat_detail.py`, `chat_table.py`, `chat_grounding.py` — all marked `@deprecated`, kept for diff verification.

### Where Deterministic Keyword Logic Still Dominates

| Component | Keyword/Regex Usage |
|-----------|-------------------|
| `response_engine.resolve_entity()` | `re.search(r"\b" + term + r"\b", lowered)` for entity term matching |
| `response_engine.detect_intent()` | `count_phrases_es/en` regex match → `field.keywords_es/en` regex match → `_TABLE_KEYWORDS` regex → `_DETAIL_PATTERNS` triggers/followups regex → `enumeration_phrases` regex |
| `response_engine._detect_field_lookup()` | Field keyword regex + connector regex `(de la\|del\|de\|of the\|of\|for)` |
| `response_engine._detect_enumeration()` | Trigger word regex + `enumeration_phrases` mapping regex |
| `response_engine._detect_detail()` | Trigger/followup regex + entity term regex + target extraction |
| `entity_registry.resolve()` | Entity term regex across all registered entities |
| `entity_registry.search_entities()` | Service search with target, returns only if exactly 1 match |
| `chat_router.py` (deprecated) | Same patterns, brewery-hardcoded |

**Critical gap**: The system prompt tells the model "use tools for factual questions," but if the model chooses NOT to call tools, the response path (`model-tools-no-tool-calls`) answers without any DB query. This violates the new "always query DB first" requirement.

### What Can Be Preserved as Infrastructure

| Component | Verdict | Rationale |
|-----------|---------|-----------|
| `EntityRegistry` singleton pattern | **Keep** | Service binding and metadata lookup are solid. Remove regex-based resolution methods. |
| `EntityMetadata` / `EntityField` schemas | **Keep partially** | Structural fields (`fields`, `display_order`, `search_field`, `tool_names`) are reusable. Lexical fields (`terms`, `count_phrases`, `enumeration_phrases`, `keywords`) should be deprecated. |
| `EntityService` Protocol | **Keep** | `count()`, `search()`, `inspect()`, `get_projection()`, `get_table_name()` are correct DB access abstractions. |
| `ToolRegistry` | **Keep** | Whitelisted execution pattern is correct. Tool definitions should become capability descriptors, not primary understanding mechanism. |
| `BreweryService` | **Keep** | Safe DB access layer. May need generalization for multi-entity. |
| Formatters (`format_*_response`) | **Keep** | Deterministic output layer is valuable for consistency. Should be invoked by the synthesis stage, not just the router. |
| System prompt builder (`_build_system_prompt`) | **Keep** | Dynamic prompt from registry metadata is correct. Needs planner context injection. |
| Tests (`test_response_engine.py`, `test_entity_registry.py`) | **Keep partially** | Formatter tests and service-mock tests are reusable. Intent-detection tests must be replaced with planner tests. |

### What Must Be Replaced or Redesigned

| Component | Replacement |
|-----------|-------------|
| `response_engine.detect_intent()` + `route_query()` as primary orchestrator | **AI Planner** that reads full conversation and outputs a typed retrieval plan |
| `response_engine.resolve_entity()` term matching | **Semantic entity resolution** via LLM planner with conversation context |
| `count_phrases`, `enumeration_phrases`, `keywords`, `terms` in `EntityMetadata` | **Deprecated** — LLM planner extracts intent semantically; registry only needs structural metadata |
| Single-entity resolution (`resolve()` returns one or None) | **Multi-entity planner** that can emit retrieval steps for 0-N entities |
| Latest-message-only understanding | **Full-conversation context** in planner prompt |
| Minimal follow-up handling (only detail follow-ups) | **Semantic follow-up resolution** — planner resolves anaphora ("that one", "it", "they") using conversation history |
| Direct-model path (`model-direct`) with no DB query | **Mandatory retrieval gate** — every path must attempt DB retrieval before synthesis |
| Tool-loop path allowing zero tool calls | **Forced retrieval** — if planner emits no retrieval steps, system must run a default discovery query |
| `if intent.type == ...` routing ladder | **Plan executor** that interprets a structured retrieval plan |

### Architecture Options

#### Option 1: LLM Planner → Typed Retrieval Plan → Deterministic Executor → Deterministic Formatter (Recommended)

**Flow**:
1. Planner LLM receives full conversation + registry metadata (entities, fields, tool capabilities).
2. Planner outputs validated JSON plan: `{conversation_intent, entities[], retrieval_steps[], response_mode, missing_info, ambiguity}`.
3. Executor always runs `retrieval_steps` first (count, search, inspect per entity).
4. If retrievals yield data → synthesizer uses formatter for consistent output + optional LLM rewrite for naturalness.
5. If retrievals are empty → synthesizer acknowledges empty result with optional LLM fallback (marked `retrieval_attempted=true`).
6. If planner indicates ambiguity → system asks clarifying question before retrieval.

**Pros**:
- Best fit for "AI-first + mandatory DB grounding"
- No raw SQL exposure — planner only selects from registered tool capabilities
- Preserves existing services, registry structure, and formatters
- Plan schema is testable and versionable
- Easy to add multi-entity: `entities[]` and `retrieval_steps[]` naturally support N entities

**Cons**:
- Needs plan schema + Pydantic validation layer
- Planner token cost on every turn
- Need guardrails against planner hallucinating invalid retrieval steps

**Effort**: Medium

#### Option 2: LLM Planner → Tool-Call Loop Only, Force Retrieval Before Synthesis

**Flow**:
1. Planner LLM decides which tools to call (similar to current tool loop).
2. System enforces: if no retrieval tools selected, inject a default `inspect` or `count` step.
3. Execute tools, append results to conversation.
4. Let model synthesize final answer from tool results.

**Pros**:
- Smallest delta from current `chat.py` tool loop
- Reuses existing tool definitions and handlers

**Cons**:
- Harder to guarantee output consistency — model owns final formatting
- Harder to test — state is spread across conversation messages
- Tool-loop state becomes the architecture; debugging is harder
- No explicit plan artifact for logging/auditing
- Multi-entity support is implicit and fragile

**Effort**: Low-Medium

#### Option 3: Two-Stage Planner (Semantic Parser → Query DAG → Synthesizer)

**Flow**:
1. **Stage 1 (Parser LLM)**: Extracts structured semantics from conversation — intent, entities, constraints, anaphora resolution.
2. **Stage 2 (Query DAG builder)**: Builds a deterministic DAG of DB queries from parser output using registry metadata.
3. **Stage 3 (Synthesizer)**: Formats results. Can be deterministic formatter or optional LLM rewriter.

**Pros**:
- Strongest control and testability
- Parser can be fine-tuned or replaced with classifier
- Query DAG is fully auditable
- Best extensibility for follow-up handling, multi-entity joins, complex constraints

**Cons**:
- Most redesign — new parser model, DAG builder, synthesizer
- More moving parts
- Higher initial complexity

**Effort**: High

### Recommendation

**Adopt Option 1** as the target architecture.

It strikes the best balance:
- It is AI-first (planner interprets semantically)
- It guarantees DB grounding (executor always runs retrieval)
- It preserves the solid infrastructure built in the previous change (registry, services, formatters)
- It avoids the brittleness of Option 2 and the complexity of Option 3
- It provides a clear migration path: replace `route_query()` with `plan → execute → format`

### Key Design Decisions Needed

1. **Plan Schema**: Define `RetrievalPlan` Pydantic model with fields for intent, entities, steps, mode.
2. **Planner Prompt**: Design a prompt that gives the LLM registry metadata + conversation history + output schema + examples.
3. **Plan Validation**: Reject plans with invalid entity keys, unknown fields, or unsupported operations.
4. **Empty Retrieval Policy**: When DB returns nothing, what does the synthesizer do? (Proposal: deterministic "not found" message + optional LLM elaboration.)
5. **Direct-Model Path Retirement**: The `model-direct` path (tools disabled) must also go through the planner or a minimal retrieval gate.
6. **Multi-Entity in One Turn**: Planner should be able to emit `retrieval_steps` for multiple entities, e.g., "compare breweries and coffee roasters."
7. **Follow-Up Handling**: Planner must resolve references like "what about the other one?" using conversation context, not just the previous message.
8. **Tool Definitions Evolution**: Current OpenAI-format tool definitions should be derived from registry metadata, not hand-written per entity.

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Planner hallucinates invalid retrieval steps | High | Strict plan validation + fallback to clarifying question |
| Planner token cost becomes significant | Medium | Cache registry metadata prompt fragment; use cheaper model for planner |
| Migration breaks existing parity tests | Medium | Keep old tests during transition; add new planner tests; verify formatter contracts remain |
| Empty-retrieval fallback reintroduces parametric knowledge | High | Synthesizer must tag `retrieval_attempted=true`; system prompt instructs model to acknowledge no data found |
| Multi-entity ambiguity | Medium | Planner explicitly reports `ambiguity` field; system asks user to clarify |
| Performance: planner adds latency | Medium | Planner is a single LLM call; can be parallelized with lightweight operations |

### Ready for Proposal

**Yes.** The codebase has solid infrastructure (registry, services, formatters, tool registry) that can be preserved. The shift from keyword-first to AI-first requires replacing the intent-detection/routing core with a planner + executor + synthesizer pipeline. The exploration has identified exactly what to keep, what to replace, and three viable architecture options with a clear recommendation.
