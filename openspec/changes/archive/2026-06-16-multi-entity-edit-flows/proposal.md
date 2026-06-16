# Proposal: Multi-Entity Edit Flows

## Intent

The four entity list views (coffee farms, wine producers, breweries, animal feed producers) display `Editar` buttons that do nothing. Backend `PUT /{entity}/{id}` endpoints already exist and are tested. This change adds the missing frontend edit flow: route, form with pre-filled data, and update submission.

## Scope

### In Scope
- Add `/:entity/:id/edit` routes for all four entities in `router.tsx`
- Create `*Edit.tsx` components (one per entity) that fetch by ID, render pre-filled form, and `PUT` updates
- Wire existing `Editar` buttons in each `*List.tsx` to navigate to the edit route
- Array field round-trip: deserialize DB arrays → comma-separated form strings → re-serialize on submit
- Loading state during fetch, error handling for 404/update failures
- Tests for each Edit component (happy path, 404, submit failure)

### Out of Scope
- Generic form abstraction or shared field config system
- Search, inspect, count, or bulk-edit capabilities
- Backend schema or endpoint changes (already functional)
- Validation rule changes beyond what Create forms already enforce

## Capabilities

### New Capabilities
- `entity-edit-flows`: Frontend edit form, route, and update submission for all four entity types. Covers fetch-by-ID, pre-fill, PUT submit, error/loading states, and list-button wiring.

### Modified Capabilities
- `coffee-farms-crud`: Update "Advanced parity remains deferred" requirement — edit form is no longer deferred.
- `wine-producers-crud`: Update "Advanced parity remains deferred" requirement — edit form is no longer deferred.
- `animal-feed-producers-crud`: Update "Advanced parity remains deferred" requirement — edit form is no longer deferred.

## Approach

**Per-entity Edit components** (Approach 1 from exploration). Each `*Edit.tsx` is derived from its corresponding `*Create.tsx` with three additions:

1. `useParams` to read `:id` from the route
2. `useEffect` that `GET /{entity}/{id}` and populates form state (arrays → comma-separated strings)
3. Submit handler that `PUT /{entity}/{id}` instead of `POST /{entity}`

Delivery via chained PRs (one per entity) to respect the 400-line review budget.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-frontend/src/app/router.tsx` | Modified | Add four `/:id/edit` routes |
| `cortex-frontend/src/features/coffee-farms/CoffeeFarmEdit.tsx` | New | Edit form with fetch + PUT |
| `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.tsx` | Modified | Wire Edit button |
| `cortex-frontend/src/features/coffee-farms/index.ts` | Modified | Export edit component |
| `cortex-frontend/src/features/wine-producers/WineProducerEdit.tsx` | New | Edit form with fetch + PUT |
| `cortex-frontend/src/features/wine-producers/WineProducerList.tsx` | Modified | Wire Edit button |
| `cortex-frontend/src/features/wine-producers/index.ts` | Modified | Export edit component |
| `cortex-frontend/src/features/breweries/BreweryEdit.tsx` | New | Edit form with fetch + PUT |
| `cortex-frontend/src/features/breweries/BreweryList.tsx` | Modified | Wire Edit button |
| `cortex-frontend/src/features/breweries/index.ts` | Modified | Export edit component |
| `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerEdit.tsx` | New | Edit form with fetch + PUT |
| `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.tsx` | Modified | Wire Edit button |
| `cortex-frontend/src/features/animal-feed-producers/index.ts` | Modified | Export edit component |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Array field round-trip corruption | Medium | Explicit serialize/deserialize helpers with tests |
| Numeric precision loss on PUT | Medium | Parse decimals before submit; mirror Create form behavior |
| Single PR exceeds review budget | High | Deliver as chained PRs, one entity per PR |
| 404 UX unclear | Low | Show "record not found" with link back to list |

## Rollback Plan

Revert the four chained PRs in reverse order. Each PR is self-contained (one entity's edit files + list wiring), so individual reverts are safe. No database or backend changes to roll back.

## Dependencies

- Backend `PUT /{entity}/{id}` endpoints (already implemented and tested)
- `apiClient.put()` method (already available)
- Existing `*Create.tsx` components as structural reference

## Success Criteria

- [ ] All four Edit buttons navigate to a working edit form with pre-filled data
- [ ] Submitting an edit form updates the record and redirects to the list
- [ ] Missing records show a clear error with navigation back to list
- [ ] Array fields round-trip correctly (DB → form → DB without corruption)
- [ ] All new Edit components pass unit tests (happy path, 404, submit failure)
- [ ] Each chained PR stays under 400 changed lines
