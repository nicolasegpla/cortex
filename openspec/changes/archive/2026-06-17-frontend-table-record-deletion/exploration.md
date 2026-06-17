## Exploration: frontend-table-record-deletion

### Current State
The four database table views reachable from `/databases` are implemented as feature-specific list components: `BreweryList`, `CoffeeFarmList`, `WineProducerList`, and `AnimalFeedProducerList`. Each already renders an "Eliminar" button in the actions column and has a local `handleDelete` that:

1. Calls `window.confirm` for confirmation.
2. Calls `apiClient.delete(<entity>/${id})`.
3. On success filters the removed record from local React state.
4. On failure sets a generic Spanish error string.

Backend exposes `DELETE /breweries/:id`, `/coffee-farms/:id`, `/wine-producers/:id`, and `/animal-feed-producers/:id`, all returning `204 No Content` and guarded by `require_role(["super_admin"])`.

The `apiClient.request` helper unconditionally returns `response.json()`, so a real `204` response triggers a JSON parse error and the delete appears to fail even when the backend succeeded. Existing delete tests mock a `{}` body, hiding this bug.

### Affected Areas
- `cortex-frontend/src/services/api/client.ts` — must tolerate empty 204 bodies for DELETE.
- `cortex-frontend/src/features/breweries/BreweryList.tsx`
- `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.tsx`
- `cortex-frontend/src/features/wine-producers/WineProducerList.tsx`
- `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.tsx` — delete handlers need loading state, role gating, and better error feedback.
- `cortex-frontend/src/features/auth/store.ts` and `cortex-frontend/src/features/auth/RequireRole.tsx` — role already exposed; can reuse for permission gating.
- `cortex-frontend/src/features/breweries/BreweryList.test.tsx` — missing delete coverage (the other three list tests cover deletion).
- Backend routers/services — already support delete; no backend changes required unless error messages need adjustment.

### Approaches
1. **Minimal fix per list** — Patch `apiClient` for 204s, add a `deletingId` loading flag and role-based hiding to each of the four list components, add the missing brewery delete test.
   - Pros: Smallest diff, stays within the current pattern.
   - Cons: Repeats the same delete UX logic in four places; harder to maintain and keep consistent.
   - Effort: Low

2. **Extract reusable delete action** — Create a small `useDeleteRecord` hook or `DeleteButton` component that owns confirmation, loading, error callback, and role visibility. Refactor the four lists to consume it.
   - Pros: Single source of truth for destructive-action UX; easier to add toast/modal later; aligns with DRY and React 19 server/client boundaries.
   - Cons: Slightly larger initial refactor; requires updating tests.
   - Effort: Medium

### Recommendation
Approach 2: extract a reusable delete action. The duplication across four list components is the dominant maintenance risk, and the issue explicitly calls for consistent loading/success/error states. A shared hook/component also makes it trivial to swap `window.confirm` for an accessible modal later.

### Risks
- `apiClient` currently breaks on `204 No Content`, so the existing delete buttons will surface false failures against the real backend until the client is fixed.
- Delete is backend-restricted to `super_admin`, but the UI currently shows the button to every authenticated user, leading to avoidable 403 errors.
- Supabase FK/RLS errors are not explicitly handled; they will surface as generic 500/403 messages.
- No success feedback after deletion; the row simply disappears, which is acceptable but may not satisfy "clear feedback".

### Ready for Proposal
Yes. The integration points are mapped and the gap is well-defined: wire existing buttons correctly, fix the 204 parsing bug, and standardize UX. The orchestrator should tell the user that deletion is already partially implemented but has real bugs/UX gaps, and ask whether they want a minimal fix or a reusable component.
