## Exploration: Super Admin User Management

### Current State

Cortex already has a working Supabase Auth + RBAC foundation (commit `41becd1`), but it is configured for **open self-registration** and lacks any admin-managed user provisioning.

**Frontend auth flow**
- `src/app/router.tsx` exposes `/login` and `/register`, both rendering `LoginPage`.
- `src/presentation/pages/LoginPage.tsx` toggles between login and register modes.
- In register mode, the page calls `supabaseClient.auth.signUp({ email, password, options: { data: { role: 'operativo' } } })` **directly from the browser**.
- The form collects only email and password. There is **no password confirmation field** and **no role/user-type selector**.
- `src/features/auth/store.ts` persists the session in Zustand and defaults every new user to `role = 'operativo'`.

**Backend auth flow**
- `cortex-backend/app/routers/auth.py` implements `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, and `POST /auth/logout`.
- `POST /auth/register` uses `supabase.auth.admin.create_user(...)` with a **hardcoded** `"role": "operativo"` and is never invoked by the frontend.
- `cortex-backend/app/schemas/auth.py` defines `RegisterRequest` with `email`, `password`, and `full_name`, but `auth.py` ignores `full_name`.
- There are **no endpoints** for listing users, deleting users, or creating a user with a selectable role.

**Role model**
- Roles are stored in Supabase Auth `user_metadata.role`.
- Two roles are used in code/tests: `operativo` (default) and `super_admin`.
- Backend enforcement: `app/core/security.py` provides `require_role(allowed_roles)` and `get_current_user`.
- Frontend enforcement: `src/features/auth/RequireRole.tsx` blocks routes when the role is missing.
- RLS policies (e.g., `cortex-backend/sql/001_add_roles.sql`) reference `auth.jwt() -> 'user_metadata' ->> 'role'`.

**Configuration / Admin surface**
- `src/presentation/pages/ConfigPage.tsx` exists at `/config` and as a modal. It currently hardcodes a single tab (`CONFIG_TAB.provider`) and renders `ChatSettings`.
- `src/presentation/config/navigation.ts` defines an `Administración` link to `/admin` with `requiredRole: 'super_admin'`.
- `src/presentation/components/molecules/Sidebar/NavItem.tsx` does **not** consume `requiredRole`; the admin link is always visible regardless of the current user's role.
- `src/app/router.tsx` guards `/admin` with `<RequireRole allowedRoles={['super_admin']}>` but the page content is only a placeholder `<div>Panel de administración</div>`.

### Affected Areas

- `cortex-frontend/src/app/router.tsx` — exposes `/register` and the placeholder `/admin` route.
- `cortex-frontend/src/presentation/pages/LoginPage.tsx` — public self-registration UI with missing confirmation and role fields.
- `cortex-frontend/src/features/auth/store.ts` — `register()` always passes `operativo` and talks directly to Supabase.
- `cortex-frontend/src/presentation/pages/ConfigPage.tsx` — intended home for admin user management; currently single-tab provider config only.
- `cortex-frontend/src/presentation/config/navigation.ts` and `NavItem.tsx` — admin nav link is not filtered by role.
- `cortex-backend/app/routers/auth.py` — register endpoint exists but hardcodes role; no list/delete user endpoints.
- `cortex-backend/app/schemas/auth.py` — `RegisterRequest` has an unused `full_name` field.
- `cortex-backend/app/core/security.py` and `dependencies.py` — RBAC enforcement already in place.
- `cortex-backend/app/services/supabase_service.py` — service-role client exists; admin user management can reuse it.
- `cortex-backend/sql/001_add_roles.sql` — role helper function exists; user-management RLS/policy work may be needed on `auth.users`.

### Approaches

1. **Backend-owned user provisioning + remove public register**
   - Remove `/register` route and register toggle from `LoginPage`.
   - Expose `POST /admin/users`, `GET /admin/users`, and `DELETE /admin/users/{id}` protected by `require_role(['super_admin'])`.
   - Frontend admin module calls these endpoints via `api/client.ts`.
   - Add a "Users" tab to `ConfigPage` (or keep it on `/admin`) with create/delete UI.
   - Pros: centralizes security logic, prevents public sign-up, Supabase service key stays server-side, consistent with existing FastAPI RBAC patterns.
   - Cons: requires new backend tests, new frontend tests, and UX decisions for the first super-admin bootstrap.
   - Effort: Medium

2. **Restrict Supabase direct sign-up + build admin UI on top of Supabase client**
   - Disable the public register toggle but still use the Supabase JS client from the frontend for admin create/delete (e.g., `supabase.auth.admin.createUser`).
   - Pros: less backend work; reuses existing `useAuthStore.register()` shape.
   - Cons: exposes service-role operations to the browser (requires anon-key client to have admin rights or a separate admin key in the frontend), bypasses backend audit/validation, and conflicts with the current architecture where backend owns auth endpoints.
   - Effort: Low-Medium (but insecure and not recommended)

3. **Keep register path but gate it behind an invitation/bootstrap token**
   - `/register` remains for the very first super admin (bootstrap), then closes to public.
   - Pros: gives a self-service first-setup experience.
   - Cons: adds complexity around token lifecycle and does not solve the daily user-creation UX requested for the Configuration view.
   - Effort: Medium-High

### Recommendation

**Approach 1** is the right fit for the stated product direction:
- It removes the public attack surface completely.
- It reuses the existing `require_role` / `RequireRole` machinery.
- It keeps Supabase service-role credentials server-side.
- It aligns with the existing pattern where backend routers own entity CRUD.

The first super-admin bootstrap still needs a product decision (see Risks).

### Risks

- **First super-admin creation**: There is currently no bootstrap flow. Someone must run `SELECT public.set_user_role('uuid', 'super_admin')` in Supabase SQL, or the product must define a bootstrap token/seed user. This is product-sensitive and blocks implementation.
- **auth.users access**: Listing/deleting users touches the Supabase `auth.users` table. The backend can do this via `supabase.auth.admin.list_users()` / `delete_user()`, but RLS/policies and audit logging need design.
- **Email confirmation behavior**: Supabase may require email confirmation. The admin create flow must decide whether to auto-confirm, send invites, or require password setup.
- **Frontend/backend mismatch**: The frontend currently ignores the backend `POST /auth/register` endpoint. Any admin create flow should not accidentally reactivate the unused endpoint without updating its contract.
- **Navigation role filtering**: `NavItem` ignores `requiredRole`, so the admin link leaks in the sidebar for non-admin users until that is fixed.
- **Existing tests**: The `LoginPage.test.tsx` and `useAuthStore.test.ts` tests explicitly cover the public register flow. Removing or restricting registration will require test updates.

### Ready for Proposal

**Yes — with one product-sensitive item to resolve.**

What is clear:
- Public self-registration exists and must be removed.
- Backend RBAC and role enforcement are already in place.
- `ConfigPage` (or `/admin`) is a reasonable home for user management.
- The implementation path is backend-owned CRUD guarded by `super_admin`.

What remains product-sensitive:
- How is the **first super admin** created? (manual SQL seed, bootstrap token, environment config, etc.)
- Should new users receive **email invitations**, or does the admin set a password?
- Should the user-management UI live inside the existing **Configuration modal/page**, or on the existing `/admin` route?

The orchestrator should ask the user to decide the bootstrap strategy before moving to `sdd-propose`.
