# Proposal: Unified Chat Response Architecture

## Intent

The chat stack has four different response owners producing divergent formatting, and all deterministic routing/formatting is hard-coded to breweries. This blocks format consistency and makes adding new entities (coffee, wine, etc.) require cloning modules instead of registering metadata once.

## Scope

### In Scope
- Entity registry: per-entity metadata (terms, fields, labels, search targets, formatter order, tool bindings) defined once
- Generic response engine: single deterministic router/formatter driven by the registry for count, field lookup, detail, table, enumeration
- Entity-agnostic search/routing: resolve entities from natural queries without requiring hardcoded brewery nouns
- Migrate all existing brewery paths through the new engine (preserving current output contracts)

### Out of Scope
- Adding coffee/wine/etc. entities (registry makes it possible, but this change only registers brewery)
- Model-owned formatting paths (model-direct, model-tools-no-tool-calls) — those remain as-is
- Frontend chat UI changes

## Capabilities

### New Capabilities
- `entity-registry`: Per-entity metadata registry (terms, fields, labels, bilingual synonyms, search targets, formatter order, tool/service bindings). Each entity registers once; no duplication across detection, tool wiring, and formatting.
- `generic-response-engine`: Unified deterministic response engine replacing the four current owners. Routes and formats count, field lookup, detail, table, and enumeration queries using the entity registry. Single output contract.
- `multi-entity-search`: Entity-agnostic search and routing that resolves the target entity from natural language queries without requiring hardcoded entity terms. Supports future entity types.

### Modified Capabilities
- `llm-tools`: Remove brewery-only restriction from tool definitions and registry. Tools become entity-aware via the registry, enabling future non-brewery tools while preserving current brewery behavior.
- `chat-tool-calling`: Tool calling outcomes and post-tool bypasses use the generic response engine instead of brewery-specific formatting.
- `chat-session`: Database-backed answers are no longer brewery-limited at the spec level; the system may answer using any registered entity's tools.

## Approach

Build an entity registry (`app/schemas/entities.py` or similar) with a metadata model capturing: entity key, natural terms (EN/ES), searchable fields, display labels, formatter configuration, and tool/service bindings. Replace the four current response owners with one generic engine (`app/utils/response_engine.py`) that consults the registry for detection and formatting. Migrate brewery as the first registered entity. Keep current output contracts intact to minimize test churn.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-backend/app/schemas/entities.py` | New | Entity registry schema and metadata model |
| `cortex-backend/app/utils/response_engine.py` | New | Generic deterministic response engine |
| `cortex-backend/app/utils/chat_router.py` | Modified | Delegate to response engine instead of brewery-specific logic |
| `cortex-backend/app/utils/chat_detail.py` | Modified | Entity-agnostic detail detection via registry |
| `cortex-backend/app/utils/chat_table.py` | Modified | Entity-agnostic table formatting via registry |
| `cortex-backend/app/utils/chat_grounding.py` | Modified | Entity-agnostic enumeration via registry |
| `cortex-backend/app/routers/chat.py` | Modified | Wire response engine; remove brewery-specific bypasses |
| `cortex-backend/app/tools/definitions.py` | Modified | Entity-aware tool definitions |
| `cortex-backend/app/tools/breweries.py` | Modified | Register as brewery entity handler |
| `cortex-backend/app/services/brewery_service.py` | Modified | Conform to entity service interface |
| `cortex-backend/tests/test_chat_router*.py` | Modified | Update for new engine contracts |
| `cortex-backend/tests/test_chat_detail.py` | Modified | Remove brewery-term requirement |
| `cortex-backend/tests/test_chat_table.py` | Modified | Entity-agnostic formatting tests |
| `cortex-backend/tests/test_chat_grounding.py` | Modified | Entity-agnostic enumeration tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| False positives from broader entity detection | Medium | Keep entity resolution explicit; require term match before routing |
| Registry drifts from service/tool names | Medium | Single canonical field map; registry is the source of truth |
| Test churn during migration | High | Preserve current output contracts; update tests incrementally per path |

## Rollback Plan

Revert the git branch. The existing four response owners remain in the codebase during migration (commented or behind feature flag if needed). No database schema changes are required — this is purely a backend code refactor.

## Dependencies

- Existing tool registry (`app/tools/registry.py`) — already generic, will be extended
- Existing brewery service — becomes the first entity implementation

## Success Criteria

- [ ] All five deterministic paths (count, field lookup, detail, table, enumeration) route through the generic response engine
- [ ] Brewery output format is identical to current behavior (all existing tests pass)
- [ ] `dame informacion de test 1` resolves to brewery detail without requiring explicit brewery terms
- [ ] New entity can be added by registering metadata only — no router/formatter changes needed
