# Proposal: Dependent Country/City Selects

## Intent

Replace free-text `pais`/`ciudad` inputs with dependent selects across all four customer forms (breweries, coffee farms, wine producers, animal feed producers). Eliminates data inconsistency ("colombia", "Colombia", "CO") and prevents city-country mismatches.

## Scope

### In Scope
- New `Select` atom (mirrors existing `Input` atom pattern)
- New `CountryCitySelect` molecule encapsulating dependent logic
- Shared location catalog (`src/shared/locationData.ts`) with Colombia + Venezuela cities
- Update all four customer forms to use `CountryCitySelect`
- Widen `handleChange` types in `WineProducerForm` and `AnimalFeedProducerForm`
- Transient option for legacy values outside the catalog
- Test updates: replace `type` with `selectOptions` in create flows

### Out of Scope
- Adding more countries beyond Colombia and Venezuela
- Searchable/typeahead selects (native `<select>` only)
- Backend schema changes (payload contract unchanged)
- `departamento` field behavior (stays free text)
- Geocoding or external API integration

## Capabilities

### New Capabilities
- `location-catalog`: Shared country-to-city catalog with TypeScript types and fallback for unknown legacy values
- `dependent-country-city-select`: Reusable molecule providing dependent select behavior with city reset on country change and transient unknown-value rendering

### Modified Capabilities
- `breweries-crud`: Creation/edit forms use selects instead of text inputs for `pais`/`ciudad`
- `coffee-farms-crud`: Creation/edit forms use selects instead of text inputs for `pais`/`ciudad`
- `wine-producers-crud`: Creation/edit forms use selects instead of text inputs for `pais`/`ciudad`
- `animal-feed-producers-crud`: Creation/edit forms use selects instead of text inputs for `pais`/`ciudad`

## Approach

**Approach 3** from exploration: `Select` atom + `CountryCitySelect` molecule + shared constants.

- `Select` atom: wraps native `<select>`, accepts `label`, `name`, `value`, `options`, `onChange`, mirrors `Input` atom API
- `CountryCitySelect` molecule: renders two `Select` instances, manages city filtering, resets city on country change, renders transient `<option>` for legacy values not in catalog
- Location catalog: `const` object with `as const` typing, exported `CountryCityMapping` type
- Forms consume molecule via `pais`, `ciudad`, `handleChange` — no form-level dependency logic

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/presentation/components/atoms/Select/` | New | Reusable Select atom |
| `src/presentation/components/atoms/index.ts` | Modified | Export Select |
| `src/presentation/components/molecules/CountryCitySelect/` | New | Dependent select molecule |
| `src/presentation/components/molecules/index.ts` | Modified | Export CountryCitySelect |
| `src/shared/locationData.ts` | New | Country-city catalog + types |
| `src/features/breweries/BreweryForm.tsx` | Modified | Replace pais/ciudad Inputs |
| `src/features/coffee-farms/CoffeeFarmForm.tsx` | Modified | Replace pais/ciudad Inputs |
| `src/features/wine-producers/WineProducerForm.tsx` | Modified | Replace Inputs, widen handleChange |
| `src/features/animal-feed-producers/AnimalFeedProducerForm.tsx` | Modified | Replace Inputs, widen handleChange |
| `src/presentation/styles/_base.scss` | Modified | Extend select styling if needed |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Legacy values outside catalog render blank | Medium | Transient `<option>` preserves display |
| Catalog incomplete (missing cities) | Low | Start with major cities; additive later |
| Test churn across 4 forms | High | Focus tests on molecule; forms test integration only |
| handleChange type mismatch in 2 forms | Low | Explicit union type: `HTMLInputElement \| HTMLSelectElement \| HTMLTextAreaElement` |

## Rollback Plan

1. Revert git commit — forms return to text inputs, no behavioral change
2. If catalog causes issues, remove `CountryCitySelect` molecule and restore `Input` usage per form (catalog is pure data, no side effects)
3. No database migration required — `pais`/`ciudad` remain strings

## Dependencies

- None — pure frontend change, backend contract unchanged

## Success Criteria

- [ ] All four forms use dependent selects for pais/ciudad
- [ ] Changing country clears city if not in new country's list
- [ ] Edit mode preloads existing pais/ciudad correctly
- [ ] Legacy values outside catalog render as transient options
- [ ] Create-flow tests pass with `selectOptions` instead of `type`
- [ ] Backend receives identical `pais`/`ciudad` string payload
