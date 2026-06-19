# Tasks: Dependent Country/City Selects

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 550–700 |
| 800-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR — all work is an atomic "replace inputs with selects" change |
| Delivery strategy | auto-forecast |
| Chain strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: single-pr
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Replace pais/ciudad text inputs with CountryCitySelect across all 4 forms | PR 1 | Single atomic change; foundation + forms together |

## Phase 1: Foundation — Select Atom

- [x] 1.1 Create `src/presentation/components/atoms/Select/Select.tsx` — Select atom with `label`/`name`/`value`/`options`/`onChange` props, BEM class `.select-field`
- [x] 1.2 Create `src/presentation/components/atoms/Select/select.scss` — `.select-field.__label`, `.__control` styles using existing SCSS tokens
- [x] 1.3 Create `src/presentation/components/atoms/Select/index.ts` — barrel export
- [x] 1.4 Add `export { Select } from './Select'` to `src/presentation/components/atoms/index.ts`

## Phase 2: Infrastructure — Location Catalog

- [x] 2.1 Create `src/shared/locationData.ts` — `COUNTRY_CITY_MAP` as const (Colombia + Venezuela), derived `Country`/`City` types, `getCitiesForCountry()` helper, legacy fallback helper for unknown cities
- [x] 2.2 Add unit tests in `src/shared/locationData.test.ts` — verify `getCitiesForCountry()` returns correct arrays; verify unknown city appended as transient option

## Phase 3: Core — CountryCitySelect Molecule

- [x] 3.1 (RED) Write failing test in `src/presentation/components/molecules/CountryCitySelect/CountryCitySelect.test.tsx` — create mode renders both selects; city filters on country change; city clears on country change; edit mode preloads pais/ciudad; legacy unknown city renders as transient option
- [x] 3.2 (GREEN) Create `src/presentation/components/molecules/CountryCitySelect/CountryCitySelect.tsx` — renders country Select + city Select; city list filtered by selected country; city reset via synthetic `ChangeEvent<HTMLSelectElement>` with `{target: {name:'ciudad', value:''}}`; auto-detects unknown city values and prepends transient `<option>`
- [x] 3.3 (REFACTOR) Verify tests pass; no internal state duplication — city reset goes through `onChange`
- [x] 3.4 Create `src/presentation/components/molecules/CountryCitySelect/index.ts` — barrel export
- [x] 3.5 Add `export { CountryCitySelect } from './CountryCitySelect'` to `src/presentation/components/molecules/index.ts`

## Phase 4: Form Integration — BreweryForm

- [x] 4.1 (RED) Update `src/features/breweries/BreweryForm.test.tsx` — replace `userEvent.type` for pais/ciudad with `userEvent.selectOptions`; add smoke assertions for select rendering
- [x] 4.2 (GREEN) Modify `src/features/breweries/BreweryForm.tsx` — replace pais/ciudad `<Input>` with `<CountryCitySelect>`; wire `pais`/`ciudad` from/to formData; pass `onChange`

## Phase 5: Form Integration — CoffeeFarmForm

- [x] 5.1 (RED) Update `src/features/coffee-farms/CoffeeFarmForm.test.tsx` — replace `userEvent.type` for pais/ciudad with `userEvent.selectOptions`
- [x] 5.2 (GREEN) Modify `src/features/coffee-farms/CoffeeFarmForm.tsx` — replace pais/ciudad `<Input>` with `<CountryCitySelect>`

## Phase 6: Form Integration — WineProducerForm

- [x] 6.1 (RED) Update `src/features/wine-producers/WineProducerForm.test.tsx` — replace `userEvent.type` for pais/ciudad with `userEvent.selectOptions`
- [x] 6.2 (GREEN) Modify `src/features/wine-producers/WineProducerForm.tsx` — replace pais/ciudad `<Input>` with `<CountryCitySelect>`; widen `handleChange` event type to include `HTMLSelectElement`

## Phase 7: Form Integration — AnimalFeedProducerForm

- [x] 7.1 (RED) Update `src/features/animal-feed-producers/AnimalFeedProducerForm.test.tsx` — replace `userEvent.type` for pais/ciudad with `userEvent.selectOptions`
- [x] 7.2 (GREEN) Modify `src/features/animal-feed-producers/AnimalFeedProducerForm.tsx` — replace pais/ciudad `<Input>` with `<CountryCitySelect>`; widen `handleChange` event type to include `HTMLSelectElement`

## Phase 8: Verification

- [x] 8.1 Run `pnpm test` — all 4 form test suites + molecule tests + locationData tests pass
- [x] 8.2 Verify payload contract — `pais` and `ciudad` remain plain strings in form submission (no object/select-element leakage)
- [x] 8.3 Confirm no regressions in existing form behavior (departamento, other fields unchanged)
