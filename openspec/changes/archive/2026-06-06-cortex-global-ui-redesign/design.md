# Design: Cortex Global UI Redesign

## Technical Approach

Introduce `AppShell` as root layout with collapsible sidebar + top bar + content area. Migrate SASS compile-time theme vars to CSS custom properties on `:root` / `[data-theme="dark"]` for runtime switching. Replace `MainLayout` in a single atomic slice — swap layout in `router.tsx`, add store, CSS tokens, icons, and placeholder page routes together. SASS keeps its role for mixins, BEM layout classes, and reset.

## Architecture Decisions

| Decision | Option A | Option B | Chosen | Rationale |
|---|---|---|---|---|
| Theme system | CSS custom properties + `data-theme` attribute | CSS-in-JS / `ThemeProvider` context | **Option A** | Keeps SASS stack. Zero JS runtime cost. `@media (prefers-color-scheme)` reads system preference; JS toggle sets `document.documentElement.dataset.theme`. No new dependencies. |
| Sidebar state | Zustand `useSidebarStore` | React context + reducer | **Zustand** | Matches existing `useAuthStore` pattern. Smaller API surface. Easy localStorage persist with Zustand middleware. |
| Icon strategy | Inline SVG functional components | Icon library (lucide-react, heroicons) | **Inline SVG** | Zero bundle cost for unused icons. `currentColor` inherits theme tokens. Tree-shakeable by definition. Under 20 icons needed total. |
| SASS role | Keep for layout/mixins only; vars → CSS custom properties | Full CSS custom properties, drop SASS | **Hybrid** | SASS mixins (`app-shell`, `content-container`, `card-base`) are valuable for DRY layout patterns. Vars get migrated to CSS tokens referenced by both SASS and components. |
| Navigation config | Typed config array: `NavSection[]` with `items: NavItem[]` | Introspect React Router route tree | **Config array** | Single source of truth. Route tree is nested; sidebar is flat-per-section. Config decouples navigation UX from route hierarchy. Admin-only items can filter on `requiredRole`. |

## Data Flow

```
useSidebarStore (collapsed, activeSection, toggle)
    │
    ▼
AppShell
    ├── TopBar ──┬── ThemeToggle (sets data-theme on <html>)
    │            └── SidebarToggle (calls store.toggle)
    ├── Sidebar ──┬── navigationConfig[] → NavSection[]
    │             │      └── NavItem[] → <NavLink to={path}>
    │             └── renders based on store.collapsed
    └── <Outlet /> (renders route children unchanged)
         CSS: all components read var(--color-surface-canvas), etc.
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/presentation/layouts/AppShell.tsx` | **Create** | Root layout: sidebar + top bar + outlet |
| `src/presentation/layouts/AppShell.scss` | **Create** | Grid layout, responsive breakpoints, sidebar transition |
| `src/presentation/components/molecules/Sidebar/Sidebar.tsx` | **Create** | Renders `NavSection[]` groups with collapsible behavior |
| `src/presentation/components/molecules/Sidebar/NavItem.tsx` | **Create** | Single nav link with icon, label, active state |
| `src/presentation/components/atoms/ThemeToggle/ThemeToggle.tsx` | **Create** | Button toggling `data-theme`, reads system preference on mount |
| `src/presentation/components/atoms/Icon/{Chat,Database,Sessions,Config,Admin,ChevronLeft,Menu,X,Sun,Moon,Logout}.tsx` | **Create** | Inline SVG components (~12 files), `currentColor` fill |
| `src/presentation/config/navigation.ts` | **Create** | `navigationConfig: NavSection[]` typed config |
| `src/store/useSidebarStore.ts` | **Create** | Zustand: `collapsed`, `toggle`, `activeSection`, localStorage persist |
| `src/store/useThemeStore.ts` | **Create** | Zustand: `theme`, `toggleTheme`, syncs `data-theme` attribute |
| `src/presentation/styles/_tokens.scss` | **Create** | CSS custom properties: `--color-*`, `--space-*`, `--radius-*`, `--shadow-*` |
| `src/presentation/pages/{Databases,Sessions,Config}Page.tsx` | **Create** | Placeholder "Coming Soon" pages (3 files) |
| `src/app/router.tsx` | **Modify** | Swap `MainLayout` → `AppShell`; add databases/sessions/config routes |
| `src/presentation/styles/_variables.scss` | **Modify** | Convert to `var()` references or remove (values move to `_tokens.scss`) |
| `src/presentation/styles/_base.scss` | **Modify** | Replace `$color-*` references with `var(--color-*)` |
| `src/presentation/styles/index.scss` | **Modify** | Forward `_tokens.scss` |
| `src/presentation/layouts/MainLayout.tsx` | **Delete** | Replaced by AppShell |
| `src/presentation/layouts/main-layout.scss` | **Delete** | Replaced by AppShell.scss |

## Interfaces / Contracts

```typescript
// src/presentation/config/navigation.ts
interface NavItem {
  label: string;
  to: string;
  icon: keyof typeof ICON_MAP;
  end?: boolean;
  requiredRole?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// src/store/useSidebarStore.ts
interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
}

// src/store/useThemeStore.ts
interface ThemeState {
  theme: 'light' | 'dark' | 'system';
  resolved: 'light' | 'dark';
  setTheme: (t: ThemeState['theme']) => void;
  toggleTheme: () => void;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `useSidebarStore`, `useThemeStore` | Zustand store tests (no React needed) — verify state transitions, localStorage persist |
| Unit | `NavItem`, `ThemeToggle` | Render with vitest + RTL, assert active class, theme toggle sets `data-theme` |
| Integration | `AppShell` with router | Render with `MemoryRouter`, verify sidebar renders nav from config, active state follows URL |
| Integration | Theme system | Verify CSS custom properties resolve correctly on `[data-theme="dark"]` |
| Snapshot | All existing pages inside `AppShell` | Update snapshots — structural layout change is expected |

## Migration / Rollout

Single slice delivery (no phased rollout). All changes land in one PR:
1. Create `_tokens.scss` with CSS custom properties (light defaults + `[data-theme="dark"]` overrides)
2. Create stores (`useSidebarStore`, `useThemeStore`) and config (`navigation.ts`)
3. Create icon components, `AppShell`, `Sidebar`, `NavItem`, `ThemeToggle`
4. Modify `router.tsx` to swap layout, add routes, then delete `MainLayout`
5. Update snapshots — expected diff on layout change

Auth guards (`ProtectedRoute`, `RequireRole`) remain unchanged — they wrap page content, not layout.

## Open Questions

- [ ] Confirm sidebar collapse preference: collapsed by default on tablet, expanded on desktop?
- [ ] Admin section: show to all authenticated users (greyed out if no permission) or hide entirely?
