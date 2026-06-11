# Verify Report: Unified Chat Response Architecture

## Status: WARNING (1 CRITICAL, 0 FAIL, 2 SUGGESTION)

## Executive Summary

All 667 tests pass. The unified chat response architecture is functionally complete with brewery as the first registered entity. The cutover from `route_brewery_query()` to `route_query()` is done, old modules are deprecated, and entity-driven prompt builder replaces `BREWERY_SYSTEM_PROMPT`. However, one CRITICAL spec violation exists: `brewery_name` is hardcoded in the generic search interface, blocking future multi-entity extensibility.

## Checks

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | **Unified deterministic response format** | PASS | `response_engine.py:600-617` dispatches all 5 intent types to format functions |
| 2 | **Entity-agnostic registry** | PASS | `EntityMetadata`, `EntityService` Protocol, `EntityRegistry` singleton all implemented |
| 3 | **Natural-language routing without entity noun** | PASS | `resolve_entity()` falls back to `search_entities()` for target resolution |
| 4 | **Cutover: chat.py uses route_query()** | PASS | No `route_brewery_query` or brewery bypass imports; `route_query` called at line 273 |
| 5 | **Cutover: BREWERY_SYSTEM_PROMPT replaced** | PASS | `_build_system_prompt(entity_registry)` at line 33 |
| 6 | **Legacy modules deprecated** | PASS | All 4 have `# @deprecated` comments |
| 7 | **Tool descriptions entity-agnostic** | PASS | "Search/Inspect/Count records for registered entities" |
| 8 | **Tool names still brewery-specific** | PASS | Expected — Phase 4 cleanup item 4.5 |
| 9 | **search_entities() and route_query() hardcode brewery_name** | **CRITICAL** | `entity_registry.py:118`, `response_engine.py:735,773` use `brewery_name=target` — violates entity-agnostic spec |
| 10 | **Double search on entity resolution fallback** | SUGGESTION | Known trade-off, documented in apply-progress |
| 11 | **Phase 4 cleanup not yet done** | SUGGESTION | Tasks 4.1-4.5 deferred per design |

## CRITICAL Finding

`service.search(brewery_name=target)` appears in 3 locations across the generic codebase. This brewery-coupled kwarg means registering a second entity (e.g. coffee) would fail at query time because `CoffeeService.search()` won't accept `brewery_name`. The fix requires adding a generic search filter mapping (e.g. `primary_search_field` to `EntityMetadata`) so the engine calls `service.search(**{entity.primary_search_field: target})`.

## SUGGESTION Findings

- Double search calls on entity resolution fallback are a known trade-off but could be optimized by caching the `search_entities()` result.
- Phase 4 cleanup tasks (deleting deprecated modules, removing legacy tool descriptions) are intentionally deferred.

## Test Evidence

- 667 total tests passing
- 41 response_engine tests
- 18 entity_registry tests
- 15 entity_registry_schemas tests
- 71 chat_router tests (incl. 5 E2E entity-engine paths)

## Next Recommended

- **Fix CRITICAL**: Add `primary_search_field` to `EntityMetadata` and replace `brewery_name=target` with `**{entity.primary_search_field: target}` across 3 call sites before registering a second entity.
- **Archive**: Once CRITICAL is triaged (fix or accept as Phase 4), proceed to `sdd-archive`.