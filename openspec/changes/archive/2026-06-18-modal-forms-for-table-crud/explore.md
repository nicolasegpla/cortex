## Exploration: modal-forms-for-table-crud

### Current State

The `cortex-frontend` application already renders CRUD tables for four producer-like domains: **breweries**, **coffee-farms**, **animal-feed-producers**, and **wine-producers**. Each domain follows the same architectural pattern:

1. A `*List` component fetches the collection via `apiClient.get('/<domain>')` and renders a custom HTML `<table>` with three summary columns.
2. Clicking a row opens an `EntityDetailModal` that shows read-only details and `Edit` / `Delete` actions.
3. Clicking `Edit` or the list page's `Agregar *` link navigates to separate form routes (`/<domain>/new` and `/<domain>/:id/edit`).
4. `*Create` and `*Edit` components render full-page forms with `useNavigate()` and redirect back to the list on success (`navigate('/<domain>')`).
5. `UserManagement` already uses an inline modal for create flows, but it is an isolated implementation and not route-driven.

There is no reusable form-modal abstraction. Each form duplicates ~250-400 lines of JSX, state, and array-field normalization (`parseArray` / `joinArray`).

### Affected Areas

| Path | Role in current flow |
|------|----------------------|
| `src/app/router.tsx` | Declares `/<domain>`, `/<domain>/new`, `/<domain>/:id/edit` for the four domains. |
| `src/features/breweries/BreweryList.tsx` | Custom table; row click opens detail modal; `Edit` navigates to `/breweries/:id/edit`; `Agregar` links to `/breweries/new`. |
| `src/features/breweries/BreweryCreate.tsx` | Full-page create form; redirects to `/breweries`. |
| `src/features/breweries/BreweryEdit.tsx` | Full-page edit form; fetches by `id`; redirects to `/breweries`. |
| `src/features/coffee-farms/CoffeeFarmList.tsx` | Same pattern as breweries for coffee farms. |
| `src/features/coffee-farms/CoffeeFarmCreate.tsx` | Same pattern as breweries. |
| `src/features/coffee-farms/CoffeeFarmEdit.tsx` | Same pattern as breweries. |
| `src/features/animal-feed-producers/AnimalFeedProducerList.tsx` | Same pattern; primary identity uses `marca \|\| razon_social`. |
| `src/features/animal-feed-producers/AnimalFeedProducerCreate.tsx` | Same pattern. |
| `src/features/animal-feed-producers/AnimalFeedProducerEdit.tsx` | Same pattern. |
| `src/features/wine-producers/WineProducerList.tsx` | Same pattern. |
| `src/features/wine-producers/WineProducerCreate.tsx` | Same pattern. |
| `src/features/wine-producers/WineProducerEdit.tsx` | Same pattern. |
| `src/presentation/components/organisms/EntityDetailModal/EntityDetailModal.tsx` | Detail modal already used by all four lists. |
| `src/presentation/components/organisms/DeleteConfirmationModal/DeleteConfirmationModal.tsx` | Delete confirmation modal already used by all four lists and `UserManagement`. |
| `src/shared/modalUtils.ts` | Utilities for nested-modal detection (`getTopmostModal`, `hasNestedModal`). |
| `src/hooks/useDeleteRecord.ts` | Shared deletion hook used by the four list pages. |
| `src/presentation/layouts/AppShell.tsx` | Contains an inline modal implementation for `ConfigPage`; shows existing overlay/backdrop pattern. |
| `src/features/user-management/UserManagement.tsx` | Already implements an inline create-user modal with `useActionState`; useful as a precedent. |
| `src/features/breweries/*.test.tsx` and other `*List.test.tsx` / `*Create.test.tsx` / `*Edit.test.tsx` | 30+ tests covering navigation, modal open/close, create/edit payloads, redirects, and deletion. |

### Table + Form Details

