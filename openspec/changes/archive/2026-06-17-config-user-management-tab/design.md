# Design: Move User Management into Configuration

## Technical Approach

Transform `ConfigPage` into a tabbed shell with local `useState<ConfigTab>` for tab selection. Extract user CRUD logic from `AdminPage` into a new `features/user-management/UserManagement` component following the existing feature pattern (brewery-list, chat-settings). Add a role-gated `Usuarios` tab visible only to `super_admin`. Redirect `/admin` → `/config` and remove the `Administración` sidebar entry. Backend and `adminUserApi` remain unchanged—this is a frontend-only relocation.

## Architecture Decisions

### Decision: Tab state as local `useState`, not URL params

| Option | Tradeoff | Decision |
|--------|----------|----------|
| URL params (`/config?tab=users`) | Deep-linkable but couples tab state to navigation; overkill for 2 tabs | Rejected |
| Local `useState` | No deep-link, but tabs are transient UI, not routes; matches ConfigPage's modal/popup nature | **Chosen** |

**Rationale**: ConfigPage is already an overlay (modal via AppShell sidebar). Tabs represent workspace panels, not navigable destinations. Simpler state avoids route synchronization bugs.

### Decision: Extract `UserManagement` into `features/user-management/`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep logic inline in ConfigPage | Fewer files but bloats a page component with unrelated concerns | Rejected |
| New feature module | Follows established pattern (`breweries/`, `coffee-farms/`); testable in isolation; clean boundaries | **Chosen** |

**Rationale**: The codebase already isolates domain features under `src/features/`. User management is a distinct domain concern. Extraction keeps ConfigPage as a shell and allows independent TDD of the user feature.

### Decision: Inline modal overlay for create-user, not a separate route

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Modal overlay (ChatSettings pattern) | Stays within ConfigPage's content area; consistent visual language with provider editor | **Chosen** |
| Separate route (`/config/users/new`) | Breaks the modal/tab UX; adds unnecessary navigation complexity | Rejected |

**Rationale**: ChatSettings already demonstrates the inline dialog pattern (`role="dialog" aria-modal="true"` with overlay). Following it ensures visual consistency and keeps user creation within the Configuration surface.

## Data Flow

```
ConfigPage (shell)
├─ nav aside (tabs)
│  ├─ Proveedores de modelos (always)
│  └─ Usuarios (super_admin only)
└─ content area
   ├─ ChatSettings (provider tab)
   └─ UserManagement (users tab)
        ├─ Title + Create button
        ├─ Users table ← adminUserApi.listUsers()
        ├─ Create modal (overlay) → adminUserApi.createUser()
        └─ Delete modal → adminUserApi.deleteUser()
             ↕ useAuthStore (role check)
             ↕ adminUserApi (unchanged HTTP calls)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/user-management/UserManagement.tsx` | Create | Extracted user CRUD: form modal, table, delete with `useActionState` |
| `src/features/user-management/UserManagement.scss` | Create | Table + modal styles following `brewery-list` SCSS pattern |
| `src/features/user-management/UserManagement.test.tsx` | Create | Migrated from AdminPage tests + new modal/role tests |
| `src/features/user-management/index.ts` | Create | Barrel export |
| `src/presentation/pages/ConfigPage.tsx` | Modify | Add `useState` activeTab, render UserManagement for users tab, role-gate via `useAuthStore` |
| `src/presentation/pages/ConfigPage.test.tsx` | Modify | Add: tab switching, role-gated Usuarios tab, modal pattern tests |
| `src/presentation/pages/ConfigPage.scss` | Modify | Ensure content area supports modal overlay stacking |
| `src/app/router.tsx` | Modify | Replace `/admin` route with redirect to `/config`; remove AdminPage import |
| `src/presentation/config/navigation.ts` | Modify | Remove `Administración` NavItem |
| `src/presentation/pages/AdminPage.tsx` | Delete | Fully migrated to UserManagement feature |
| `src/presentation/pages/AdminPage.test.tsx` | Delete | Migrated to UserManagement.test.tsx |

## Interfaces / Contracts

```typescript
// New tab constant (in ConfigPage)
const CONFIG_TAB = {
    provider: 'provider',
    users: 'users',
} as const;
type ConfigTab = (typeof CONFIG_TAB)[keyof typeof CONFIG_TAB];

// UserManagement component contract
interface UserManagementProps {
    headingId: string;
}
// Renders: title, create button, table, create modal, delete modal
// Uses adminUserApi (unchanged) and useAuthStore (role for validation)
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | ConfigPage tab rendering, role-gating | vitest + RTL; mock `useAuthStore` with different roles |
| Unit | UserManagement: create form validation, list loading, delete flow | vitest + RTL; mock `adminUserApi`; test modal open/close |
| Integration | `/admin` → `/config` redirect | MemoryRouter with initialEntries |
| Integration | Non-admin ConfigPage excludes Usuarios tab | RTL + mocked super_admin → operativo role switch |
| E2E | Not in scope (no Playwright setup detected) | — |

Tests follow pattern from `AdminPage.test.tsx` (mock `adminUserApi`, `MemoryRouter`, `userEvent`) and `RequireRole.test.tsx` (zustand store state mutation).

## Migration / Rollout

No data migration or feature flags. Single deploy: old `/admin` route redirects, sidebar entry removed, user management surfaces inside Configuration. No backend changes.

## Open Questions

- [ ] Should the create-user modal close automatically on success (like ChatSettings clears the key field), or stay open for batch creation? Spec doesn't specify—default to closing on success.
- [ ] Does the users table need Edit capability in the future? Out of scope for this change; no edit UI planned.
