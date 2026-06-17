# Proposal: Super Admin User Management

## Intent

Remove public self-registration and replace it with admin-only user provisioning. Currently any visitor can create an account via `/register` with a hardcoded `operativo` role — no password confirmation, no role selection, and no admin oversight. This change closes that attack surface and gives `super_admin` users full control over who gets access to Cortex.

## Scope

### In Scope
- Remove public `/register` route and register toggle from `LoginPage`
- Backend admin endpoints: `POST /admin/users`, `GET /admin/users`, `DELETE /admin/users/{id}` — all guarded by `require_role(['super_admin'])`
- Frontend user management UI: create/delete users with email, password, password confirmation, and role selector
- Fix `NavItem` to respect `requiredRole` so admin nav link hides from non-admin users
- Update existing tests that cover the removed public registration flow

### Out of Scope
- Email invitation / password-reset flows (deferred)
- User editing / role changes after creation (deferred)
- Audit logging for user management actions (deferred)
- Bulk user import/export (deferred)

## Capabilities

### New Capabilities
- `admin-user-management`: Super admin CRUD for platform users — create (with role selection), list, and delete. Server-side only via service-role client.

### Modified Capabilities
- None — no existing specs cover authentication or registration. The public register removal is a net-new behavioral constraint, not a spec delta.

## Approach

Backend-owned user provisioning (Approach 1 from exploration):
- Supabase `auth.admin` operations stay server-side via the existing `supabase_service.py` service-role client
- New FastAPI router `app/routers/admin_users.py` with RBAC guards
- Frontend admin module calls backend API (not Supabase JS client directly)
- User management UI lives on the existing `/admin` route (already guarded by `RequireRole`)
- First `super_admin` bootstrapped manually via Supabase SQL — one-time operation

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-frontend/src/app/router.tsx` | Modified | Remove `/register` route |
| `cortex-frontend/src/presentation/pages/LoginPage.tsx` | Modified | Remove register toggle/mode |
| `cortex-frontend/src/features/auth/store.ts` | Modified | Remove or restrict `register()` method |
| `cortex-backend/app/routers/admin_users.py` | New | Admin user CRUD router |
| `cortex-backend/app/schemas/admin_users.py` | New | Request/response schemas |
| `cortex-frontend/src/presentation/pages/AdminPage.tsx` | New | User management UI |
| `cortex-frontend/src/presentation/components/molecules/Sidebar/NavItem.tsx` | Modified | Filter nav items by `requiredRole` |
| `cortex-frontend/src/features/auth/RequireRole.tsx` | No change | Already guards `/admin` route |
| Existing auth tests | Modified | Remove public registration test cases |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| No super_admin exists to test admin UI | High | Manual SQL bootstrap documented as prerequisite; seed script for dev environments |
| Supabase `auth.admin.list_users` pagination limits | Medium | Implement pagination in backend; handle large user counts gracefully |
| Email confirmation blocks admin-created users | Medium | Use `email_confirm: false` in admin create; admin sets password directly |
| NavItem role filtering breaks existing nav | Low | Add fallback: show all items when `requiredRole` is undefined |

## Rollback Plan

1. Revert the git commit(s) that remove `/register` and add admin endpoints
2. Restore the register toggle in `LoginPage.tsx` and `store.ts`
3. Delete `admin_users.py` router and schemas
4. Revert `NavItem.tsx` role filtering change
5. No database migration to undo — `auth.users` is untouched by this change

## Dependencies

- Supabase project with `auth.users` table and existing role infrastructure (`001_add_roles.sql`)
- First `super_admin` user must exist before admin UI can be accessed
- Existing `require_role` / `RequireRole` RBAC middleware (already in place)

## Success Criteria

- [ ] `/register` route no longer accessible; `LoginPage` shows login only
- [ ] `super_admin` can create a user with email, password, password confirmation, and role
- [ ] `super_admin` can list all platform users
- [ ] `super_admin` can delete a user
- [ ] Non-admin users cannot see or access the admin user management UI
- [ ] All existing auth tests pass (with register tests removed or updated)
- [ ] New admin user management tests cover create, list, delete, and RBAC guards
