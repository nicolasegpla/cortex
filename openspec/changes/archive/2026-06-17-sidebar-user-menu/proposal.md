# Proposal: Sidebar User Menu

## Intent

Provide a persistent user identity and logout action in the sidebar's bottom-left area. Currently the app has no user-triggered logout UI and users see no indication of who they are logged in as.

## Scope

### In Scope
- `SidebarFooter` component at the bottom of the sidebar showing user email and role
- Logout button that clears local auth state and navigates to `/login`
- Collapsed-mode support: icon-only logout at 64px sidebar width
- Visual consistency with existing sidebar tokens and nav-item styling
- Test coverage for expanded, collapsed, and logout scenarios

### Out of Scope
- Real name display (no `name` field in current auth store)
- Popover or expandable menu patterns
- Server-side Supabase session invalidation (deferred — current `logout()` only clears Zustand state)
- Profile editing or avatar support

## Capabilities

### New Capabilities
- `sidebar-user-menu`: Mini user card in sidebar footer with email, role badge, and logout action

### Modified Capabilities
- None

## Approach

Add a `SidebarFooter` sub-component inside `Sidebar` that reads `useAuthStore` for `user.email` and `role`. Render a compact flex row: left side shows email + role badge, right side shows a logout icon button. Use existing design tokens (`--color-surface-card`, `--color-text-muted`, `--space-md`) and the existing `Logout` icon atom. In collapsed mode (64px), hide text and show only the logout icon.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-frontend/src/presentation/components/molecules/Sidebar/Sidebar.tsx` | Modified | Add `SidebarFooter` rendering |
| `cortex-frontend/src/presentation/components/molecules/Sidebar/SidebarFooter.tsx` | New | User card component |
| `cortex-frontend/src/presentation/layouts/AppShell.scss` | Modified | Footer area styles + collapsed rules |
| `cortex-frontend/src/presentation/components/molecules/Sidebar/Sidebar.test.tsx` | Modified | Assertions for user info, logout, collapsed state |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Incomplete logout (Supabase session persists) | High | Document as known limitation; future enhancement to call `supabase.auth.signOut()` |
| Collapsed mode layout overflow | Low | Test at 64px width; hide text via CSS |
| Email too long for sidebar width | Medium | Truncate with CSS `text-overflow: ellipsis` |

## Rollback Plan

Revert the commit introducing `SidebarFooter` and its styles. No data migration or backend changes involved.

## Dependencies

- None (uses existing auth store, tokens, and icon components)

## Success Criteria

- [ ] User email and role visible in sidebar footer at all times
- [ ] Logout button clears auth state and redirects to `/login`
- [ ] Footer collapses to icon-only at 64px sidebar width
- [ ] All new behavior covered by tests
