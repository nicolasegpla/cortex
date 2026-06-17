## Exploration: Move user management from `/admin` into Configuration

### Current State

- `ConfigPage` (`cortex-frontend/src/presentation/pages/ConfigPage.tsx`) renders a single, hard-coded tab named **Proveedores de modelos** inside a two-column layout: a left navigation rail and a right content area.
- `ChatSettings` (`cortex-frontend/src/features/chat/ChatSettings.tsx`) provides the existing modal/editor pattern used for API keys: a fixed-position overlay, a centered card with a close button, a focused form, and primary action buttons.
- `AdminPage` (`cortex-frontend/src/presentation/pages/AdminPage.tsx`) is a standalone page that fetches users, renders a create-user form, lists users, and supports user deletion through `DeleteConfirmationModal`. It is protected by `RequireRole` on route `/admin`.
- The sidebar navigation (`cortex-frontend/src/presentation/config/navigation.ts`) exposes both **Configuración** (opens the config modal) and **Administración** (links to `/admin`, visible only to `super_admin`).
- Database-style tables are implemented per feature (e.g. `BreweryList.scss`) using the `card-base` mixin, a header with a title and an add-button "chip", a scrollable table wrapper, sticky headers, and row actions.
- No reusable table molecule or generic modal component exists yet; patterns are copied and adapted per feature.

### Affected Areas

- `cortex-frontend/src/presentation/pages/ConfigPage.tsx` — must become tab-aware (`Proveedores` and `Usuarios`) and render the active panel conditionally.
- `cortex-frontend/src/presentation/pages/ConfigPage.scss` — needs styles for active/inactive nav items and possibly tab content height.
- `cortex-frontend/src/presentation/pages/AdminPage.tsx` — logic will be extracted or replaced by a new user-management component; page will be deleted.
- `cortex-frontend/src/presentation/pages/AdminPage.test.tsx` — tests must move to the new component or to `ConfigPage` tests.
- `cortex-frontend/src/features/user-management/UserManagement.tsx` (new) — recommended home for the extracted list/form/delete logic.
- `cortex-frontend/src/features/user-management/UserCreateModal.tsx` (new) — modal styled after `ChatSettings` editor, containing the user-creation form.
- `cortex-frontend/src/features/user-management/UserManagement.scss` (new) — database-table style matching `BreweryList.scss`.
- `cortex-frontend/src/app/router.tsx` — remove the `/admin` route.
- `cortex-frontend/src/presentation/config/navigation.ts` — remove the `Administración` sidebar item.
- `cortex-frontend/src/features/auth/RequireRole.tsx` — role gating must move from the `/admin` route to the `Usuarios` tab or its container.
- `cortex-frontend/src/services/adminUserApi.ts` — API surface remains valid; no backend changes expected.

### Approaches

1. **Inline tab extension + new feature component**
   - Add local state to `ConfigPage` for the active tab.
   - Extend `CONFIG_TAB` and `navSections` with a `users` entry.
   - Create a new `UserManagement` feature component that reuses the data/fetch/delete logic from `AdminPage` and renders the table with the `BreweryList` style.
   - Create a `UserCreateModal` that mirrors the `ChatSettings` editor overlay.
   - Delete `AdminPage` and its route/navigation entry.
   - Pros: Minimal routing changes, keeps the config shell intact, reuses existing patterns, preserves modal and page variants of `ConfigPage`.
   - Cons: `ConfigPage` gains state and conditional rendering; role check must be implemented inside the tab rather than at the route level.
   - Effort: Medium

2. **Sub-route inside Configuration**
   - Keep `ConfigPage` as a layout and add child routes such as `/config/providers` and `/config/users`.
   - Render the users view as a routed page inside the config shell, still accessible from the same sidebar action.
   - Pros: URL-driven tab state, clean separation.
   - Cons: `ConfigPage` is currently rendered both as a standalone route and as a modal inside `AppShell`; child routes would not work cleanly in the modal variant without extra routing context. Significant router and test changes.
   - Effort: High

### Recommendation

Use **Approach 1**. The current `ConfigPage` is a local two-column shell without routing children, and it must continue working as both a page and a modal. Extending it with internal tab state is the least invasive path and lets us reuse `ChatSettings`’ overlay style and the `BreweryList` table style. Move `AdminPage` logic into a dedicated feature component under `features/user-management`, delete the `/admin` route and sidebar entry, and gate the `Usuarios` tab visibility/access by role.

### Risks

- Authorization boundary shift: removing the `/admin` `RequireRole` route means the Users tab itself must enforce the `super_admin` role; otherwise non-admins could open the config modal and see or interact with user management.
- `ConfigPage` currently hard-codes `activeTab` to `provider`; introducing tab state changes the component contract and requires updating `ConfigPage.test.tsx`.
- Table styling is feature-specific SCSS; achieving the desired look requires copying/adapting `BreweryList.scss` rather than importing a shared table component.
- The user-creation modal must not break the modal/page responsive behavior already defined in `AppShell.scss`.
- Existing `AdminPage.test.tsx` coverage must be migrated, not lost.

### Ready for Proposal

Yes. The orchestrator can proceed to `sdd-propose` with the recommendation above.
