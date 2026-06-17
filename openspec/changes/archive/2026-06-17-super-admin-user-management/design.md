# Design: Super Admin User Management

## Technical Approach

Backend-owned user provisioning via Supabase `auth.admin` through the existing service-role client (`SupabaseService`). A new FastAPI router exposes guarded CRUD endpoints consumed by a frontend admin module that replaces the current `/admin` placeholder. Public self-registration is stripped entirely: route, UI toggle, store method, and backend endpoint are removed. Nav visibility is fixed by filtering `NavSection` items against the current user's role.

## Architecture Decisions

### Decision: Backend router placement

**Choice**: New `app/routers/admin_users.py` with `APIRouter(prefix='/admin/users', tags=['admin'])`
**Alternatives**: Add to existing `auth.py` (mixes concerns); in-line in `main.py` (no precedent)
**Rationale**: Follows existing pattern — every domain has its own router file. The `/admin/users` prefix scopes CRUD cleanly.

### Decision: Frontend calls backend API

**Choice**: New `src/services/adminUserApi.ts` that calls `fetch('/admin/users', ...)` with auth headers
**Alternatives**: Direct `supabaseClient.auth.admin` calls from frontend — rejected because admin operations must be server-side only (service-role key never leaves backend)
**Rationale**: Follows existing feature pattern (ChatSettings calls backend for provider credentials). Backend is the single authorization point.

### Decision: Nav visibility fix location

**Choice**: Filter in `NavSection.tsx` — check `item.requiredRole` against `useAuthStore().role` before rendering
**Alternatives**: Filter in `NavItem` (adds auth concern to presentational component); filter in `Sidebar` (too far up, loses per-item control)
**Rationale**: `NavSection` already owns the items map; the `requiredRole` field already exists in `NavItem` interface (unused until now). This is a one-line guard per item.

### Decision: Registration removal strategy

**Choice**: Delete all three layers — `/register` route, `LoginPage` register mode, `store.register()`, backend `POST /auth/register`
**Alternatives**: Keep backend endpoint but lock it with `require_role(['super_admin'])` — violates explicit spec requirement that public registration is unavailable, adds confusion
**Rationale**: Proposal explicitly states "Remove public self-registration." Partial removal leaves attack surface and orphaned code.

## Data Flow

```
Browser                        Backend                      Supabase
  │                              │                            │
  │  POST /admin/users           │                            │
  │  {email, password,           │                            │
  │   passwordConfirm, role}     │                            │
  │ ──────────────────────────▶  │  auth.admin.create_user()  │
  │                              │ ─────────────────────────▶ │
  │                              │  ◀───────────────────────── │
  │  ◀────────────────────────── │                            │
  │                              │                            │
  │  GET /admin/users            │  auth.admin.list_users()   │
  │ ──────────────────────────▶  │ ─────────────────────────▶ │
  │  ◀────────────────────────── │  ◀───────────────────────── │

  │  DELETE /admin/users/{id}    │  auth.admin.delete_user()  │
  │ ──────────────────────────▶  │ ─────────────────────────▶ │
  │  ◀────────────────────────── │  ◀───────────────────────── │
```

All requests carry a Supabase JWT (`Authorization: Bearer ...`). `require_role(['super_admin'])` runs before handler logic on every endpoint.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `cortex-backend/app/routers/admin_users.py` | Create | Admin user CRUD router: create, list, delete with RBAC guard |
| `cortex-backend/app/schemas/admin_users.py` | Create | Pydantic schemas: CreateUserRequest, UserResponse, UserListResponse |
| `cortex-backend/app/routers/auth.py` | Modify | Remove `/register` endpoint and import references |
| `cortex-backend/app/main.py` | Modify | Register `admin_users.router` |
| `cortex-frontend/src/services/adminUserApi.ts` | Create | Frontend API client for admin user endpoints |
| `cortex-frontend/src/presentation/pages/AdminPage.tsx` | Create | User management UI: create form + user list + delete action |
| `cortex-frontend/src/app/router.tsx` | Modify | Remove `/register` route; replace `/admin` placeholder with `AdminPage` |
| `cortex-frontend/src/presentation/pages/LoginPage.tsx` | Modify | Remove register mode/toggle; login-only UI |
| `cortex-frontend/src/features/auth/store.ts` | Modify | Remove `register()` method |
| `cortex-frontend/src/presentation/components/molecules/Sidebar/NavSection.tsx` | Modify | Filter items by `requiredRole` vs current user role |
| `cortex-backend/tests/test_auth.py` | Modify | Remove `test_register_*` test cases |
| `cortex-backend/tests/test_admin_users.py` | Create | Backend tests: CRUD endpoints + RBAC guards |
| `cortex-frontend/src/presentation/pages/LoginPage.test.tsx` | Modify | Remove register-mode test cases |
| `cortex-frontend/src/presentation/pages/AdminPage.test.tsx` | Create | Frontend tests: create form, user list render, delete flow |
| `cortex-frontend/src/presentation/components/molecules/Sidebar/NavSection.test.tsx` | Create | Test role-based item filtering |

## Interfaces / Contracts

```python
# schemas/admin_users.py
class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    password_confirm: str
    role: str = "operativo"

class UserResponse(BaseModel):
    id: str
    email: str
    role: str

class UserListResponse(BaseModel):
    users: list[UserResponse]
```

```typescript
// services/adminUserApi.ts
interface CreateUserPayload {
  email: string;
  password: string;
  passwordConfirm: string;
  role: string;
}
interface AdminUser { id: string; email: string; role: string; }

function createUser(payload: CreateUserPayload, token: string): Promise<AdminUser>;
function listUsers(token: string): Promise<AdminUser[]>;
function deleteUser(userId: string, token: string): Promise<void>;
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (frontend) | NavSection role filter, AdminPage form validation | vitest + @testing-library/react; mock store roles |
| Unit (backend) | RBAC dependency, schema validation, password mismatch | pytest; isolated `require_role` and `CreateUserRequest` tests |
| Integration (backend) | Full CRUD endpoints with mocked Supabase admin | pytest + TestClient; mock `supabase.auth.admin.*` |
| E2E | Admin flow: create, list, delete user | playwright; bootstrapped `super_admin` test fixture |
| Regression | Login flow, auth store, RequireRole, NavItem | Existing tests must pass unmodified; remove register-specific cases |

## Migration / Rollout

No data migration required — `auth.users` table is untouched.

**Prerequisite**: First `super_admin` must be bootstrapped via Supabase SQL:
```sql
-- Run in Supabase SQL editor
INSERT INTO auth.users (...) -- or use Supabase Dashboard
UPDATE auth.users SET raw_user_meta_data = '{"role":"super_admin"}' WHERE email = '...';
```

Rollback: revert git commits, restore `/register` route, `LoginPage` toggle, `store.register()`, backend `POST /auth/register`. No DB changes to undo.

## Open Questions

- [ ] Should the user list include pagination in phase 1? (Proposal says "simple user list, no pagination/filtering" — confirmed out of scope)
- [ ] Should deleting your own `super_admin` account be prevented? (Edge case: last admin deletes themselves — acceptable for phase 1)
