## Exploration: cortex-global-ui-redesign

### Current State

Cortex is a React 19 + Vite + TypeScript + SASS application using Zustand for state and React Router 7 for navigation. The current UI is a **simple single-header layout** with a sticky top bar containing the CORTEX branding, horizontal navigation (Chat, Browse, Breweries), and a user section. Content renders in a centered container (max 1120px). There is **no sidebar**, **no dark mode**, and **no theme system**.

**Key architectural facts:**
- Styling uses SASS with BEM naming (`block__element--modifier`). Variables and mixins are in `presentation/styles/`.
- SASS variables are **compile-time only** — runtime theme switching (dark/light) is impossible without moving to CSS custom properties or a CSS-in-JS solution.
- Atomic Design folder structure exists (`atoms/`, `molecules/`, `organisms/`, `templates/`) but only `atoms/` has real components (Button, Input). The rest export empty objects.
- The `MainLayout` component wraps all routes and provides the shell. All authenticated pages render inside it via `<Outlet />`.
- Routing: `/` (Chat), `/browse` (Dashboard placeholder), `/breweries`, `/breweries/new`, `/admin`, `/login`, `/register`.
- ChatPage is the most complex feature. DashboardPage and Admin are placeholders. BreweryList has a large data table.
- No icon system is in place. No design token runtime system.
- Tests use Vitest + Testing Library, mocking Zustand stores heavily.

### Affected Areas

| File/Path | Why Affected |
|-----------|-------------|
| `src/presentation/layouts/MainLayout.tsx` | Complete rewrite to support sidebar + top bar + workspace |
| `src/presentation/layouts/main-layout.scss` | New shell layout styles (flex with sidebar, collapsible states) |
| `src/presentation/styles/_variables.scss` | Must add dark theme tokens or migrate to CSS custom properties |
| `src/presentation/styles/_base.scss` | Theme-aware base styles, dark mode body/html backgrounds |
| `src/presentation/styles/_mixins.scss` | New mixins for theme-aware colors, sidebar transitions |
| `src/app/router.tsx` | Likely new routes (Settings, Sessions, Databases); may need layout route changes |
| `src/presentation/components/` | Molecules and organisms will need real components: Sidebar, NavItem, ThemeToggle, UserMenu |
| `src/presentation/pages/` | All pages may need style adjustments for new workspace container |
| `src/features/chat/ChatPage.tsx` | Will be the primary workspace content; may need layout tweaks |
| `src/features/breweries/BreweryList.tsx` | Large table needs to work in new workspace (horizontal scroll, full-width) |
| `index.html` | May need `data-theme` attribute or class on `<html>` |
| `src/main.tsx` | May need theme initialization before render |

### Approaches

#### 1. CSS Custom Properties Theme System + New AppShell
**Description**: Migrate SASS color/spacing variables to CSS custom properties in `:root` and `[data-theme="dark"]`. Build a new `AppShell` layout with collapsible sidebar, top bar, and workspace area.

- **Pros**:
  - Runtime theme switching with zero JS overhead after toggle
  - Clean separation: SASS handles structure, CSS vars handle theme
  - Easy to extend with more themes later
  - All components automatically theme-aware if they use the CSS vars
  - Sidebar state can be persisted in localStorage
- **Cons**:
  - Requires touching every SCSS file that references color variables
  - Cannot use SASS color functions (darken/lighten) on CSS vars at compile time
  - All color manipulations must be pre-defined as separate tokens
- **Effort**: Medium-High

#### 2. Dual SASS Theme Files (Light/Dark) + Class Swap
**Description**: Keep SASS variables but create two compiled theme files (`theme-light.css`, `theme-dark.css`) and swap the `<link>` tag or class on `<body>`.

- **Pros**:
  - Minimal change to existing SASS architecture
  - Can still use SASS color functions
  - Simple to understand
- **Cons**:
  - Requires loading two full stylesheets or generating two builds
  - Theme switch causes FOUC (flash of unstyled content)
  - Duplicated CSS output (both themes ship to client)
  - Harder to maintain — changes need to be made in both files
- **Effort**: Medium

#### 3. CSS-in-JS with Runtime Theme (e.g., styled-components, emotion)
**Description**: Introduce a CSS-in-JS library and define themes as JavaScript objects.

- **Pros**:
  - Full runtime control over themes
  - Can compute derived colors dynamically
  - Popular pattern in React ecosystems
- **Cons**:
  - Heavy dependency addition for a Vite/SASS project
  - Conflicts with existing SASS architecture
  - Increases bundle size
  - Overkill for this project's needs
  - Would require rewriting all existing styles
- **Effort**: High

#### 4. Incremental: Sidebar First, Theme Later
**Description**: Build the sidebar layout now using existing SASS variables (light only). Add dark mode in a second phase.

- **Pros**:
  - Smaller PR, easier to review
  - Reduces risk
  - Users get layout improvements faster
- **Cons**:
  - Dark mode requires another full pass over all styles
  - May create temporary inconsistency
  - Technical debt: styles written without theming in mind may need rework
- **Effort**: Medium (for shell only)

### Recommendation

**Approach 1: CSS Custom Properties Theme System + New AppShell**

This is the most sustainable path. The project is still early (v0.1.0), and establishing a proper theme system now prevents massive refactoring later. The migration pattern is:

1. **Phase A — Theme Foundation**: Convert `_variables.scss` colors to CSS custom properties. Keep SASS for structure, spacing, and mixins. Add `data-theme` attribute to `<html>`.
2. **Phase B — AppShell**: Build new `AppShell` component with:
   - Collapsible sidebar (left, ~240px expanded, ~64px collapsed)
   - Top bar (minimal, with user actions, theme toggle)
   - Main workspace (scrollable, full remaining width)
   - Overlay sidebar for mobile
3. **Phase C — Navigation**: Move horizontal nav items to sidebar. Group by category (Workspace: Chat, Browse; Data: Breweries; System: Settings, Admin). Add icons.
4. **Phase D — Polish**: Add transitions, active states, breadcrumb or page header area, workspace padding adjustments.

### Risks

- **Color function loss**: SASS `darken()`/`lighten()` won't work on CSS vars. All hover/active states need explicit token definitions.
- **Test maintenance**: Layout component tests will need significant updates. Page tests that assert on DOM structure may break if wrapper elements change.
- **Icon dependency**: Need to choose an icon library (Lucide React recommended — lightweight, tree-shakeable, no font loading).
- **Mobile complexity**: Collapsible sidebar needs mobile breakpoint handling (overlay drawer vs inline collapse).
- **Route changes**: Adding Settings/Sessions/Databases pages requires backend coordination or placeholder pages.
- **Scope creep**: "Redesign entire UI" can easily expand. Must define clear page boundaries per slice.

### Delivery Slices

Suggested incremental delivery (each slice = 1 PR):

1. **Slice 1 — Theme System**: CSS custom properties + dark mode toggle + persistence
2. **Slice 2 — AppShell Layout**: Sidebar component, collapse/expand, mobile overlay, top bar
3. **Slice 3 — Navigation Migration**: Move nav to sidebar, add route groups, active states
4. **Slice 4 — Workspace Polish**: Page headers, content padding, scroll areas, empty states
5. **Slice 5 — New Pages**: Settings page, Sessions placeholder, Databases placeholder

### Ready for Proposal

**Yes.** The codebase is small enough that a full redesign is feasible. The user explicitly wants this applied across the whole app, and the current architecture (React Router, Zustand, SASS) supports the target design with moderate changes. The next step is to write a formal proposal with the recommended approach, scope boundaries, and slice definitions.
