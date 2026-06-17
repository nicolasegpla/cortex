# Tasks: config-user-management-tab

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~540 (new + modified, net ~340 after AdminPage deletion) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full implementation | PR 1 | All phases in one PR — frontend-only change, self-contained |

## Phase 1: Foundation — Extract UserManagement Feature

- [x] 1.1 Create `src/features/user-management/` directory and `index.ts` barrel exporting `UserManagement`
- [x] 1.2 Extract `AdminUser` and `CreateUserPayload` types from `src/services/adminUserApi.ts` into `src/features/user-management/types.ts`; keep re-exports in `adminUserApi.ts`
- [x] 1.3 Move `createUserAction`, user list state, delete modal state, and delete logic from `AdminPage.tsx` into a new `src/features/user-management/UserManagement.tsx` — follow `ChatSettings` inline-dialog pattern for create-user modal (role="dialog", aria-modal="true", fixed overlay)
- [x] 1.4 Create `src/features/user-management/UserManagement.scss` following `ChatSettings.scss` modal styling (fixed overlay, centered dialog, border-radius 20px, shadow-card-hover)

## Phase 2: Core Implementation — UserManagement Component

- [x] 2.1 Implement users table in `UserManagement.tsx` using existing database-table visual style from `BreweryList.tsx` (`<table>`, `<thead>`, striped rows, action column with Eliminar button)
- [x] 2.2 Wire `DeleteConfirmationModal` from `@/presentation/components/organisms` for user deletion; reuse existing pattern from `BreweryList.tsx`
- [x] 2.3 Add create-user button in the panel header; open modal on click; close modal on success (form resets) or cancel
- [x] 2.4 Add empty-state message "No hay usuarios registrados" when user list is empty
- [x] 2.5 Add success/error feedback using `success-message` / `error-message` CSS classes (matching `AdminPage.tsx` pattern)

## Phase 3: Integration — ConfigPage Tabs + Routing

- [x] 3.1 In `ConfigPage.tsx`: add `CONFIG_TAB.users = 'users'` to `CONFIG_TAB` union; add `activeTab: ConfigTab = CONFIG_TAB.provider` state via `useState`
- [x] 3.2 In `ConfigPage.tsx`: add conditional `Usuarios` nav item to `navSections` (only rendered when `useAuthStore().role === 'super_admin'`); mark active when `activeTab === CONFIG_TAB.users`
- [x] 3.3 In `ConfigPage.tsx`: add `content` area that renders `ChatSettings` when `activeTab === CONFIG_TAB.provider` and `<UserManagement />` when `activeTab === CONFIG_TAB.users`; update header dynamically based on active tab
- [x] 3.4 In `router.tsx`: change `/admin` route to redirect to `/config` using `<Navigate to="/config" replace />` inside `RequireRole` — remove `AdminPage` import
- [x] 3.5 In `navigation.ts`: remove the `Administración` nav item (lines 78–84) from the Sistema section; keep `Configuración`
- [x] 3.6 (Optional) Add `Usuarios` icon to `src/presentation/components/atoms/Icon/` directory if not already present (reuse `Admin` icon or create a `Users` icon)

## Phase 4: Testing — TDD Unit Tests

- [x] 4.1 RED: Write `UserManagement.test.tsx` — test renders title "Administración de usuarios", create-user button, empty state, user list, delete modal open/close, create user form submit
- [x] 4.2 GREEN: Make `UserManagement.tsx` pass all tests
- [x] 4.3 RED: Write `ConfigPage.test.tsx` tab tests — test tab switching, role-gated Usuarios tab, dynamic header
- [x] 4.4 GREEN: Make `ConfigPage.tsx` pass tab tests
- [x] 4.5 Update `AdminPage.test.tsx` — mark existing tests as `test.skip` or migrate coverage to `UserManagement.test.tsx`; keep file until PR is approved
- [x] 4.6 Test: verify `/admin` redirect by checking router config (no runtime test needed for redirect-only change)

## Phase 5: Cleanup

- [x] 5.1 Remove `src/presentation/pages/AdminPage.tsx` and `AdminPage.test.tsx` after all tests pass and new tests cover the same scenarios
- [x] 5.2 Verify no remaining imports of `AdminPage` in the codebase (run `grep` for `AdminPage`)
- [x] 5.3 Verify all tests pass: `vitest run cortex-frontend/`
