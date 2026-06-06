# Tasks: Cortex Global UI Redesign

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1500–2000 (new + modified + deleted) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (Core Shell) |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Theme system + stores + CSS tokens + icons | PR 1 → main | Base: main. Self-contained; no layout dependency. |
| 2 | AppShell + Sidebar + NavItem + navigation config + router swap + placeholder pages | PR 2 → main | Base: main. Depends on PR 1 (tokens, icons, stores). |

## Phase 1: Foundation — Theme System, Stores, CSS Tokens, Icons

- [ ] 1.1 Create `src/presentation/styles/_tokens.scss` — CSS custom properties `--color-*`, `--space-*`, `--radius-*`, `--shadow-*` with light defaults and `[data-theme="dark"]` overrides
- [ ] 1.2 Create `src/store/useThemeStore.ts` — Zustand store: `theme` ('light'|'dark'|'system'), `resolved`, `setTheme`, `toggleTheme`; syncs `data-theme` on `<html>`
- [ ] 1.3 Create `src/store/useSidebarStore.ts` — Zustand store: `collapsed`, `toggle`, `setCollapsed`; localStorage persist via middleware
- [ ] 1.4 Create `src/presentation/components/atoms/Icon/Chat.tsx` — inline SVG, `currentColor`
- [ ] 1.5 Create `src/presentation/components/atoms/Icon/Database.tsx` — inline SVG, `currentColor`
- [ ] 1.6 Create `src/presentation/components/atoms/Icon/Sessions.tsx` — inline SVG, `currentColor`
- [ ] 1.7 Create `src/presentation/components/atoms/Icon/Config.tsx` — inline SVG, `currentColor`
- [ ] 1.8 Create `src/presentation/components/atoms/Icon/Admin.tsx` — inline SVG, `currentColor`
- [ ] 1.9 Create `src/presentation/components/atoms/Icon/ChevronLeft.tsx` — inline SVG, `currentColor`
- [ ] 1.10 Create `src/presentation/components/atoms/Icon/Menu.tsx` — inline SVG, `currentColor`
- [ ] 1.11 Create `src/presentation/components/atoms/Icon/X.tsx` — inline SVG, `currentColor`
- [ ] 1.12 Create `src/presentation/components/atoms/Icon/Sun.tsx` — inline SVG, `currentColor`
- [ ] 1.13 Create `src/presentation/components/atoms/Icon/Moon.tsx` — inline SVG, `currentColor`
- [ ] 1.14 Create `src/presentation/components/atoms/Icon/Logout.tsx` — inline SVG, `currentColor`
- [ ] 1.15 Create `src/presentation/components/atoms/ThemeToggle/ThemeToggle.tsx` — button reading system preference on mount, toggling `data-theme`
- [ ] 1.16 Write unit tests for `useThemeStore` — verify state transitions, `data-theme` sync, localStorage persist
- [ ] 1.17 Write unit tests for `useSidebarStore` — verify `collapsed`, `toggle`, `setCollapsed`, localStorage persist
- [ ] 1.18 Write unit tests for `ThemeToggle` — verify button renders, click sets `data-theme`

## Phase 2: Core Shell — AppShell, Sidebar, Navigation Config, Router

- [ ] 2.1 Create `src/presentation/config/navigation.ts` — typed `NavSection[]` config with `NavItem[]` (label, to, icon, end, requiredRole)
- [ ] 2.2 Create `src/presentation/components/molecules/Sidebar/NavItem.tsx` — `<NavLink>` with icon, label, active state class
- [ ] 2.3 Create `src/presentation/components/molecules/Sidebar/Sidebar.tsx` — renders `NavSection[]` groups, collapses based on `useSidebarStore`
- [ ] 2.4 Create `src/presentation/layouts/AppShell.tsx` — root layout: sidebar + top bar + `<Outlet />`; wires `ThemeToggle` and `SidebarToggle`
- [ ] 2.5 Create `src/presentation/layouts/AppShell.scss` — grid layout, responsive breakpoints, sidebar transition animations
- [ ] 2.6 Modify `src/app/router.tsx` — swap `MainLayout` → `AppShell`; add `/databases`, `/sessions`, `/config` routes
- [ ] 2.7 Modify `src/presentation/styles/_variables.scss` — convert to `var()` references or remove (values migrated to `_tokens.scss`)
- [ ] 2.8 Modify `src/presentation/styles/_base.scss` — replace `$color-*` SASS refs with `var(--color-*)`
- [ ] 2.9 Modify `src/presentation/styles/index.scss` — forward `_tokens.scss`
- [ ] 2.10 Create `src/presentation/pages/DatabasesPage.tsx` — placeholder "Coming Soon" page
- [ ] 2.11 Create `src/presentation/pages/SessionsPage.tsx` — placeholder "Coming Soon" page
- [ ] 2.12 Create `src/presentation/pages/ConfigPage.tsx` — placeholder "Coming Soon" page
- [ ] 2.13 Write integration tests for `AppShell` with `MemoryRouter` — verify sidebar renders nav from config, active state follows URL
- [ ] 2.14 Write integration tests for theme system — verify CSS custom properties resolve on `[data-theme="dark"]`
- [ ] 2.15 Delete `src/presentation/layouts/MainLayout.tsx`
- [ ] 2.16 Delete `src/presentation/layouts/main-layout.scss`
- [ ] 2.17 Update snapshots for all existing pages inside `AppShell` — structural layout change is expected

## Phase 3: TDD Red/Green — Sidebar Behavior

- [ ] 3.1 RED: write failing test — `Sidebar` shows active state on current route
- [ ] 3.2 GREEN: implement active state detection in `Sidebar.tsx` via `useLocation()`
- [ ] 3.3 RED: write failing test — `Sidebar` collapses/expands on toggle
- [ ] 3.4 GREEN: wire `useSidebarStore` into `Sidebar.tsx` toggle
- [ ] 3.5 REFACTOR: extract `NavSection` rendering to clean component

## Phase 4: TDD Red/Green — Theme Toggle

- [ ] 4.1 RED: write failing test — `ThemeToggle` reads system preference on mount when `theme === 'system'`
- [ ] 4.2 GREEN: implement system preference detection in `useThemeStore` init (matchMedia)
- [ ] 4.3 RED: write failing test — `ThemeToggle` persists choice to localStorage
- [ ] 4.4 GREEN: add localStorage sync to `useThemeStore`

## Phase 5: Verification

- [ ] 5.1 Run full test suite — all unit, integration, and e2e tests pass
- [ ] 5.2 Manual smoke test — load app, verify shell renders, theme toggle works, navigation routes correctly
- [ ] 5.3 Verify `MainLayout` is fully removed — no import references remain in codebase
