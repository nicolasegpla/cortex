# Tasks: Unified Chat Response Architecture

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650–850 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 (stacked-to-main) |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation: entity registry + response engine core | PR 1 → main | Base layer; no brewery wiring; standalone testable |
| 2 | Integration: register brewery, add response_path log, parity tests | PR 2 → main (after PR 1) | Wires existing brewery into registry; dual-path logging |
| 3 | Cutover: redirect chat.py, remove brewery bypasses, deprecate old modules | PR 3 → main (after PR 2) | Final cutover; old modules deprecated but kept for diff verification |

## Phase 1: Infrastructure / Registry Foundation (PR 1)

- [x] 1.1 Create `app/schemas/entity_registry.py` — `EntityField`, `EntityMetadata`, `EntityService` Protocol, `BreweryMetadata` instance with full field/term/label data
- [x] 1.2 Create `app/utils/entity_registry.py` — Singleton `EntityRegistry` class with `register()`, `resolve()`, `search_entities()`, `get_by_key()` methods
- [x] 1.3 Create `app/utils/response_engine.py` — `resolve_entity()`, `detect_intent()`, `route_query()`, `format_response()` — generic engine; no brewery imports
- [x] 1.4 Write unit tests for `entity_registry.py` — register, resolve, search_entities, get_by_key
- [x] 1.5 Write unit tests for `response_engine.py` — intent detection (count/field/detail/table/enum), entity resolution edge cases (no-match, ambiguous)
- [x] 1.6 Add response_engine tests for `format_response()` — verify secretary-style plain-text blocks match spec

## Phase 2: Integration / Brewery Wiring (PR 2)

- [x] 2.1 Modify `app/tools/breweries.py` — import and register `BreweryMetadata` into singleton registry alongside tool registration
- [x] 2.2 Modify `app/tools/definitions.py` — replace brewery-only tool descriptions with entity-agnostic language ("search records", "inspect records", "count records")
- [x] 2.3 Modify `app/routers/chat.py` — add dual-path logging: new engine logs `response_path=entity-engine`, old path unchanged; no routing change yet
- [x] 2.4 Add integration tests for DB-first routing — `route_query()` → service → formatted output; assert parity with existing `test_chat_*` expectations
- [x] 2.5 Add integration tests for tool-bypass formatting — simulate tool results → `format_response()` → verify identical to current bypass output
- [x] 2.6 Run existing `test_chat_*` regression suite — all must pass with new engine in dual-path mode

## Phase 3: Cutover / Finalization (PR 3)

- [x] 3.1 Modify `app/routers/chat.py` — replace `route_brewery_query()` with `route_query(registry, messages)`; remove all brewery-specific bypasses in table/detail/enumeration paths
- [x] 3.2 Modify `app/routers/chat.py` — replace `BREWERY_SYSTEM_PROMPT` with entity-driven prompt builder using `registry.get_prompt_terms()`
- [x] 3.3 Mark `app/utils/chat_router.py` deprecated — add `# @deprecated use response_engine.route_query()` comment; keep for diff verification
- [x] 3.4 Mark `app/utils/chat_detail.py` deprecated — detection + formatting absorbed into engine
- [x] 3.5 Mark `app/utils/chat_table.py` deprecated — column labels + formatting in entity metadata
- [x] 3.6 Mark `app/utils/chat_grounding.py` deprecated — enumeration patterns absorbed
- [x] 3.7 Add E2E SSE stream tests for all 5 paths (count/field/detail/table/enumeration) — update assertions for new code paths
- [x] 3.8 Final regression pass — full `test_chat_*` suite passes; output parity confirmed

## Post-Verify Fix: Generic Search Field Decoupling

- [x] 3.9 Add `search_field` to `EntityMetadata` schema — metadata-driven search parameter name per entity
- [x] 3.10 Update `BreweryMetadata` — set `search_field="brewery_name"`
- [x] 3.11 Fix `EntityRegistry.search_entities()` — use `search_field` from metadata instead of hardcoded `brewery_name`
- [x] 3.12 Fix `route_query()` field lookup — use `search_field` from metadata instead of hardcoded `brewery_name`
- [x] 3.13 Fix `route_query()` detail — use `search_field` from metadata instead of hardcoded `brewery_name`
- [x] 3.14 Add tests proving multi-entity search works with different `search_field` values per entity

## Phase 4: Cleanup (Post-PR 3)

- [ ] 4.1 Remove `app/utils/chat_router.py` — after one sprint, delete deprecated module
- [ ] 4.2 Remove `app/utils/chat_detail.py` — after one sprint, delete deprecated module
- [ ] 4.3 Remove `app/utils/chat_table.py` — after one sprint, delete deprecated module
- [ ] 4.4 Remove `app/utils/chat_grounding.py` — after one sprint, delete deprecated module
- [ ] 4.5 Update `app/tools/breweries.py` — remove legacy brewery-only tool descriptions (now entity-agnostic in definitions.py)