- **Table implementation**: No table library (TanStack, AG Grid, etc.). Pure semantic HTML `<table>` styled with per-feature SCSS files.
- **Row interaction**: Row click or row-action button opens `EntityDetailModal`. Buttons have explicit Spanish `aria-label`s (`Ver detalles de …`).
- **Form fields**: Hand-rolled controlled components using the `Input` atom plus native `<select>` and `<textarea>`. Array fields are entered as comma-separated strings.
- **Data normalization**: `parseArray()` and `joinArray()` in `src/shared/arrayUtils.ts`.
- **API client**: `src/services/api/client.ts` provides `get`, `post`, `put`, `delete` with Supabase token injection.
- **State per list**: Each list manages its own `useState` for loading, error, items, selected item, and detail-modal open state. No shared collection cache.

### Existing Modal/Dialog Patterns

1. **`EntityDetailModal`** (`src/presentation/components/organisms/EntityDetailModal/EntityDetailModal.tsx`)
   - Uses native `<dialog>` with `showModal()` / `close()`.
   - Handles `Escape` and backdrop click via `onCancel` and `onClick`.
   - Provides close button, title, sections, `Edit`, and `Delete` actions.
2. **`DeleteConfirmationModal`**
   - Native `<dialog>`.
   - Shows success state, error, spinner, confirm/cancel buttons.
3. **`AppShell`** inline config modal
   - Custom `<div>` overlay with role presentation, centered dialog, Escape/backdrop close, and nested-modal guard via `hasNestedModal`.
4. **`UserManagement`** create-user modal
   - Custom `<section role="dialog" aria-modal="true">` inside a `<div>` overlay.
   - Uses `useActionState` for form submission.
   - Shows the precedent for inline create forms but is not generalized.

### Routing and Navigation

- Router: `createBrowserRouter` from `react-router-dom` 7.6.2 (declarative, not the new data-router loaders).
- Navigation is imperative via `useNavigate()`.
- On success, forms call `navigate('/<domain>')`; on failure they keep the user on the form page.
- Deep links to `/breweries/new` or `/breweries/:id/edit` render as standalone pages today.

### Shared State (Zustand)

Only three stores exist:

- `src/features/auth/store.ts` — auth session, role, logout.
- `src/store/useSidebarStore.ts` — sidebar collapsed state (persisted).
- `src/store/useThemeStore.ts` — theme (persisted).

No CRUD/table cache store exists. Keeping table context while a modal is open can be done simply by mounting the modal **inside** the list page, so the list's local state and `useEffect` fetch remain alive. No global store is strictly required.

### Existing Tests

- `src/app/router.test.tsx` — route presence assertions.
- `src/features/breweries/BreweryList.test.tsx` — 13 tests.
- `src/features/breweries/BreweryEdit.test.tsx` — 4 tests.
- `src/features/coffee-farms/CoffeeFarmList.test.tsx` — 14 tests.
- `src/features/coffee-farms/CoffeeFarmCreate.test.tsx` — 3 tests.
- `src/features/coffee-farms/CoffeeFarmEdit.test.tsx` — 4 tests.
- `src/features/animal-feed-producers/AnimalFeedProducerList.test.tsx` — 14 tests.
- `src/features/animal-feed-producers/AnimalFeedProducerCreate.test.tsx` — 3 tests.
- `src/features/animal-feed-producers/AnimalFeedProducerEdit.test.tsx` — 4 tests.
- `src/features/wine-producers/WineProducerList.test.tsx` — 15 tests.
- `src/features/wine-producers/WineProducerCreate.test.tsx` — 4 tests.
- `src/features/wine-producers/WineProducerEdit.test.tsx` — 4 tests.
- `src/presentation/components/organisms/EntityDetailModal/EntityDetailModal.test.tsx` and `DeleteConfirmationModal.test.tsx`.
- `src/features/user-management/UserManagement.test.tsx` — modal create/delete tests.

Most list tests assert navigation to edit routes via mocked `useNavigate`. Migrating to modals will require rewriting those assertions to assert modal open/close instead.

### Approaches

#### 1. Inline modal inside each `*List` component (co-located)

Convert each `*Create` and `*Edit` page into a component that can render either as a page or inside a modal. Each `*List` component conditionally renders `<BreweryCreateModal />` / `<BreweryEditModal />` based on local state, triggered by replacing `navigate(...)` with `setIsCreateOpen(true)` / `setEditId(id)`.

- **Pros**: Minimal router changes; table context stays alive automatically; easy to implement per domain incrementally.
- **Cons**: Repeats modal wiring four times; does not reduce duplication; harder to later support deep-linking to an open modal.
- **Effort**: Medium

