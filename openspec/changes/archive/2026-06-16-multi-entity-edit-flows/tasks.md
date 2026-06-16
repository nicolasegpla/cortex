# Tasks: Multi-Entity Edit Flows

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

## Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | `src/shared/arrayUtils.ts` + CoffeeFarm edit | PR 1 | base=main; shared utils + first entity |
| 2 | WineProducer edit | PR 2 | base=main; immediate parent=PR1 |
| 3 | Brewery edit | PR 3 | base=main; immediate parent=PR2 |
| 4 | AnimalFeedProducer edit | PR 4 | base=main; immediate parent=PR3 |

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~900-1200 total; ~200-300 per entity slice |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 4 stacked PRs (one per entity) |
| Delivery strategy | auto-forecast |
| Chain strategy | stacked-to-main |

## Phase 1: Shared Infrastructure

- [x] 1.1 Create `src/shared/arrayUtils.ts` with `parseArray` (moved from each `*Create.tsx`) and `joinArray` helpers
- [x] 1.2 Import `parseArray` from `src/shared/arrayUtils.ts` in `CoffeeFarmCreate.tsx`, `WineProducerCreate.tsx`, `BreweryCreate.tsx`, `AnimalFeedProducerCreate.tsx` — remove local duplicates

## Phase 2: CoffeeFarm Edit (PR 1)

- [x] 2.1 Create `src/features/coffee-farms/CoffeeFarmEdit.tsx` — fetch by id, `transformForForm`, prefill, PUT submit, loading/notFound/submitError states
- [x] 2.2 Create `src/features/coffee-farms/CoffeeFarmEdit.test.tsx` — happy path, 404, submit failure, array round-trip
- [x] 2.3 Modify `src/features/coffee-farms/CoffeeFarmList.tsx` — replace Edit `<button>` with `<Link to={\`/coffee-farms/${farm.id}/edit\`}>`
- [x] 2.4 Modify `src/features/coffee-farms/index.ts` — add `export { CoffeeFarmEdit }`
- [x] 2.5 Modify `src/app/router.tsx` — add `path="/coffee-farms/:id/edit"` route under ProtectedRoute

## Phase 3: WineProducer Edit (PR 2)

- [x] 3.1 Create `src/features/wine-producers/WineProducerEdit.tsx`
- [x] 3.2 Create `src/features/wine-producers/WineProducerEdit.test.tsx`
- [x] 3.3 Modify `src/features/wine-producers/WineProducerList.tsx` — wire Edit link
- [x] 3.4 Modify `src/features/wine-producers/index.ts` — add `export { WineProducerEdit }`
- [x] 3.5 Modify `src/app/router.tsx` — add `path="/wine-producers/:id/edit"` route

## Phase 4: Brewery Edit (PR 3)

- [x] 4.1 Create `src/features/breweries/BreweryEdit.tsx`
- [x] 4.2 Create `src/features/breweries/BreweryEdit.test.tsx`
- [x] 4.3 Modify `src/features/breweries/BreweryList.tsx` — wire Edit link; export `Brewery` interface
- [x] 4.4 Modify `src/features/breweries/index.ts` — add `export { BreweryEdit }`
- [x] 4.5 Modify `src/app/router.tsx` — add `path="/breweries/:id/edit"` route

## Phase 5: AnimalFeedProducer Edit (PR 4)

- [x] 5.1 Create `src/features/animal-feed-producers/AnimalFeedProducerEdit.tsx`
- [x] 5.2 Create `src/features/animal-feed-producers/AnimalFeedProducerEdit.test.tsx`
- [x] 5.3 Modify `src/features/animal-feed-producers/AnimalFeedProducerList.tsx` — wire Edit link
- [x] 5.4 Modify `src/features/animal-feed-producers/index.ts` — add `export { AnimalFeedProducerEdit }`
- [x] 5.5 Modify `src/app/router.tsx` — add `path="/animal-feed-producers/:id/edit"` route
