# Apply Progress: Dependent Country/City Selects

## Status

All 22 tasks completed. Implementation, tests, and verification are done.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `src/presentation/components/atoms/Select/Select.test.tsx` | Unit | N/A (new) | Written | Passed | 3 cases | Added `afterEach(cleanup)` |
| 1.2 | — | Structural | N/A | N/A | N/A | Skipped: SCSS token styles | Clean BEM tokens |
| 1.3 | — | Structural | N/A | N/A | N/A | Skipped: barrel export | Clean |
| 1.4 | — | Structural | N/A | N/A | N/A | Skipped: index export | Clean |
| 2.1 / 2.2 | `src/shared/locationData.test.ts` | Unit | N/A (new) | Written | Passed | 6 cases | Clean pure functions |
| 3.1 / 3.2 / 3.3 | `src/presentation/components/molecules/CountryCitySelect/CountryCitySelect.test.tsx` | Integration | N/A (new) | Written | Passed | 5 cases | Extracted `COUNTRY_OPTIONS`, no internal state duplication |
| 3.4 | — | Structural | N/A | N/A | N/A | Skipped: barrel export | Clean |
| 3.5 | — | Structural | N/A | N/A | N/A | Skipped: index export | Clean |
| 4.1 / 4.2 | `src/features/breweries/BreweryForm.test.tsx` | Integration | Baseline 10/10 | Updated (RED) | Passed | 12 tests incl. payload strings | Reused existing `handleChange` (already supports `HTMLSelectElement`) |
| 5.1 / 5.2 | `src/features/coffee-farms/CoffeeFarmForm.test.tsx` | Integration | Baseline 11/11 | Updated (RED) | Passed | 13 tests incl. legacy transient option | Reused existing `handleChange` |
| 6.1 / 6.2 | `src/features/wine-producers/WineProducerForm.test.tsx` | Integration | Baseline 11/11 | Updated (RED) | Passed | 14 tests incl. select event / city reset | Widened `handleChange` to include `HTMLSelectElement` |
| 7.1 / 7.2 | `src/features/animal-feed-producers/AnimalFeedProducerForm.test.tsx` | Integration | Baseline 10/10 | Updated (RED) | Passed | 13 tests incl. select event / city reset | Widened `handleChange` to include `HTMLSelectElement` |
| 8.1 | Full suite `pnpm test` | Integration | Baseline 406/406 | N/A | 430/430 passed | N/A | N/A |
| 8.2 | Payload assertions in form tests | Integration | — | N/A | `pais`/`ciudad` plain strings verified | N/A | N/A |
| 8.3 | Full suite + build | Integration | — | N/A | No regressions; `departamento` and other fields unchanged | N/A | N/A |

## Test Summary

- **Total tests written**: 27 new (Select 3, locationData 6, CountryCitySelect 5, form test additions ~13)
- **Total tests passing**: 430 (full suite)
- **Layers used**: Unit, Integration
- **Approval tests**: None — no refactoring of existing production logic without tests
- **Pure functions created**: `getCitiesForCountry`, `resolveCityOptions`

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `src/presentation/components/atoms/Select/Select.tsx` | Created | Select atom with label, options, placeholder, onChange |
| `src/presentation/components/atoms/Select/select.scss` | Created | `.select-field` BEM styles mirroring `Input` |
| `src/presentation/components/atoms/Select/index.ts` | Created | Barrel export |
| `src/presentation/components/atoms/index.ts` | Modified | Added `Select` export |
| `src/shared/locationData.ts` | Created | `COUNTRY_CITY_MAP` as const, types, city helpers |
| `src/shared/locationData.test.ts` | Created | Unit tests for catalog and legacy fallback |
| `src/presentation/components/molecules/CountryCitySelect/CountryCitySelect.tsx` | Created | Dependent country/city selects with reset-on-change and transient legacy option |
| `src/presentation/components/molecules/CountryCitySelect/CountryCitySelect.test.tsx` | Created | Integration tests for dependency, reset, preload, legacy |
| `src/presentation/components/molecules/CountryCitySelect/index.ts` | Created | Barrel export |
| `src/presentation/components/molecules/index.ts` | Modified | Added `CountryCitySelect` export |
| `src/features/breweries/BreweryForm.tsx` | Modified | Replaced `pais`/`ciudad` `Input`s with `CountryCitySelect` |
| `src/features/breweries/BreweryForm.test.tsx` | Modified | Added select smoke, payload string assertions, legacy test |
| `src/features/coffee-farms/CoffeeFarmForm.tsx` | Modified | Replaced `pais`/`ciudad` `Input`s with `CountryCitySelect` |
| `src/features/coffee-farms/CoffeeFarmForm.test.tsx` | Modified | Updated create/edit tests for selects, added legacy test |
| `src/features/wine-producers/WineProducerForm.tsx` | Modified | Replaced `pais`/`ciudad` `Input`s with `CountryCitySelect`; widened `handleChange` |
| `src/features/wine-producers/WineProducerForm.test.tsx` | Modified | Updated create/edit tests, added city-reset and legacy tests |
| `src/features/animal-feed-producers/AnimalFeedProducerForm.tsx` | Modified | Replaced `pais`/`ciudad` `Input`s with `CountryCitySelect`; widened `handleChange` |
| `src/features/animal-feed-producers/AnimalFeedProducerForm.test.tsx` | Modified | Updated create/edit tests, added city-reset and legacy tests |

## Deviations from Design

None — implementation matches design.

## Issues Found

None.

## Verification

- `pnpm test`: 46 test files, 430 tests passed.
- `pnpm build`: `tsc -b` + `vite build` succeeded.
- Payload contract preserved: every form test asserts `pais` and `ciudad` as plain strings.
- `departamento` remains a free-text `Input` in CoffeeFarmForm and AnimalFeedProducerForm.

## Next Recommended Phase

`sdd-verify`
