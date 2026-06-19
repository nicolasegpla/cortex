# Design: Dependent Country/City Selects

## Technical Approach

Replace free-text `pais`/`ciudad` `<Input>` components with a `CountryCitySelect` molecule wrapping two `Select` atoms. The molecule consumes a shared `locationData.ts` catalog and emits plain `React.ChangeEvent<HTMLSelectElement>` objects compatible with existing `handleChange` handlers. City resets on country change via a synthetic event. Legacy values outside the catalog render as transient `<option>` elements.

## Architecture Decisions

| # | Decision | Options considered | Choice | Rationale |
|---|----------|-------------------|--------|-----------|
| 1 | Select atom class naming | `.form-field` (inherits `_base.scss` styles), or `.select-field` (mirrors `.input-field` BEM) | `.select-field` + `.select-field__control` | Mirrors `Input` atom pattern; avoids coupling to `.form-field` wrapper which provides form layout spacing, not component styling |
| 2 | City reset mechanism | `CountryCitySelect` internal state, or synthetic event via `onChange` prop | Synthetic event `{ target: { name: 'ciudad', value: '' } }` cast to `ChangeEvent<HTMLSelectElement>` | `handleChange` only destructures `name`/`value` from `e.target`; no internal state duplication needed |
| 3 | Catalog data structure | `Map<string, string[]>`, or `as const` object with derived types | `as const` object `COUNTRY_CITY_MAP` + derived `Country`/`City` types | Matches TypeScript const-types pattern from project standards; single source of truth |
| 4 | Transient option for unknown values | Dedicated prop `unknownValue`, or detect automatically | Automatic detection: if current value not in catalog → prepend `<option>` | Fewer props; molecule already has both value and catalog |
| 5 | handleChange widening | Per-form type update, or shared union type | Per-form: add `HTMLSelectElement` to `WineProducerForm` and `AnimalFeedProducerForm` event types | `BreweryForm` and `CoffeeFarmForm` already include it; minimal scope |

## Data Flow

```
Form (e.g., BreweryForm)
  │
  ├─ formData.pais ──→ CountryCitySelect
  │                     ├─ Select (country) ──→ onChange({ name:'pais', value })
  │                     │                       └─ if city invalid → onChange({ name:'ciudad', value:'' })
  │                     └─ Select (city)    ──→ onChange({ name:'ciudad', value })
  │
  └─ handleChange ←──── receives both events, updates formData via setFormData
```

Location catalog `locationData.ts` is imported once by `CountryCitySelect` — forms never reference it directly.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/shared/locationData.ts` | Create | `COUNTRY_CITY_MAP` as const, `Country`/`City` types, `getCitiesForCountry()` helper |
| `src/presentation/components/atoms/Select/Select.tsx` | Create | Mirrors `Input` atom: BEM classes, `label`/`name`/`value`/`options`/`onChange` props |
| `src/presentation/components/atoms/Select/select.scss` | Create | `.select-field`, `.__label`, `.__control` styles per `_variables` tokens |
| `src/presentation/components/atoms/Select/index.ts` | Create | Barrel export |
| `src/presentation/components/atoms/index.ts` | Modify | Add `export { Select } from './Select'` |
| `src/presentation/components/molecules/CountryCitySelect/CountryCitySelect.tsx` | Create | Dependent selects: renders 2 `Select`, filters cities, resets on country change, transient unknown-value options |
| `src/presentation/components/molecules/CountryCitySelect/CountryCitySelect.test.tsx` | Create | Unit tests: render, dependency filtering, city reset, unknown-value fallback |
| `src/presentation/components/molecules/CountryCitySelect/index.ts` | Create | Barrel export |
| `src/presentation/components/molecules/index.ts` | Modify | Add `export { CountryCitySelect } from './CountryCitySelect'` |
| `src/features/breweries/BreweryForm.tsx` | Modify | Replace `pais`/`ciudad` `Input` with `CountryCitySelect`; import + wiring |
| `src/features/breweries/BreweryForm.test.tsx` | Modify | Update create-flow tests: select country/city instead of typing |
| `src/features/coffee-farms/CoffeeFarmForm.tsx` | Modify | Replace `pais`/`ciudad` `Input` with `CountryCitySelect` |
| `src/features/coffee-farms/CoffeeFarmForm.test.tsx` | Modify | Update create-flow tests |
| `src/features/wine-producers/WineProducerForm.tsx` | Modify | Replace `Input`s, widen `handleChange` to include `HTMLSelectElement` |
| `src/features/wine-producers/WineProducerForm.test.tsx` | Modify | Update create-flow tests |
| `src/features/animal-feed-producers/AnimalFeedProducerForm.tsx` | Modify | Replace `Input`s, widen `handleChange` to include `HTMLSelectElement` |
| `src/features/animal-feed-producers/AnimalFeedProducerForm.test.tsx` | Modify | Update create-flow tests |
| `src/presentation/styles/_base.scss` | No change | `.form-field select` styles remain for inline selects; `Select` atom uses its own BEM classes |

## Interfaces / Contracts

```typescript
// locationData.ts
const COUNTRY_CITY_MAP = {
  Colombia: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga', 'Pereira', 'Manizales', 'Santa Marta', 'Cúcuta'],
  Venezuela: ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay', 'Ciudad Guayana', 'San Cristóbal', 'Mérida'],
} as const;

type Country = keyof typeof COUNTRY_CITY_MAP;
type City<T extends Country> = (typeof COUNTRY_CITY_MAP)[T][number];
type CountryCityMapping = typeof COUNTRY_CITY_MAP;

// Select.tsx
interface SelectOption { value: string; label: string; }

interface SelectProps {
  label: string;
  name: string;
  value: string;
  options: SelectOption[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
}

// CountryCitySelect.tsx
interface CountryCitySelectProps {
  pais: string;
  ciudad: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
}
```

Payload contract unchanged — `pais`/`ciudad` remain strings.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — `Select` | Renders label + select, calls onChange on option change | `@testing-library/react` + `userEvent.selectOptions` |
| Unit — `CountryCitySelect` | Renders both selects; city list filters when country changes; city resets on country change; transient option for unknown legacy pais/ciudad | `@testing-library/react` with mock `onChange` spy |
| Unit — `locationData` | `getCitiesForCountry()` returns correct array for valid/invalid country | Pure function test, no DOM |
| Integration — 4 forms | Create flow: select country → select city → submit; edit flow: preloads pais/ciudad in selects; unknown legacy value renders as transient option; payload contains correct string values | Each form's existing test file, replacing `userEvent.type` with `userEvent.selectOptions` for pais/ciudad |

No E2E tests in this change. Form `.test.tsx` files already use `MemoryRouter` + `apiClient` mock pattern.

## Migration / Rollout

No migration required. `pais`/`ciudad` remain strings in both form state and API payload. Rollback: `git revert` restores `Input` components.

## Open Questions

- [ ] Confirm exact city lists for Colombia and Venezuela with product owner — current list is best-effort from exploration
- [ ] Confirm `Departamento` stays free-text (proposal: yes, out of scope)
