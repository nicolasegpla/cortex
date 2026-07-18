# Apply Progress: CORTEXDIST-15 Backend Multi-Phone Contacts

> Corrected apply-progress after the apply-phase gate found two blockers. This file merges all prior completed work with the new corrective evidence and follows the standard result-contract envelope.

---

## Result Contract

| Field | Value |
|-------|-------|
| **status** | `corrected` — apply gate blockers resolved; tests green |
| **executive_summary** | Removed the virtual `phones` column from `BreweryService` DB projections and switched `EntityContactPhoneService.find_entity_ids_by_phone` to partial (`ilike`) matching. Added regression tests for both failure modes; full backend suite is 599 passed with 1 pre-existing unrelated failure. |
| **artifacts** | `cortex-backend/app/services/brewery_service.py`, `cortex-backend/app/services/entity_contact_phone_service.py`, `cortex-backend/tests/test_brewery_service.py`, `cortex-backend/tests/test_entity_contact_phone_service.py`, `openspec/changes/cortexdist-15-backend-multi-phone-contacts/apply-progress.md` |
| **next_recommended** | `sdd-verify` on the corrected branch to confirm the gate passes and no downstream consumers regress |
| **risks** | Low. The change is localized to two services and their unit tests. Risk if any external caller relies on `BreweryService.search()`/`inspect()` returning records without a `phones` key (now always present, possibly `[]`). The DB projection no longer requests `phones`, so Supabase will not error on the missing column. |
| **skill_resolution** | Injected: sdd-apply, pytest, work-unit-commits. Loaded strict-tdd.md module and followed RED → GREEN → REFACTOR. |

---

## Change
- **Name**: cortexdist-15-backend-multi-phone-contacts
- **Mode**: Strict TDD
- **Work Unit**: Corrective apply on existing service branch
- **Branch**: feat/cortexdist-15-multi-phone-contacts-01-service
- **Base**: feat/cortexdist-15-multi-phone-contacts (tracker)

## Completed Tasks (Cumulative)

### Phase 1 — shared phone service (DONE on branch; preserve)
- [x] 1.1 RED normalize covers trim, blank-drop, first-occurrence dedupe
- [x] 1.2 RED replace_phones delete-then-insert with sort_order 1..N
- [x] 1.3 RED get_phones ordered by sort_order; empty when none
- [x] 1.4 RED batch_load_phones one-query dict[UUID, list[str]]
- [x] 1.5 RED find_entity_ids_by_phone matches entity_type + phone
- [x] 1.6 GREEN create `app/services/entity_contact_phone_service.py` (4 methods + normalize + ENTITY_TYPES)
- [x] 1.7 GREEN `pytest tests/test_entity_contact_phone_service.py -v` (16 passed)
- [x] 1.8 REFACTOR TABLE constant + docstrings + deterministic batch sort

### Correction Round (Native review lineage: cortexdist-15-phase-1-service)
- [x] RELIABILITY-001: Add `test_replace_phones_normalizes_and_assigns_consecutive_sort_order` asserting trim, blank filtering, first-occurrence dedupe, and consecutive sort_order payload values.
- [x] RELIABILITY-002: Add `test_replace_phones_deletes_before_insert` asserting delete executes before insert.
- [x] RELIABILITY-003: Strengthen `test_batch_load_phones_returns_dict_grouped_by_entity_id` to return deliberately unordered rows and assert normalized output order; a removed/reversed service-side sort fails.
- [ ] RELIABILITY-004: Intentionally not addressed in this transaction.

### Phase 2 — schema migration
- [x] 2.1 RED `tests/test_*_schemas.py`: assert `phones: list[str]` on Create/Update/Response, default `[]`
- [x] 2.2 GREEN `app/schemas/breweries.py`: drop `celular_1`/`celular_2`, add `phones: list[str] = Field(default_factory=list)`
- [x] 2.3 mirror 2.1–2.2 for `app/schemas/{coffee_farms,animal_feed_producers,wine_producers}.py` + their schema tests
- [x] 2.4 update router test fixtures: `celular*` → `phones=["300..."]`
- [x] 2.5 `pytest tests/test_*_schemas.py tests/test_*_router.py -v` green

### Phase 3 — service orchestration + router DI
- [x] 3.1 RED `tests/test_brewery_service.py`: `create` calls `phone_service.replace_phones("brewery", id, normalize(payload.phones))` AFTER insert; `model_dump(exclude={"phones"})`
- [x] 3.2 RED get_by_id merges `get_phones`; list_all ONE `batch_load_phones`; delete does NOT call phone_service (DB AFTER DELETE trigger owns cleanup)
- [x] 3.3 GREEN inject `EntityContactPhoneService` into `app/services/brewery_service.py`; orchestrate create/update/get/list
- [x] 3.4 mirror 3.1–3.3 for coffee_farm, animal_feed_producer, wine_producer services
- [x] 3.5 GREEN 4 routers (`app/routers/{breweries,coffee_farms,animal_feed_producers,wine_producers}.py`): build `EntityContactPhoneService(client)`, inject both via `Depends`
- [x] 3.6 `pytest tests/ -v` green

