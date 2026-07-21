# Design: fix-location-catalog-tests

## Technical Approach

Single-file data revert: replace the 33-entry Colombia department list in `COUNTRY_CITY_MAP.Colombia` with the exact 32-city list from commit 40b6d14. No type, helper, component, or test changes. The `Venezuela` array is byte-identical between current and 40b6d14, so it stays untouched. The 4 failing tests assert only on cities that exist in the restored list, so they pass unchanged once the catalog is correct.

## Architecture Decisions

### Decision: Verbatim restore from 40b6d14 instead of surgical edits

**Choice**: Replace the entire Colombia array with the 40b6d14 list verbatim (including ordering, with "Bogotá D.C." first).
**Alternatives considered**: (a) Surgical add/remove to satisfy only the 4 failing tests; (b) Rebuild the list from the spec catalog table.
**Rationale**: 40b6d14 is the reviewed, shipped, known-good state with matching tests. Surgical edits risk introducing unreviewed additions or drift from the spec table (which was itself corrected to match 40b6d14). Verbatim restore makes apply mechanical and keeps spec ↔ implementation ↔ tests aligned.

### Decision: No migration for departments stored as `ciudad` during the broken window

**Choice**: Leave persisted department values as-is; rely on `resolveCityOptions` transient fallback.
**Alternatives considered**: Add a one-time migration mapping department names to a representative city.
**Rationale**: `resolveCityOptions(country, currentCity)` (lines 74–86 of `locationData.ts`) already checks `cities.includes(currentCity)` and, on miss, returns `[currentCity, ...cities]`. Any producer who stored a department name (e.g. "Antioquia") between Jul 8 and now will still see it as the first option in the select — no data loss, no UI gap. Migration is out of scope per proposal; revisit only if volume is significant.

## Data Flow

```
locationData.ts (COUNTRY_CITY_MAP.Colombia)
        │
        ├─→ getCitiesForCountry(country) ─→ CountryCitySelect options
        │                                        │
        └─→ resolveCityOptions(country, current) ─┘
                  │
                  ├─ current in catalog? → return catalog cities
                  └─ current NOT in catalog? → [current, ...catalog] (legacy fallback)
```

The revert only changes the leaf data feeding both helpers. No call-site or signature changes.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `cortex-frontend/src/shared/locationData.ts` | Modify | Replace lines 2–36 (the `Colombia: [...]` array, 33 departments) with the 32-city list below. Venezuela array and all helpers/types unchanged. |

### Exact replacement for `COUNTRY_CITY_MAP.Colombia`

```ts
    Colombia: [
        'Bogotá D.C.',
        'Medellín',
        'Cali',
        'Barranquilla',
        'Cartagena de Indias',
        'Bucaramanga',
        'Cúcuta',
        'Pereira',
        'Santa Marta',
        'Ibagué',
        'Manizales',
        'Villavicencio',
        'Pasto',
        'Neiva',
        'Armenia',
        'Popayán',
        'Valledupar',
        'Montería',
        'Sincelejo',
        'Tunja',
        'Riohacha',
        'Florencia',
        'Quibdó',
        'Yopal',
        'Mocoa',
        'San José del Guaviare',
        'Arauca',
        'San Andrés',
        'Leticia',
        'Mitú',
        'Puerto Carreño',
        'Inírida',
    ],
```

Apply is mechanical: delete the 33 department string literals, paste the 32 above. Nothing else in the file moves.

## Interfaces / Contracts

No interface changes. Existing exports remain identical:
- `COUNTRY_CITY_MAP` — `as const` object, Colombia array length 33 → 32, content swapped.
- `Country`, `City<T>`, `CountryCityMapping` — unchanged (derived types tighten to the new city union automatically).
- `getCitiesForCountry(country: string): readonly string[]` — unchanged.
- `resolveCityOptions(country: string, currentCity: string): string[]` — unchanged; legacy fallback already covers departments stored as `ciudad`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `locationData.test.ts` — Colombia non-empty, first entry "Bogotá D.C.", contains Medellín, `resolveCityOptions` known-city dedup + unknown-city transient prepend | Run `pnpm vitest run src/shared/locationData.test.ts` — must pass unchanged |
| Unit | `CountryCitySelect.test.tsx` — Medellín, Cali, Bogotá D.C., Palmira (legacy) options | Run `pnpm vitest run src/presentation/components/molecules/CountryCitySelect/CountryCitySelect.test.tsx` — must pass unchanged |
| Unit | `BreweryForm.test.tsx`, `WineProducerForm.test.tsx` — city field consumers still pass | Run `pnpm vitest run src/features/breweries/BreweryForm.test.tsx src/features/wine-producers/WineProducerForm.test.tsx` — must pass unchanged |
| Integration | Full frontend suite | `pnpm vitest run` exits 0 (no regressions) |
| Build | Type-check + bundle | `pnpm build` exits 0 (the `City<T>` union narrows; no consumer relies on removed department strings) |

Verification command sequence (apply phase):
```
pnpm vitest run src/shared/locationData.test.ts
pnpm vitest run src/presentation/components/molecules/CountryCitySelect/CountryCitySelect.test.tsx
pnpm vitest run src/features/breweries/BreweryForm.test.tsx src/features/wine-producers/WineProducerForm.test.tsx
pnpm vitest run                           # full suite
pnpm build
```

The legacy "Palmira" assertion in `CountryCitySelect.test.tsx` exercises the `resolveCityOptions` fallback path — Palmira is NOT in the 32-city list, so it must be prepended as a transient option. This proves the fallback works without migration.

Coverage note: the spec scenarios "Colombia has exactly 32 cities" and "Colombia excludes department names" are NOT enforced by the existing test file (it asserts non-empty, Bogotá D.C. first, contains Medellín). They hold true of the restored data and are verified by the apply-phase review of the restored list against `git show 40b6d14`, not by the suite. The verify phase must not claim test coverage for them.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Pure data revert in a single TS module.

## Migration / Rollout

No migration required. The legacy-window concern (departments stored as `ciudad` between Jul 8 and now) is absorbed by `resolveCityOptions`'s existing transient-fallback behavior, verified by reading the helper (lines 74–86): on `!cities.includes(currentCity)` it returns `[currentCity, ...cities]`.

Rollback: `git revert` the single restore commit — returns to the 33-department state. No schema or component changes to unwind.

## Open Questions

- None. The 32-city list, the fallback behavior, and the test expectations are all confirmed against source.