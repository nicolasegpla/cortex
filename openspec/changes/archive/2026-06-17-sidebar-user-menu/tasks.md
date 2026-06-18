# Tasks: sidebar-user-menu — Add User Menu to Sidebar Footer

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150–200 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | not-needed |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: not-needed
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full feature | PR 1 | SidebarFooter + tests + integration + styles |

## Phase 1: Test-First Foundation (TDD)

- [x] 1.1 Create `SidebarFooter.test.tsx` — RED tests: renders email+role when user present; renders nothing when user is null; logout calls logout() + navigate('/login'); collapsed mode hides text but keeps logout icon with aria-label; long email truncated with ellipsis

## Phase 2: Core Implementation

- [x] 2.1 Create `SidebarFooter.tsx` — reads useAuthStore (email, role) and useSidebarStore (collapsed); renders email span, role badge chip, Logout icon button; onLogout: calls logout() then navigate('/login'); null user → return null
- [x] 2.2 Add `.sidebar__footer` styles to `AppShell.scss` — flex row, border-top divider, padding; `.sidebar__footer-user-info` column with text-overflow ellipsis; `.sidebar__footer-role` muted small chip; `.sidebar__footer-logout` icon button matching `.sidebar__toggle` hover pattern; collapsed hides `.sidebar__footer-user-info` via existing cascade

## Phase 3: Integration

- [x] 3.1 Modify `Sidebar.tsx` — import `SidebarFooter` and render below `<nav className="sidebar__nav">` inside the `<aside>` element
- [x] 3.2 Modify `Sidebar.test.tsx` — add test: render `<Sidebar>` with mocked auth store, assert footer element and logout button are in document

## Phase 4: Verification

- [x] 4.1 Run `pnpm test` — all SidebarFooter and Sidebar tests pass (TDD gate: must be green before commit)
- [x] 4.2 Run `pnpm test:coverage` — confirm SidebarFooter has coverage report

## File Inventory

| File | Action |
|------|--------|
| `cortex-frontend/src/presentation/components/molecules/Sidebar/SidebarFooter.tsx` | Create |
| `cortex-frontend/src/presentation/components/molecules/Sidebar/SidebarFooter.test.tsx` | Create |
| `cortex-frontend/src/presentation/components/molecules/Sidebar/Sidebar.tsx` | Modify |
| `cortex-frontend/src/presentation/layouts/AppShell.scss` | Modify |
| `cortex-frontend/src/presentation/components/molecules/Sidebar/Sidebar.test.tsx` | Modify |

## Dependencies

- `Logout` icon already exists at `@/presentation/components/atoms/Icon/Logout`
- `useAuthStore` already has `user`, `session`, `role`, `logout()`
- `useSidebarStore` already has `collapsed`
- Project uses strict TDD (vitest + @testing-library/react)
