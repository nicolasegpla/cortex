## Exploration: Dependent country/city selects in customer forms

### Current State
- Four customer forms use the shared `Input` atom for free-text `pais` and `ciudad` fields:
  - `BreweryForm`, `CoffeeFarmForm`, `WineProducerForm`, `AnimalFeedProducerForm`.
- Each form keeps local `formData` state, uses a single `handleChange` event handler, and normalises loaded records through `transformForForm`.
- No reusable `Select` component exists. Native `<select>` elements are already used inline for other enum fields (`tipo_operacion`, `tipo_actividad`, `tipo_proceso`, `nivel_tecnificacion`).
- `src/presentation/styles/_base.scss` already styles `.form-field select` and `.page-form select`, so a select placed inside `.form-field` inherits the current theme.
- `BreweryForm` and `CoffeeFarmForm` type `handleChange` for `HTMLSelectElement`; `WineProducerForm` and `AnimalFeedProducerForm` only type it for `HTMLInputElement | HTMLTextAreaElement` and will need a type update.
- Backend entity types expose `pais` and `ciudad` as strings; the submit payload must remain unchanged.

### Affected Areas
- `src/features/breweries/BreweryForm.tsx` — replace `pais`/`ciudad` `Input`s; update tests.
- `src/features/coffee-farms/CoffeeFarmForm.tsx` — replace `pais`/`ciudad` `Input`s; update tests.
- `src/features/wine-producers/WineProducerForm.tsx` — replace `pais`/`ciudad` `Input`s; widen `handleChange` type; update tests.
- `src/features/animal-feed-producers/AnimalFeedProducerForm.tsx` — replace `pais`/`ciudad` `Input`s; widen `handleChange` type; update tests.
- `src/presentation/components/atoms/Select/` — new reusable `Select` atom.
- `src/presentation/components/atoms/index.ts` — export the new atom.
- `src/presentation/components/molecules/CountryCitySelect/` — new dependent-select molecule.
- `src/shared/locationData.ts` — country → city catalog and derived types.
- `src/presentation/styles/_base.scss` — extend only if the `Select` atom uses `.input-field` instead of `.form-field`.

### Approaches
1. **Inline native selects per form + shared location constants**
   - Pros: fewest new files; leverages existing `.form-field` styles.
   - Cons: duplicated dependent logic across four forms; inconsistent reset/filter behavior; repetitive tests.
   - Effort: Low–Medium

2. **Reusable `Select` atom + shared constants, inline dependency logic in each form**
   - Pros: consistent select UX/styling; reusable for future enum fields.
   - Cons: still duplicates country/city filtering and reset logic in four places.
   - Effort: Medium

3. **`CountryCitySelect` molecule + `Select` atom + shared constants**
   - Pros: encapsulates dependency, city reset on country change, unknown-value fallback, and label wiring in one place; keeps forms simple; focuses dependency tests on a single molecule.
   - Cons: slightly more initial files than the inline approach.
   - Effort: Medium

### Recommendation
Use **Approach 3**. Four forms need identical behavior, so a small molecule is justified by CORTEX Rule 3 (reusable patterns without overengineering). The `Select` atom mirrors the existing `Input` atom; `CountryCitySelect` consumes `pais`, `ciudad`, and the form's `handleChange` and emits string values, preserving the backend payload contract.

### Risks
- **Unknown legacy values**: records may contain countries/cities outside the catalog. A select with an unmatched value renders blank and could silently clear data. Mitigation: render a transient option for any loaded value not present in the catalog.
- **Catalog scope**: the exact country/city list must be product-approved. A minimal starter catalog (e.g., Colombia + major cities) is safe and additive.
- **TypeScript gaps**: `WineProducerForm` and `AnimalFeedProducerForm` must widen `handleChange` to include `HTMLSelectElement`.
- **Test churn**: create-flow tests currently `type` into the city input; they must switch to `userEvent.selectOptions` and pick a country first.

### Ready for Proposal
Yes. The scope is clear, the existing form pattern is well understood, and the change is low-risk. The proposal should confirm the initial country/city catalog and whether the `departamento` field (present in coffee-farm and animal-feed forms) stays free text.
