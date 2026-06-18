## Exploration: Sidebar User Menu

### Current State

The Cortex frontend is a React 19 + Vite + SASS application using a Zustand auth store and a collapsible sidebar rendered inside `AppShell`.

- **Layout**: `AppShell` uses a CSS grid (`240px | 1fr`, collapsing to `64px | 1fr`) and renders `Sidebar` as the left column. `Sidebar` has a header toggle and a scrollable `nav` built from `presentation/config/navigation.ts`.
- **Auth data**: `features/auth/store.ts` exposes `user` (`{ id, email }`), `session`, `role`, `isLoading`, `isInitialized`, and `logout`. It does **not** currently store a `name` field; the only human-readable identifier available without backend changes is `user.email`.
- **Logout**: The only production logout path today is the API client (`services/api/client.ts`), which clears the store and sets `window.location.href = '/login'` on a `401`. There is no user-triggered logout UI. The store's `logout()` only clears local state; it does **not** call `supabaseClient.auth.signOut()` or the backend `/auth/logout` endpoint, so the Supabase session can remain valid in storage until expiry.
- **Visual language**: The sidebar uses CSS custom properties from `presentation/styles/_tokens.scss` (`--color-surface-card`, `--color-border-divider`, `--color-text-muted`, `--space-md`, `--radius-input`, etc.). Nav items are subtle, full-width, icon + label buttons. A `Logout` icon already exists in `presentation/components/atoms/Icon/Logout.tsx`, and a reusable `Button` atom exists in `presentation/components/atoms/Button/Button.tsx`.
- **Testing**: Tests use Vitest + `@testing-library/react` + `user-event`. Existing `Sidebar.test.tsx` mocks `useSidebarStore`. `ConfigPage.test.tsx` shows the project's pattern for mocking `useAuthStore` and asserting role-dependent UI.

### Affected Areas

- `cortex-frontend/src/presentation/components/molecules/Sidebar/Sidebar.tsx` — needs a bottom section for the user menu.
- `cortex-frontend/src/presentation/layouts/AppShell.scss` — sidebar styles live here; a footer area and collapsed-mode rules should be added.
- `cortex-frontend/src/features/auth/store.ts` — may need to expose/extract a `name` value from `user.user_metadata` if the user must display a real name rather than email.
- `cortex-frontend/src/presentation/components/molecules/Sidebar/Sidebar.test.tsx` — needs new assertions for user info, logout button, and collapsed behavior.
- `cortex-frontend/src/presentation/config/navigation.ts` — not strictly required, but adding a logout nav action here would keep the sidebar config-driven pattern.

### Approaches

1. **Inline footer inside `Sidebar`** — add a `SidebarFooter` sub-component at the bottom of `Sidebar` that reads `useAuthStore`, displays email/role, and exposes a logout button.
   - Pros: keeps the user menu inside the sidebar's visual boundary, easy collapsed-mode handling, minimal prop drilling.
   - Cons: `Sidebar` becomes slightly larger; still need to decide whether to call Supabase/backend sign-out.
   - Effort: Low

2. **Static compact panel with popover** — render a small user card that expands or opens a popover with name, role, and logout.
   - Pros: matches common "user menu" reference patterns, can hide advanced actions behind a click.
   - Cons: over-engineering for the requested first version (only name, role, logout); adds state and click-outside handling.
   - Effort: Medium

3. **Email-as-name vs. real name extraction** — either display `user.email` as the "name" or extend `extractUserAndRole` to read `user.user_metadata.full_name`/`name`.
   - Pros of email: zero backend/auth store changes.
   - Pros of real name: matches the requirement literally, but requires ensuring Supabase metadata contains a name (currently it only stores `role`).
   - Cons of real name: may need backend `/auth/me` and auth store changes; not guaranteed to exist in current data.
   - Effort: Low (email) / Medium (real name)

### Recommendation

Use **Approach 1** with a new `SidebarFooter` component rendered inside `Sidebar`, and display the user's `email` as the primary identifier (with a clear fallback to email if no `name` metadata is present). This satisfies the "mini user menu" requirement while preserving the existing visual language and minimizing scope.

For logout, the button should call `useAuthStore.getState().logout()` and navigate to `/login`. Consider also calling `supabaseClient.auth.signOut()` or the backend `/auth/logout` endpoint so the server-side session is invalidated, because the current store-only logout leaves the Supabase session alive in storage.

### Risks

- **No real name available**: the auth store only has `email` and `role`. If the product requirement strictly means a human name, we need backend and metadata changes.
- **Incomplete logout**: clearing the local Zustand state does not revoke the Supabase session. A dedicated logout flow should be added.
- **Collapsed sidebar**: the footer must hide text labels and keep the logout icon usable at `64px` width.
- **TDD compliance**: the project enforces strict TDD, so new behavior must be covered by tests in `Sidebar.test.tsx` (or a new `SidebarFooter.test.tsx`).

### Ready for Proposal

Yes. The change is well-scoped and the necessary seams (auth store, sidebar component, styles, tests) are clearly identified. The proposal should decide whether to display `email` or invest in a real `name` field, and whether the logout button should also call the Supabase/backend sign-out endpoint.
