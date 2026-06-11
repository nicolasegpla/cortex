## Exploration: unified-chat-response-architecture

### Current State
Today the chat stack has four different response owners:

1. **DB-first router** in `/home/nicolas/dev/cortex/cortex-backend/app/utils/chat_router.py` handles count, field lookup, table, enumeration, and detail before the LLM.
2. **Forced detail enforcement** in `/home/nicolas/dev/cortex/cortex-backend/app/routers/chat.py` runs when the model chooses no tools on a first-pass detail request; it executes `search_breweries` server-side and formats deterministically.
3. **Post-tool bypasses** in `/home/nicolas/dev/cortex/cortex-backend/app/routers/chat.py` replace model formatting after tool execution for enumeration, table, and detail requests.
4. **Model-owned formatting** remains for `model-direct`, `model-tools-no-tool-calls`, and `model-tools-post-tool-formatting`.

That creates real format divergence:
- **Count**: fixed prose via `_format_count()`
- **Field lookup**: custom `_format_field_lookup()`; multi-record output uses `brewery_name — Label: value`
- **Detail/table**: `format_brewery_plaintext()`
- **Enumeration**: `format_enumeration()` returns header + bullet list
- **Model paths**: whatever prose the model emits

Why it diverges:
- Formatting logic is split across `chat_router.py`, `chat_table.py`, `chat_grounding.py`, and `chat.py`
- There are two deterministic stages doing similar work: pre-LLM router and post-tool bypasses
- Brewery metadata is duplicated instead of registered once

Field lookup gap:
- The recent phone/email fix is in `_detect_field_lookup()`: it now allows lookup when there is a recognized field, an extractable target, and a connector like `de/of/for`, even without an explicit brewery noun.
- `detect_detail_request()` still requires brewery/client terms except short follow-ups with previous-message context, so `dame informacion de test 1` still falls through.
- Field lookup is still brewery-coupled because it always queries `brewery_service.search(brewery_name=...)`.

### Affected Areas
- `/home/nicolas/dev/cortex/cortex-backend/app/routers/chat.py` — central path orchestration, system prompt, forced detail enforcement, post-tool bypasses, brewery DI
- `/home/nicolas/dev/cortex/cortex-backend/app/utils/chat_router.py` — DB-first intent detection, count/field/detail routing, brewery-specific patterns and labels
- `/home/nicolas/dev/cortex/cortex-backend/app/utils/chat_detail.py` — detail detection/extraction requires brewery terms; result copy is brewery-specific
- `/home/nicolas/dev/cortex/cortex-backend/app/utils/chat_table.py` — plaintext/table formatting is hardcoded to brewery columns and labels
- `/home/nicolas/dev/cortex/cortex-backend/app/utils/chat_grounding.py` — enumeration detection and labels are hardcoded to brewery fields
- `/home/nicolas/dev/cortex/cortex-backend/app/tools/breweries.py` — tool handlers are bound directly to `BreweryService`
- `/home/nicolas/dev/cortex/cortex-backend/app/tools/definitions.py` — tool names, descriptions, and parameter schema are brewery-only
- `/home/nicolas/dev/cortex/cortex-backend/app/tools/registry.py` — generic registry, but current registrations are brewery-only
- `/home/nicolas/dev/cortex/cortex-backend/app/services/brewery_service.py` — projection, search/inspect signatures, and field mapping are brewery-specific and duplicated
- `/home/nicolas/dev/cortex/cortex-backend/app/schemas/breweries.py` — useful field inventory, but not enough metadata for bilingual routing/formatting
- `/home/nicolas/dev/cortex/cortex-backend/app/schemas/chat.py` — generic tool/chat envelopes are reusable, but no entity metadata concept exists
- `/home/nicolas/dev/cortex/cortex-backend/tests/test_chat_router.py` — integration contract for all current response paths
- `/home/nicolas/dev/cortex/cortex-backend/tests/test_chat_router_unit.py` — unit contract for count/field lookup router behavior
- `/home/nicolas/dev/cortex/cortex-backend/tests/test_chat_detail.py` — codifies current detail-term requirement
- `/home/nicolas/dev/cortex/cortex-backend/tests/test_chat_table.py` — codifies brewery plaintext/table formatting
- `/home/nicolas/dev/cortex/cortex-backend/tests/test_chat_grounding.py` — codifies brewery enumeration detection/formatting

### Approaches
1. **Entity registry + generic response engine** — define per-entity metadata once (terms, fields, labels, searchable target field, formatter order, tool/service bindings) and drive one generic router/formatter from that registry.
   - Pros: Best fit for current duplication; unifies detail/table/enumeration/field/count logic; preserves deterministic paths; easiest to add new entities without cloning modules
   - Cons: Requires a new metadata model and careful migration of current brewery tests
   - Effort: Medium

2. **Entity-specific formatter/router classes behind a shared interface** — keep per-entity implementations but standardize entry points like `detect_count`, `detect_detail`, `format_detail`, `format_enumeration`.
   - Pros: Clear boundaries; safer if future entities differ a lot; simpler incremental migration from brewery-only code
   - Cons: Keeps duplication risk; shared behavior can still drift between entities; harder to guarantee one output contract
   - Effort: Medium

3. **Schema-driven formatting via introspection** — derive labels/fields from Pydantic or JSON-schema metadata and use that for detail/table/field formatting.
   - Pros: Reduces manual column-label duplication; good long-term for formatting
   - Cons: Current schemas do not contain enough routing metadata, bilingual synonyms, grouping, or search-target semantics; weak for count/detail/enumeration detection by itself
   - Effort: High

### Recommendation
Use **Approach 1**.

The real problem is NOT just formatting; it is duplicated entity knowledge across detection, tool wiring, and formatting. A registry-backed generic response engine fixes the root cause. Then, if useful later, schema introspection can be added as a helper for default labels/descriptions inside that registry.

### Risks
- Broadening detail detection beyond brewery nouns can increase false positives unless entity resolution stays explicit
- Registry metadata can drift from service/tool parameter names if there is no single canonical field map
- Current output contracts already differ (`_format_field_lookup()` uses em dashes; enumeration uses bullets), so unification may require test updates, not just refactoring

### Ready for Proposal
Yes — tell the user the codebase is ready for a proposal centered on a registry-driven deterministic response layer that preserves current DB-first behavior but removes brewery-only duplication and consolidates formatting ownership.
