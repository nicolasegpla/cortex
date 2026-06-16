# Design: Multi-Entity Edit Flows

## Technical Approach

Clone each `*Create.tsx` into a `*Edit.tsx`, add fetch-by-id + PUT submit, and share only the array serialization helpers. The existing Create components are self-contained 195-292 line form blocs with entity-specific fields, selects, and normalization — extracting JSX would require a schema/config layer that does not exist yet. Extracting only the duplicated `parseArray` logic into `src/shared/arrayUtils.ts` eliminates the only truly identical code without over-abstraction.

## Architecture Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D1 | Clone vs extract | Clone form JSX; extract `parseArray`/`joinArray` only | Forms diverge in fields, selects, sections. The existing pattern is per-entity self-contained components. A generic form abstraction has no precedent and risks fighting TypeScript strictness with no proven payoff. |
| D2 | Array serialization | `joinArray` in `src/shared/arrayUtils.ts`; reuse existing `parseArray` | Identical logic duplicated across 4 Create files. One shared file stops further copies and keeps round-trip behavior auditable in one place. |
| D3 | Number handling | `String(value)` on load; `parseInt`/pass-through on submit | Mirrors existing Create behavior exactly. Form state is always strings; serialization responsibility lives in the submit handler, not in state. |
| D4 | Edit button wiring | Replace `<button>` with `<Link to={backtick/{entity}/${id}/editbacktick}>` | Simplest React Router pattern. No extra event handler, no `useNavigate` for navigation that is purely link-like. |
| D5 | Error UX | Three states: `loading`, `notFound`, `submitError` | `notFound` (404) is a distinct recovery UX from `submitError` (PUT failure). Spec requires a not-found state with nav back to list. |
| D6 | Route pattern | Hardcoded entity paths: `/coffee-farms/:id/edit` | Matches existing `/coffee-farms/new` and `/coffee-farms` pattern. No dynamic `/:entity` segment needed. |

## Data Flow

```
List page [Edit click]
  → Link navigates to /coffee-farms/:id/edit
  → useParams extracts :id
  → useEffect → GET /coffee-farms/:id → CoffeeFarm entity
  → transformForForm(): arrays→comma strings, null→"", number→string
  → setFormData(transformed) → renders pre-filled form
  → User edits fields
  → Submit: transformForSubmit(): comma strings→arrays, ""→number parse
  → PUT /coffee-farms/:id → 200 OK
  → navigate(/coffee-farms) → back to list
```

**Non-obvious code** — the transform helpers:

```typescript
// src/shared/arrayUtils.ts
export const parseArray = (value: string): string[] =>
  value.trim() ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

export const joinArray = (arr: string[] | null | undefined): string =>
  arr?.length ? arr.join(', ') : '';
```

```typescript
// Inside CoffeeFarmEdit.tsx — transform on fetch
const transformForForm = (farm: CoffeeFarm) => ({
  ...farm,
  variedades_sembradas: joinArray(farm.variedades_sembradas),
  equipos: joinArray(farm.equipos),
  hectareas_totales: farm.hectareas_totales ?? '',
  hectareas_cafe: farm.hectareas_cafe ?? '',
  puntaje_cafe: farm.puntaje_cafe ?? '',
  numero_arboles: farm.numero_arboles != null ? String(farm.numero_arboles) : '',
});
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/shared/arrayUtils.ts` | Create | `parseArray` + `joinArray` helpers |
| `src/features/coffee-farms/CoffeeFarmEdit.tsx` | Create | Edit form (fetch, pre-fill, PUT, loading/notFound/error) |
| `src/features/coffee-farms/CoffeeFarmEdit.test.tsx` | Create | Happy path, 404, submit failure, array round-trip |
| `src/features/coffee-farms/CoffeeFarmList.tsx` | Modify | Wire Edit button → `<Link to={backtick/coffee-farms/${farm.id}/editbacktick}>` |
| `src/features/coffee-farms/CoffeeFarmCreate.tsx` | Modify | Import `parseArray` from shared |
| `src/features/coffee-farms/index.ts` | Modify | +`export { CoffeeFarmEdit }` |
| _Same pattern for wine-producers, breweries, animal-feed-producers_ |
| `src/app/router.tsx` | Modify | Add 4 `/:id/edit` routes under ProtectedRoute |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `arrayUtils.ts` | Pure functions — test empty string, single value, multi-value, null/undefined |
| Unit | `*Edit.tsx` | Mock fetch (happy path 200, 404, 500), verify prefilled fields, submit payload serialization, redirect on success, error display on failure, notFound message |
| Integration | List→Edit navigation | Render list with Link, click Edit, verify route change and form pre-fill |
| E2E | Not applicable | No browser-level flows needed for form submission |

## Migration / Rollout

No migration required. Backend is unchanged. Frontend delivery via 4 chained PRs (one per entity) per 400-line budget. Each PR is self-contained: Edit component + test + list wiring + router entry. Revert any PR safely.

## Open Questions

- [ ] Should `parseArray` be removed from `*Create.tsx` files and imported from `shared/arrayUtils.ts` in this same change? (Recommended: yes, to stop further duplication.)
- [ ] Confirm `BreweryCreate` and `WineProducerCreate` have no numeric fields requiring special parsing beyond the pattern already observed.
