# Tasks: Super Admin User Management

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 450–550 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full feature | PR 1 | All phases; backend schemas + router + frontend pages + tests |

## Phase 1: Backend Foundation

- [x] 1.1 Create `cortex-backend/app/schemas/admin_users.py` with `CreateUserRequest` (email, password, password_confirm, role), `UserResponse`, `UserListResponse` — Pydantic BaseModel per design interfaces
- [x] 1.2 Create `cortex-backend/app/routers/admin_users.py` with `require_role(['super_admin'])` guard; implement `POST /admin/users` (create), `GET /admin/users` (list), `DELETE /admin/users/{user_id}` (delete) using `SupabaseService` auth admin methods
- [x] 1.3 Register `admin_users.router` in `cortex-backend/app/main.py` under `app.include_router()`
- [x] 1.4 Remove `POST /auth/register` endpoint from `cortex-backend/app/routers/auth.py` and delete its import/reference

## Phase 2: Frontend Foundation

- [x] 2.1 Create `cortex-frontend/src/services/adminUserApi.ts` with `createUser`, `listUsers`, `deleteUser` functions calling `fetch('/admin/users', ...)` with auth headers — typed per design interfaces
- [x] 2.2 Create `cortex-frontend/src/presentation/pages/AdminPage.tsx` — React 19 Server Component shell + `"use client"` create-form and user-list components; use `useActionState` for form submission; render `AdminUser[]` list with delete buttons

## Phase 3: Frontend Integration

- [x] 3.1 Remove `/register` route from `cortex-frontend/src/app/router.tsx`; replace `/admin` placeholder with `AdminPage`
- [x] 3.2 Strip register mode/toggle from `cortex-frontend/src/presentation/pages/LoginPage.tsx` — login-only UI; remove any registration-related state or form branch
- [x] 3.3 Remove `register()` method from `cortex-frontend/src/features/auth/store.ts`
- [x] 3.4 Add `requiredRole?: string` to `NavItem` interface in `NavSection.tsx`; filter items where `requiredRole && userRole !== requiredRole` before rendering

## Phase 4: Testing

- [x] 4.1 RED: write `cortex-backend/tests/test_admin_users.py` — failing tests for `POST /admin/users` (success + password mismatch), `GET /admin/users` (auth list), `DELETE /admin/users/{id}`, and RBAC rejection for non-super_admin
- [x] 4.2 GREEN: make tests pass — implement handler logic in `admin_users.py`
- [x] 4.3 GREEN: add backend test for password confirmation mismatch path (`assert form.errors`)
- [x] 4.4 Remove `test_register_*` cases from `cortex-backend/tests/test_auth.py`
- [x] 4.5 RED: write `cortex-frontend/src/presentation/pages/AdminPage.test.tsx` — test create form validation, user list render, delete confirmation; mock `adminUserApi`
- [x] 4.6 GREEN: make `AdminPage.test.tsx` pass
- [x] 4.7 RED: write `cortex-frontend/src/presentation/components/molecules/Sidebar/NavSection.test.tsx` — test `requiredRole` filtering with mock store role
- [x] 4.8 GREEN: make `NavSection.test.tsx` pass
- [x] 4.9 Remove register-mode test cases from `cortex-frontend/src/presentation/pages/LoginPage.test.tsx`

## Phase 5: Cleanup

- [x] 5.1 Verify `git diff` shows only intended changes — no orphaned register references in routes, stores, or templates
- [x] 5.2 Confirm all `import` statements in modified files are correct (no broken imports after removing `register` from store)

## Phase 6: Pre-merge Blockers

- [x] 6.1 Fix `supabase.auth.admin.list_users()` runtime contract: real client returns a plain list, not an object with `.users`. Updated `admin_users.py` helpers and `test_admin_users.py` mocks to use the real return shape.
- [x] 6.2 Strengthen last-`super_admin` delete protection against concurrent deletes by wrapping the list-check-delete sequence in a backend `threading.Lock`; added a concurrency regression test verifying two simultaneous deletes of the last two super_admins cannot both succeed.
