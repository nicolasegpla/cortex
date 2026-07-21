# Tasks: fix-location-catalog-tests

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~35 (one file) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr-default |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| WU1 | Restore Colombia 32-city list verbatim; run the 4-test corrected verification sequence from `design.md` `## Testing Strategy` | (same PR) | `pnpm vitest run src/shared/locationData.test.ts src/presentation/components/molecules/CountryCitySelect/CountryCitySelect.test.tsx src/features/breweries/BreweryForm.test.tsx src/features/wine-producers/WineProducerForm.test.tsx` | N/A — pure data revert in a TS module, no new process boundary | `git checkout HEAD -- cortex-frontend/src/shared/locationData.ts` restores the 33-department content without touching any other file |
| WU2 | Full gate (vitest + build) and commit | (same PR) | `pnpm vitest run && pnpm build` | N/A — gate already includes type-check + bundle | `git revert` of the single restore commit returns to the 33-department state |

### Strict TDD note

This is a data revert. The 4 currently-RED tests already exist; making them GREEN requires only restoring the catalog content. No new test writing is part of this change.

### Coverage note (from design)

Spec scenarios "Colombia has exactly 32 cities" and "Colombia excludes department names" are NOT enforced by the test suite. They are satisfied by the byte-exact diff against `git show 40b6d14` performed in task 1.3.

### Threat matrix

N/A — design marked all rows N/A (pure data revert in a single TS module).

## Phase 1: Restore catalog data (WU1)

- [x] 1.1 Replace `Colombia: [...]` in `cortex-frontend/src/shared/locationData.ts` (lines 2–36, 33 department strings) with the exact 32-city list embedded in `design.md` ("Bogotá D.C." first, "Inírida" last). Leave Venezuela array, exports, helpers, and types untouched.
- [x] 1.2 Run the corrected verification sequence from `design.md` `## Testing Strategy`: the 4-file vitest invocation. All 4 currently-RED tests must turn GREEN; no regressions.
- [x] 1.3 Verify byte-exact restore: `git diff --no-color 40b6d14 -- cortex-frontend/src/shared/locationData.ts` — Colombia array lines line up, count = 32, ordering matches. Satisfies the 32-cities and department-exclusion scenarios the test suite does not enforce.

## Phase 2: Full gate and commit (WU2)

- [x] 2.1 Full suite: `pnpm vitest run` exits 0 from `cortex-frontend/`.
- [x] 2.2 Build + type-check: `pnpm build` exits 0 from `cortex-frontend/`. The narrowed `City<Colombia>` union must compile; no consumer may rely on removed department strings.
- [x] 2.3 Stage only `cortex-frontend/src/shared/locationData.ts`; commit `fix(location-catalog): restore Colombia 32-city list` referencing the regression and `40b6d14`.
- [x] 2.4 Confirm `git diff --stat HEAD` shows only that file changed, ~35 lines.