### Phase 4 — brewery search/inspect phone filter
- [x] 4.1 RED `test_search_with_phone_uses_two_step_query`: `phone_service.find_entity_ids_by_phone("brewery", phone)` then `.in_("id", ids)`; no match → `[]`
- [x] 4.2 GREEN `BreweryService.search(phone=...)`: drop `query.or_(celular_1/2.ilike)`; two-step query
- [x] 4.3 mirror 4.1–4.2 for `BreweryService.inspect(phone=...)` (limit/offset/order preserved)
- [x] 4.4 REFACTOR extract `_apply_phone_filter(query, phone)` shared by search/inspect
- [x] 4.5 `pytest tests/test_brewery_service.py -v -k phone` green

### Phase 5 — full suite + invariants
- [x] 5.1 `pytest tests/ -v` green on the integrated branch (594 passed, 1 pre-existing unrelated failure in test_config.py)
- [x] 5.2 INVARIANT `grep 'delete_phones|delete_entity_contact_phones' cortex-backend/app/services` returns NOTHING
- [x] 5.3 INVARIANT `grep 'celular_1|celular_2|"celular"' cortex-backend/app` returns only `sql/` refs (confirmed zero matches in app/)
- [x] 5.4 INVARIANT slice-1 regression: `pytest tests/test_entity_contact_phone_service.py -v` still 16 passed
- [ ] 5.5 Single implementation PR open for review (not in this task scope)

### Correction Round — Apply Gate Blockers (2026-07-18)
- [x] BLOCKER-001 RED: `test_search_selects_safe_projection` and new `test_search_attaches_phones_after_retrieval` / `test_inspect_attaches_phones_after_retrieval` fail because `_BREWERY_CHAT_PROJECTION` includes `phones` and `search()`/`inspect()` do not attach phones after retrieval.
- [x] BLOCKER-001 GREEN: Remove `phones` from `_BREWERY_CHAT_PROJECTION`; add `_merge_batch_phones()` helper; call it from `search()` and `inspect()` after DB results are retrieved; reuse it in `list_all()`.
- [x] BLOCKER-002 RED: `test_find_entity_ids_by_phone_uses_ilike_partial_match` and `test_find_entity_ids_by_phone_uses_ilike_for_full_number` fail because lookup uses exact equality `.eq("phone", phone)`.
- [x] BLOCKER-002 GREEN: Change `find_entity_ids_by_phone` to use `.ilike("phone", f"%{phone}%")` and update docstring.
- [x] REFACTOR: Extract `_merge_batch_phones()` to share the post-retrieval phone attachment logic across `list_all()`, `search()`, and `inspect()`.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1-1.8 | `cortex-backend/tests/test_entity_contact_phone_service.py` | Unit | N/A (new file) | Written first | 16/16 passed | 2+ cases per behavior | TABLE constant, docstrings, deterministic batch sort |
| RELIABILITY-001 | `cortex-backend/tests/test_entity_contact_phone_service.py` | Unit | 14/14 passing | Written first | 16/16 passed | Payload asserts trim, blank, dedupe, consecutive sort_order | Test-only; no refactor needed |
| RELIABILITY-002 | `cortex-backend/tests/test_entity_contact_phone_service.py` | Unit | 14/14 passing | Written first | 16/16 passed | Deterministic call-order assertion | Test-only; no refactor needed |
| RELIABILITY-003 | `cortex-backend/tests/test_entity_contact_phone_service.py` | Unit | 14/14 passing | Written first | 16/16 passed | Reverse-order input forces service-side sort | Test-only; no refactor needed |
| 2.1-2.5 | `cortex-backend/tests/test_breweries_schemas.py`, `test_coffee_farms_schemas.py`, `test_animal_feed_producers_schemas.py`, `test_wine_producers_schemas.py` | Unit | 71 entity service tests passing | Written first | 45/45 passed | 3+ cases per entity (default, multiple, response) | Consistent `phones: list[str] = Field(default_factory=list)` across 4 schemas |
| 3.1-3.3 | `cortex-backend/tests/test_brewery_service.py` | Unit | 71 passing | Written first | 52/52 passed | create/list/get/update/delete + phone merge/exclude | Extracted `_exclude_phones`, `_merge_phones`, `_ENTITY_TYPE` constants |
| 3.4 | `cortex-backend/tests/test_coffee_farm_service.py`, `test_animal_feed_producer_service.py`, `test_wine_producer_service.py` | Unit | 71 passing | Written first | 30/30 passed | create/list/get/update/delete + phone behavior | Mirrored brewery service pattern with `jsonable_encoder` |
| 3.5 | `cortex-backend/tests/test_*_router.py`, `test_*_wiring.py` | Integration | 43 passing | N/A (existing router tests) | 49/49 passed | Auth + wiring + trailing slash tests | Phone service constructed in each router dependency |
| 4.1-4.5 | `cortex-backend/tests/test_brewery_service.py` | Unit | 52 passing | Written first | 4/4 phone filter tests passed | search + inspect happy path + no-match | Extracted `_apply_phone_filter` shared helper |
| 5.1-5.4 | Full suite | Mixed | 594 passing | N/A (verification) | 594 passed, 1 pre-existing failure | N/A | Invariants confirmed via grep |
| BLOCKER-001 | `cortex-backend/tests/test_brewery_service.py` | Unit | 68/68 passing | Written first | 73/73 passed | Projection test + attach after retrieval for search/inspect + empty-result guard | Extracted `_merge_batch_phones()` shared helper |
| BLOCKER-002 | `cortex-backend/tests/test_entity_contact_phone_service.py` | Unit | 68/68 passing | Written first | 16/16 passed | Partial match + full-number match + no-match | Updated docstring; no structural refactor needed |

