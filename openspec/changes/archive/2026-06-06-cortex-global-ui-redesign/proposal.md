# Proposal: Cortex Global UI Redesign

## Intent

Replace the current `MainLayout` (sticky header + horizontal nav) with a full application shell featuring an expandable sidebar, structured navigation, runtime dark/light theming, and a polished information architecture. The current layout is a placeholder — this redesign establishes the permanent Cortex shell.

## Scope

### In Scope
- **AppShell component**: New root layout with collapsible sidebar, top bar, and content area
- **Sidebar navigation**: Structured sections (Chat, Databases, Sessions, Configuration, Admin) with icons, groups, and active state
- **Runtime theming**: CSS custom properties for dark/light mode with system preference detection and toggle
- **Navigation structure**: Updated router with nested routes matching sidebar sections
- **Design tokens**: SASS variables migrated to CSS custom properties for runtime theme switching
- **Icon system**: Lightweight inline SVG icon set for navigation and UI elements
- **Responsive behavior**: Sidebar collapses to icon-only on smaller viewports, overlay on mobile

### Out of Scope
- Redesigning individual page content (ChatPage, BreweryList internals stay as-is)
- Backend API changes
- Authentication flow changes
- Database or provider adapter changes
- Animation polish beyond basic transitions

## Capabilities

### New Capabilities
- `app-shell`: Root layout with collapsible sidebar, top bar, content area, and responsive breakpoints
- `theme-system`: Runtime dark/light theming via CSS custom properties with toggle and system preference detection
- `navigation-structure`: Sidebar navigation with sections, icons, active states, and route mapping
- `icon-system`: Lightweight inline SVG icon library for UI elements

### Modified Capabilities
- `chat-session`: Chat page now renders inside AppShell content area instead of MainLayout; navigation moves from horizontal header to sidebar

## Approach

1. **CSS custom properties migration**: Replace compile-time SASS theme variables with CSS custom properties on `:root` and `[data-theme="dark"]`. Keep SASS for layout/mixins.
2. **AppShell replaces MainLayout**: New `AppShell` component with sidebar state managed by a dedicated Zustand store (`useSidebarStore`). Top bar contains theme toggle, user menu, and sidebar collapse trigger.
3. **Navigation config as data**: Define routes as a typed config array (path, label, icon, section, required role) — sidebar renders from this single source of truth.
4. **Icons as inline SVG components**: No external icon library. Each icon is a small functional component returning SVG — tree-shakeable, themeable via `currentColor`.
5. **Router restructuring**: Update `router.tsx` to use AppShell as the root layout. Add placeholder routes for future sections (Databases, Sessions, Configuration) that render "Coming Soon" pages.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-frontend/src/presentation/layouts/` | New | Replace `MainLayout` with `AppShell` + sidebar components |
| `cortex-frontend/src/presentation/styles/` | Modified | Add CSS custom properties, theme tokens, remove SASS-only theme |
| `cortex-frontend/src/presentation/components/` | New | Sidebar, NavItem, ThemeToggle, Icon components |
| `cortex-frontend/src/app/router.tsx` | Modified | Root layout swap, new section routes |
| `cortex-frontend/src/store/` | New | `useSidebarStore` for collapse state and active section |
| `cortex-frontend/src/presentation/pages/` | New | Placeholder pages for Databases, Sessions, Configuration |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CSS custom properties break existing component styles | Medium | Audit all SASS variable usages before migration; keep fallback values |
| Sidebar state persists incorrectly across sessions | Low | Default to expanded on first load; persist preference in localStorage |
| Router changes break existing auth guards | Low | Keep ProtectedRoute/RequireRole wrappers unchanged; only swap layout |
| Snapshot tests fail on layout changes | High | Expected — update snapshots as part of each slice |

## Rollback Plan

1. Revert the feature branch to `main` — all changes are in `cortex-frontend/src/presentation/` and `cortex-frontend/src/app/router.tsx`
2. Restore `MainLayout` as root layout in `router.tsx`
3. No database or backend changes to roll back
4. Each delivery slice is independently revertible via git

## Dependencies

- None — pure frontend restructuring
- Requires icon SVG assets (will be created inline, no external dependency)

## Success Criteria

- [ ] AppShell renders with collapsible sidebar on all authenticated routes
- [ ] Dark/light theme toggle switches all UI colors at runtime without reload
- [ ] Sidebar navigation reflects route structure with correct active states
- [ ] All existing pages (Chat, Browse, Breweries, Admin) render inside new shell without functional regressions
- [ ] Sidebar collapses to icon-only at tablet breakpoint, overlays on mobile
- [ ] All existing tests pass (snapshot updates expected)
