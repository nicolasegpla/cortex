# Design: Unified Chat Response Architecture

## Technical Approach

Replace four brewery-hardcoded response owners (`chat_router`, `chat_detail`, `chat_table`, `chat_grounding`) with one entity-agnostic registry + generic response engine. The engine reads entity metadata (terms, fields, labels, formatter config) from a Pydantic-backed singleton registry and produces the same secretary-style plain-text output — regardless of whether data came from direct DB-first routing or approved tool results.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Registry location | `app/schemas/entity_registry.py` (models) + `app/utils/entity_registry.py` (singleton) | Pydantic is the project standard. Singleton avoids DI complexity for a tiny metadata store. |
| Entity service contract | `typing.Protocol` with `count()`, `search(**filters)`, `inspect(...)`, `get_projection()`, `get_table_name()` | BreweryService already conforms structurally. Protocol avoids changing existing signatures. |
| Entity resolution without noun | Search all registered services for the target string. Route to the entity with exactly one match. | Handles "dame informacion de test 1" without brewery noun. Multi-match → ambiguous, falls through to LLM. |
| Migration strategy | Build new engine alongside old modules. Wire brewery as first entity. Compare output → cut over → remove old modules. | Zero-risk migration. Old modules remain readable for diff verification. |
| Canonical output format | Plain-text secretary-style (identical to current `format_brewery_plaintext`). Single-record = labeled fields per line. Multi-record = numbered blocks. | Spec requires one contract across DB-first and tool paths. Current format is the contract. |

## Data Flow

```
User message ──→ resolve_entity(msg, registry)
                      │
            ┌─────────┴──────────┐
            ▼                    ▼
    Entity found            No entity found
            │                    │
    detect_intent()         Try target search
            │               across all services
    ┌───────┼───────┐              │
    ▼       ▼       ▼         Match? → use that entity
  count  field  detail/table/     No match → LLM path
           │     enumeration
           │         │
           ▼         ▼
    entity.service     response_engine.format()
    .count/search/     ← entity.table_columns
    inspect            ← entity.field_labels
           │           ← entity.empty_messages
           ▼
    response_engine ──→ SSE stream
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/schemas/entity_registry.py` | Create | `EntityMetadata`, `EntityField`, `EntityService` Protocol, brewery instance |
| `app/utils/entity_registry.py` | Create | Singleton `EntityRegistry`: register(), resolve(), search_entities() |
| `app/utils/response_engine.py` | Create | `resolve_entity()`, `detect_intent()`, `route_query()`, `format_response()` — generic engine replacing 4 owners |
| `app/routers/chat.py` | Modify | Replace `route_brewery_query()` call with `route_query(registry, messages)`. Remove brewery-specific bypasses (table/detail/enumeration). Replace `BREWERY_SYSTEM_PROMPT` with entity-driven prompt builder. |
| `app/tools/definitions.py` | Modify | Replace brewery-only descriptions with entity-agnostic language ("search records", "inspect records", "count records") |
| `app/tools/breweries.py` | Modify | Register brewery entity metadata alongside tool registration |
| `app/utils/chat_router.py` | Deprecate | Replaced by `response_engine.route_query()`; kept for diff verification during migration |
| `app/utils/chat_detail.py` | Deprecate | Detection + formatting absorbed into engine |
| `app/utils/chat_table.py` | Deprecate | Column labels and formatting absorbed into entity metadata |
| `app/utils/chat_grounding.py` | Deprecate | Enumeration patterns + formatting absorbed into entity metadata |

## Entity Metadata Contract

```python
class EntityField(BaseModel):
    db_field: str                    # Supabase column name
    labels: dict[str, str]           # {"es": "Nombre", "en": "Name"}
    keywords_es: list[str]           # ["nombre", "cerveceria"]
    keywords_en: list[str]           # ["name", "brewery"]
    is_array: bool = False

class EntityMetadata(BaseModel):
    entity_key: str                  # "brewery"
    terms_es: list[str]              # ["cervecería", "cervecero", "cliente"]
    terms_en: list[str]              # ["brewery", "brewer", "client"]
    fields: list[EntityField]        # All searchable/displayable fields
    display_order: list[str]         # Ordered db_field names for output
    count_phrases_es: list[str]      # ["cuantas cervecerias", ...]
    count_phrases_en: list[str]      # ["how many breweries", ...]
    empty_detail_es: str             # "No encontré información..."
    empty_detail_en: str             # "I couldn't find..."
    enumeration_phrases: dict[str, str]  # user term → db_field
    service: EntityService           # Protocol reference
    tool_names: list[str]            # ["search_breweries", ...]
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Entity resolution from messages | Parametrize: messages with/without entity terms, ambiguous terms, no-match |
| Unit | Intent detection (count/field/table/enum/detail) | Registry-driven; verify each path's detection logic |
| Unit | Response formatter output | Compare generated plain text against expected secretary-style blocks |
| Integration | DB-first routing end-to-end | `route_query()` → service → formatted output; match current test expectations |
| Integration | Tool-bypass formatting | Simulate tool results → format via engine → verify identical to current bypass output |
| E2E | Full SSE stream for all 5 paths | Existing chat stream tests: update assertions to match new code paths |
| Regression | Brewery output parity | Run all existing `test_chat_*` tests with engine — must pass unchanged |

## Migration Sequence

1. **Create `entity_registry` + `response_engine` modules** — no wiring yet
2. **Register brewery entity** in registry with full metadata
3. **Add response_path log for new engine** (`response_path=entity-engine`)
4. **Run existing tests against both old and new paths** — assert parity
5. **Redirect `chat.py` router** to call `route_query()` instead of `route_brewery_query()`
6. **Remove brewery-specific bypasses** from `chat.py`
7. **Deprecate old modules** — keep for one sprint, then delete

## Open Questions

- [ ] Should the system prompt be entity-driven per-request (registry lookup) or remain static with entity-neutral language? Recommend: static neutral prompt + entity-aware tool descriptions.
- [ ] Confirm that `BreweryService` field names match the registry exactly — any drift will break detection.
