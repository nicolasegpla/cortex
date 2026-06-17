# Proposal: Frontend Table Record Deletion

## Intent

The four database table views (breweries, coffee farms, wine producers, animal feed producers) already render "Eliminar" buttons with delete handlers, but they have critical bugs and UX gaps:

- `apiClient` fails to parse `204 No Content` responses, causing false failure states even when the backend succeeds
- No loading state during deletion — the UI feels unresponsive
- No explicit success or error feedback beyond the row disappearing
- The delete button is visible to all authenticated users, but the backend restricts delete to `super_admin` only, causing unnecessary 403 errors
- `window.confirm` is used instead of an accessible in-app modal
- Brewery list tests are missing delete coverage

This change fixes the 204 parsing bug, standardizes the delete UX across all four lists, and adds proper permission awareness and feedback.

## Scope

### In Scope
- Fix `apiClient` to handle `204 No Content` responses from DELETE endpoints
- Replace `window.confirm` with a custom accessible confirmation modal
- Add loading state (`deletingId`) to each list during deletion
- Show explicit success and error feedback inside the confirmation modal
- Keep delete button visible for all users; show permission error on unauthorized attempt
- Add missing delete test coverage for `BreweryList`
- Extract reusable delete action (hook or component) to avoid duplicating logic across four lists

### Out of Scope
- Backend changes — DELETE endpoints already exist and work correctly
- Soft-delete — all four entities use hard-delete
- Toast notifications — feedback is shown inside the confirmation modal
- Role-based button hiding — button remains visible per product decision
- FK/RLS constraint error special-casing — surfaces as generic error message

## Capabilities

### New Capabilities
- `record-deletion-ux`: Shared delete confirmation modal, loading state, and feedback pattern consumed by all four entity list components

### Modified Capabilities
- `coffee-farms-crud`: Frontend delete UX requirements (confirmation, loading, feedback)
- `wine-producers-crud`: Frontend delete UX requirements (confirmation, loading, feedback)
- `animal-feed-producers-crud`: Frontend delete UX requirements (confirmation, loading, feedback)
- `breweries-crud` (if spec exists): Frontend delete UX requirements — otherwise covered implicitly by the new capability

## Approach

1. **Fix `apiClient.request`** to detect `204` status and return `null`/`undefined` instead of calling `response.json()` on an empty body — this is the root cause of false delete failures
2. **Create a shared `useDeleteRecord` hook** that encapsulates: confirmation modal state, API call, loading state, success/error callbacks, and role-aware error messaging
3. **Create a `DeleteConfirmationModal` component** — an accessible dialog that shows: confirmation text, loading spinner, success message, and error message (with dismiss/confirm buttons)
4. **Refactor each of the four list components** to consume the shared hook instead of inline `handleDelete` logic
5. **Add missing BreweryList delete test** to match coverage of the other three lists

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-frontend/src/services/api/client.ts` | Modified | Handle 204 No Content responses |
| `cortex-frontend/src/components/` | New | `DeleteConfirmationModal` component |
| `cortex-frontend/src/hooks/` | New | `useDeleteRecord` hook |
| `cortex-frontend/src/features/breweries/BreweryList.tsx` | Modified | Replace inline delete with shared hook |
| `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.tsx` | Modified | Replace inline delete with shared hook |
| `cortex-frontend/src/features/wine-producers/WineProducerList.tsx` | Modified | Replace inline delete with shared hook |
| `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.tsx` | Modified | Replace inline delete with shared hook |
| `cortex-frontend/src/features/breweries/BreweryList.test.tsx` | Modified | Add delete test coverage |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `apiClient` 204 fix breaks other consumers that expect `{}` | Low | Add explicit check: only skip `json()` on 204 or empty content-length |
| Modal accessibility regressions | Medium | Use native `<dialog>` or well-tested radix/aria patterns; test with keyboard |
| Test mocks hide the 204 bug again | Medium | Update test mocks to return actual 204 responses, not `{}` |
| Four list refactor introduces regressions | Medium | Refactor one list first, verify tests pass, then apply pattern to the rest |

## Rollback Plan

1. Revert the git commit(s) containing the delete UX changes
2. The `apiClient` 204 fix is safe to keep — it corrects a real bug; if it causes issues, revert to the previous `response.json()` behavior with a try/catch fallback
3. No database changes to roll back — this is purely frontend

## Dependencies

- None — all backend DELETE endpoints are already implemented and tested
- Auth role store (`useAuthStore`) is already available for permission checks

## Success Criteria

- [ ] DELETE requests succeed without JSON parse errors on real backend (204 handled correctly)
- [ ] All four list components show a custom confirmation modal (not `window.confirm`)
- [ ] Loading state is visible during deletion (button disabled, spinner shown)
- [ ] Success feedback is shown inside the modal after successful deletion
- [ ] Error feedback (including 403) is shown inside the modal on failure
- [ ] Delete button remains visible for non-super-admin users
- [ ] `BreweryList` has delete test coverage matching the other three lists
- [ ] All existing tests continue to pass
