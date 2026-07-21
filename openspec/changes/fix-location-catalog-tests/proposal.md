# Proposal: fix-location-catalog-tests

## Intent

Commit 13f2445 (Jul 8) mistakenly replaced Colombia's 32 cities in `COUNTRY_CITY_MAP` with 33 departments. Every piece of evidence — backend Pydantic schemas (`ciudad` = "City"), Venezuela catalog (still cities), UI label ("Ciudad"), backend tests (city names only), the `dependent-country-city-select` spec, and the `location-catalog` spec — confirms the catalog must contain cities. Tests written alongside the original commit 40b6d14 (Jun 19) are correct; the data change was the mistake. Restore the city list to make the 4 broken tests pass and leave the full frontend suite green.

## Scope

### In Scope
- Restore the Colombia array in `COUNTRY_CITY_MAP` to the exact 32 cities from commit 40b6d14
- Verify the 4 broken tests pass unchanged: `locationData.test.ts` (3 assertions on Medellín/Bogotá), `CountryCitySelect.test.tsx` (Medellín/Cali/Bogotá/Palmira), `BreweryForm.test.tsx`, `WineProducerForm.test.tsx`
- Verify the full frontend test suite remains green (no regressions)

### Out of Scope
- No `departamento` select wiring or component changes
- No backend changes (schemas, tests, or data)
- No location data model redesign
- No migration for producers who stored a department as `ciudad` during the broken window

## Capabilities

### New Capabilities
_None — this is a data revert, not a new capability._

### Modified Capabilities
- `location-catalog`: restore Colombia city list (revert departments → cities). Spec already describes cities; implementation drifted.

## Approach

Restore the exact 32-city Colombia array from commit 40b6d14. This is the minimal known-good state: it was reviewed, shipped, and has matching tests. The tests assert only `Bogotá D.C.`, `Medellín`, `Cali`, and `Palmira` (legacy via `resolveCityOptions`), so any list containing those would pass — but reverting to the reviewed list avoids introducing unreviewed additions or removals.

No test changes. No component changes. Single-file data fix in `locationData.ts`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-frontend/src/shared/locationData.ts` | Modified | Replace 33 departments with 32 cities from 40b6d14 |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Producers who selected a department during the broken window (Jul 8 → now) have a department stored as `ciudad` | Low | `resolveCityOptions()` already prepends unknown values as transient options — the UI will show the stored department without data loss. No migration needed now; can revisit if volume is significant. |
| Some department names overlap with city names (e.g., "Bogotá D.C.", "Arauca") | Low | These overlap in both lists. The 32-city list from 40b6d14 is the known-good state; no new ambiguity introduced. |

## Rollback Plan

Revert the single commit that restores the city list. The previous state (departments) is one `git revert` away. No schema or component changes to unwind.

## Dependencies

None.

## Success Criteria

- [ ] `locationData.test.ts` — all 6 tests pass (including `toContain('Medellín')` and `toContain('Bogotá D.C.')`)
- [ ] `CountryCitySelect.test.tsx` — all 5 tests pass (Medellín, Cali, Bogotá D.C., Palmira assertions)
- [ ] `BreweryForm.test.tsx` — all tests pass (Medellín/Bogotá D.C. assertions)
- [ ] `WineProducerForm.test.tsx` — all tests pass (Medellín/Bogotá D.C. assertions)
- [ ] Full frontend suite green (`vitest run` exits 0)