#### 2. Reusable `EntityFormModal` wrapper + route-driven modal state

Create a generic modal shell (`EntityFormModal`) that accepts a form child and title. Keep `/<domain>/new` and `/<domain>/:id/edit` routes but render them **inside** the list route via React Router 7 nested routes/outlets, or use route `state`/`searchParams` to know which modal is open.

- **Pros**: Centralized modal behavior (backdrop, Escape, focus, loading states); routes still exist for deep-linking; consistent UX.
- **Cons**: More router rework; requires careful outlet composition to keep the list mounted underneath; React Router 7 data APIs not currently used, so search-param state is simpler.
- **Effort**: Medium-High

#### 3. Convert forms to generic `*Form` components, mount in `EntityDetailModal`-like dialog

Extract each form's JSX/state into `BreweryForm`, `CoffeeFarmForm`, etc. Replace `*Create`/`*Edit` pages with modal invocations inside the list. The form component accepts `initialData`, `onSubmit`, and `onCancel` props.

- **Pros**: Strong reuse of form logic; tests can target `*Form` components directly; aligns with DRY.
- **Cons**: Larger refactor surface; each form is still domain-specific because schemas differ.
- **Effort**: Medium

#### 4. Preserve routes but render forms in a modal overlay via `Outlet`/`state`

Keep the routes but change the route elements so that `/<domain>/new` and `/<domain>/:id/edit` render a modal over the list instead of a full page. The list route uses `useLocation().state` or search params to decide which modal to open, and the form's success handler navigates back with `navigate('/<domain>', { replace: true })`.

- **Pros**: Deep links still work; browser back button closes the modal naturally; leverages existing route declarations.
- **Cons**: Requires React Router modal patterns; needs explicit handling for direct navigation to form route when list data is not loaded.
- **Effort**: High

### Recommendation

Start with **Approach 3** (extract domain-specific `*Form` components and mount them inside a reusable modal from each `*List`), because:

- It eliminates the most duplication while keeping the change testable.
- It avoids risky router re-architecture in the current declarative `createBrowserRouter` setup.
- Table context is preserved automatically because the modal is rendered inside the mounted list page.
- It can be delivered incrementally (one domain at a time) with work-unit commits.

If the user later requires deep-linkable create/edit modals, evolve toward **Approach 4** using React Router 7 modal route patterns.

### Risks

- **Test churn**: ~30 existing tests assert `useNavigate` calls to `/new` and `/:id/edit`. These need new assertions verifying modal visibility, form submission, and list refresh.
- **Accessibility**: Native `<dialog>` works well, but stacking a form modal on top of the existing detail modal requires focus/escape precedence. The existing `getTopmostModal` helper is reusable.
- **Scroll lock / body overflow**: Current modals rely on `<dialog>` `showModal`; form modals with long forms may need a scrollable inner container.
- **Stale list data**: After create/edit success, the list should refresh. Current forms redirect, which re-mounts the list. With modals, the list must explicitly reload or the form must update local state.
- **Duplication vs. abstraction**: The four domains have different field sets. A premature generic form generator may over-abstract. Domain-specific form components are safer.
- **Route cleanup**: Removing or changing `/<domain>/new` and `/<domain>/:id/edit` routes affects direct links/bookmarks. Decide whether to keep them as redirect-to-modal or remove them entirely.

### Open Questions

1. Should deep links to `/breweries/new` or `/breweries/:id/edit` still open the modal, or should they redirect to the list with the modal open?
2. Should the `EntityDetailModal` be reused as the form container, or should a new `EntityFormModal` organism be created?
3. After a successful create/update, should the list refetch from the API or be updated optimistically from the response?
4. Should we extract the form components first, then wire modals, or do both in one pass per domain?
5. Does the user want to migrate all four domains at once, or start with one (e.g., breweries) as a pilot?
6. Should the modal close on successful submission, or should it show a success state before closing?
7. Is the detail modal's `Edit` button the only entry point to edit, or should there also be per-row "edit" actions outside the detail modal?

### Ready for Proposal

Yes. The codebase is well understood and the change is feasible. The orchestrator should ask the user the open questions above (especially #1, #3, and #5) and then proceed to `sdd-propose`.
