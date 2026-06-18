# Design: Sidebar User Menu

## Technical Approach

Render a `SidebarFooter` inside the existing `Sidebar` component below the nav. It reads `useAuthStore` for `user.email` and `role`, shows them in a compact row with the existing `Logout` icon. Logout calls `useAuthStore.getState().logout()` then `navigate('/login')`. Collapsed mode (64px) hides text via existing `.sidebar--collapsed` CSS cascade and keeps only the icon. All new behaviour is TDD-gated per project config (`strict_tdd: true`).

## Architecture Decisions

| Decision | Options considered | Choice | Rationale |
|----------|-------------------|--------|-----------|
| Component location | Separate directory vs co-located under `molecules/Sidebar/` | Co-located as `SidebarFooter.tsx` | Follows existing `NavItem`/`NavSection` pattern; keeps sidebar variants together |
| Logout navigation | Callback prop from AppShell vs self-contained `useNavigate()` | `useNavigate()` in SidebarFooter | No plumbing needed; AppShell already has zero footer awareness |
| Null-user guard | Render placeholder vs render nothing | Render nothing | ProtectedRoute gates all children; null state indicates unauthenticated — no footer needed |
| CSS placement | New `.scss` file vs extend `AppShell.scss` | Extend `AppShell.scss` under existing sidebar block | Sidebar styles co-located in `AppShell.scss` by project convention (lines 80-250) |

## Data Flow

```
useAuthStore ──→ SidebarFooter
  user.email ──→ <span> display
  role ────────→ <span> role badge
                   │
  logout() ────→ clears user/session/role (Zustand)
                   │
  navigate('/login') ──→ LoginPage (unauthenticated route)
```

No new API calls. No new store. No props drilling.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `cortex-frontend/src/presentation/components/molecules/Sidebar/SidebarFooter.tsx` | Create | User card: email + role badge + logout icon button |
| `cortex-frontend/src/presentation/components/molecules/Sidebar/SidebarFooter.test.tsx` | Create | TDD tests: render, logout, collapsed, null-user, long-email |
| `cortex-frontend/src/presentation/components/molecules/Sidebar/Sidebar.tsx` | Modify | Import and render `<SidebarFooter />` below `<nav>` |
| `cortex-frontend/src/presentation/layouts/AppShell.scss` | Modify | Add `.sidebar__footer` block + collapsed hide rules |
| `cortex-frontend/src/presentation/components/molecules/Sidebar/Sidebar.test.tsx` | Modify | Assert footer presence in authenticated render |

## Interfaces / Contracts

```typescript
// SidebarFooter — self-contained, reads store directly
// No props needed; user null → render nothing

interface SidebarFooterState {
  email: string | null;       // from useAuthStore(s => s.user?.email)
  role: string | null;        // from useAuthStore(s => s.role)
  collapsed: boolean;         // from useSidebarStore(s => s.collapsed)
  onLogout: () => void;       // calls logout() + navigate('/login')
}
```

CSS classes introduced (all under `.sidebar` block in `AppShell.scss`):
- `.sidebar__footer` — flex row, border-top divider, padding
- `.sidebar__footer-user-info` — email + role column, `text-overflow: ellipsis`
- `.sidebar__footer-role` — role badge chip (muted, small)
- `.sidebar__footer-logout` — icon button, follows `.sidebar__toggle` hover pattern

## Testing Strategy (TDD)

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Footer renders email + role when `user` exists | Mock `useAuthStore` with user; assert `screen.getByText(email)` and role badge visible |
| Unit | Footer renders nothing when `user` is null | Mock `useAuthStore` with `user: null`; assert no logout button present |
| Unit | Logout clears state and navigates to `/login` | Mock `useNavigate`; click logout; assert `logout()` called + navigate arg is `/login` |
| Unit | Collapsed mode hides text, preserves logout | Mock `useSidebarStore` collapsed=true; assert email/role absent; logout button present with accessible name |
| Unit | Long email truncated with CSS | Render with 80-char email; assert element has `text-overflow: ellipsis` class or inline style |
| Integration | Sidebar renders footer | Render `<Sidebar />` with MemoryRouter + mock auth store; assert footer email and logout in document |

All tests use existing patterns: `vi.mock()` before import, `MemoryRouter` wrapper, `cleanup()` in `beforeEach`, `@testing-library/user-event` for clicks.

## Migration / Rollout

No migration required. No feature flags. SidebarFooter renders unconditionally below the nav; null-user guard ensures no visual change for unauthenticated routes.

## Open Questions

- [ ] Should the logout also call `supabaseClient.auth.signOut()` server-side? Currently deferred (proposal doc limitation), but could be added as a follow-up change.
