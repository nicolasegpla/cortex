# Proposal: Move User Management into Configuration

## Intent

Consolidate all administrative surface area under Configuration by eliminating the standalone `/admin` route and relocating user management into a new `Usuarios` tab within the existing Configuration shell. Removes navigation fragmentation and the confusing dual-admin pattern (Configuración + Administración).

## Scope

### In Scope
- Add `Usuarios` tab to `ConfigPage` alongside existing `Proveedores de modelos`
- Extract `AdminPage` logic into `features/user-management/UserManagement` component
- Create `UserCreateModal` styled after `ChatSettings` editor overlay
- Style users table following `BreweryList` database-table visual pattern
- Remove `/admin` route from router
- Remove `Administración` sidebar navigation entry
- Gate `Usuarios` tab visibility by `super_admin` role (authorization moves from route to tab)
- Migrate `AdminPage.test.tsx` coverage to new component tests

### Out of Scope
- Backend API changes (endpoints remain unchanged)
- New user management features (bulk operations, search, pagination beyond current)
- Reusable table molecule extraction (copy/adapt pattern, not abstract yet)
- Role/permission system changes

## Capabilities

### New Capabilities
- `configuration-tabs`: Tab navigation shell within ConfigPage supporting multiple panels with active state management
- `user-management-ui`: User list table, create-user modal, and delete confirmation rendered inside Configuration

### Modified Capabilities
- `admin-user-management`: Authorization boundary shifts from route-level `RequireRole` to tab-level visibility gating; UI location changes from standalone page to Configuration tab. Core requirements (provisioning, listing, deletion, super-admin restriction) remain unchanged.

## Approach

Extend `ConfigPage` with local tab state (Approach 1 from exploration). Create `UserManagement` feature component that reuses `adminUserApi` data layer. Create `UserCreateModal` mirroring `ChatSettings` overlay pattern. Delete `AdminPage`, its route, and sidebar entry. Role gating implemented at tab-render level, not route level.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-frontend/src/presentation/pages/ConfigPage.tsx` | Modified | Add tab state, render Usuarios panel |
| `cortex-frontend/src/presentation/pages/ConfigPage.scss` | Modified | Active/inactive nav item styles |
| `cortex-frontend/src/presentation/pages/AdminPage.tsx` | Removed | Deleted — logic extracted |
| `cortex-frontend/src/presentation/pages/AdminPage.test.tsx` | Removed | Tests migrated |
| `cortex-frontend/src/features/user-management/UserManagement.tsx` | New | Extracted user list + actions |
| `cortex-frontend/src/features/user-management/UserCreateModal.tsx` | New | Create-user modal |
| `cortex-frontend/src/features/user-management/UserManagement.scss` | New | Database-table styling |
| `cortex-frontend/src/app/router.tsx` | Modified | Remove `/admin` route |
| `cortex-frontend/src/presentation/config/navigation.ts` | Modified | Remove Administración entry |
| `cortex-frontend/src/features/auth/RequireRole.tsx` | Modified | Role check moves to tab level |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Non-admin users access Usuarios tab | Low | Role check at render time, not just navigation |
| ConfigPage test breakage from tab state | Medium | Update tests alongside implementation |
| Modal responsive behavior in AppShell | Low | Reuse ChatSettings overlay CSS patterns |
| Lost test coverage during migration | Medium | Migrate tests before deleting AdminPage |

## Rollback Plan

1. Revert git commit restoring `AdminPage.tsx`, route entry, and sidebar navigation
2. Revert `ConfigPage` changes to single-tab state
3. Remove new `features/user-management/` directory
4. No database or backend changes required — pure frontend relocation

## Dependencies

- None — pure frontend restructuring, existing API surface unchanged

## Success Criteria

- [ ] `/admin` route returns 404 or redirects to `/config`
- [ ] Configuration displays two tabs: Proveedores de modelos and Usuarios
- [ ] Usuarios tab visible only to `super_admin` role
- [ ] Users table renders with database-table visual style
- [ ] Create user opens modal styled like API key editor
- [ ] All existing AdminPage tests pass on new components
- [ ] Non-admin users cannot access user management via direct URL or navigation