## Work Unit Evidence

| Evidence | Value |
|----------|-------|
| Focused test command | `PYTHONPATH=cortex-backend ./cortex-backend/.venv/bin/python -m pytest cortex-backend/tests/test_brewery_service.py cortex-backend/tests/test_entity_contact_phone_service.py -v` |
| Focused test result | `73 passed, 2 warnings in 0.28s` |
| Runtime harness command | `PYTHONPATH=cortex-backend ./cortex-backend/.venv/bin/python -m pytest cortex-backend/tests/ -v` |
| Runtime harness result | `599 passed, 1 failed, 9 warnings in 7.05s` (1 pre-existing unrelated `test_config.py::TestSettings::test_n8n_chat_timeout_seconds_defaults_to_60` failure) |
| Rollback boundary | Revert the single correction commit `HEAD`; restores `_BREWERY_CHAT_PROJECTION` with `phones` and exact phone equality. Does not affect schema/frontend/database/RLS or unrelated work. |
| Correction diff | 4 files changed, ~108 insertions, ~21 deletions |

## Regression Verification
- `pytest tests/test_entity_contact_phone_service.py -v` → 16 passed (slice-1 regression guard)
- `pytest tests/test_brewery_service.py -v` → 57 passed
- `pytest tests/ -v` → 599 passed; only failure is pre-existing `test_n8n_chat_timeout_seconds_defaults_to_60` (unrelated to this change)

## Files Changed
- `cortex-backend/app/services/brewery_service.py` (modified): removed `phones` from `_BREWERY_CHAT_PROJECTION`; added `_merge_batch_phones()` helper; `search()` and `inspect()` attach phones after retrieval; `list_all()` reuses the helper.
- `cortex-backend/app/services/entity_contact_phone_service.py` (modified): `find_entity_ids_by_phone` now uses `.ilike("phone", f"%{phone}%")` instead of exact equality; updated docstring.
- `cortex-backend/tests/test_brewery_service.py` (modified): projection helper and test updated to exclude `phones`; added regression tests for `search`/`inspect` phone attachment and empty-result guard.
- `cortex-backend/tests/test_entity_contact_phone_service.py` (modified): replaced exact-equality test with `ilike` partial-match tests (full number + no-match coverage).
- `openspec/changes/cortexdist-15-backend-multi-phone-contacts/apply-progress.md` (modified): merged correction evidence and added standard result-contract envelope.

## Deviations from Design
None — implementation matches design. The `_apply_phone_filter` helper extracted in Phase 4 is the internal refactor contemplated by design task 4.4. The correction moves phone attachment out of the Supabase projection and into the service layer, which aligns with the design's read/list data flow.

## Issues Found
- One pre-existing test failure unrelated to this change: `cortex-backend/tests/test_config.py::TestSettings::test_n8n_chat_timeout_seconds_defaults_to_60` (asserts 60 but environment sets 120). Not fixed per scope.
- GitHub PR creation remains unopened (task 5.5) per user direction to keep this run inside Cortex and avoid external Gentle AI lifecycle tooling.

## Remaining Work
- 5.5: Open the single implementation PR for review (out of scope for this apply task per user direction).
- `sdd-verify` should run on the corrected branch to confirm the apply gate passes.

## OpenSpec Artifacts
- `openspec/changes/cortexdist-15-backend-multi-phone-contacts/apply-progress.md` updated with merged cumulative progress and correction evidence (this file).
- `openspec/changes/cortexdist-15-backend-multi-phone-contacts/tasks.md` remains updated with `[x]` marks for completed phases.
- OpenSpec planning artifacts (`proposal.md`, `design.md`, `exploration.md`, etc.) remain untracked; not committed.
