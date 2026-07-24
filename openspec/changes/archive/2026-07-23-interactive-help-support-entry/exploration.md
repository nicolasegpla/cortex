## Exploration: interactive-help-support-entry

### Current State

The "Ayuda y soporte" entry in `ConfigPage.tsx` (lines 81-84) is a **passive decorative element**:

```tsx
<div className="config-page__nav-footer" aria-hidden="true">
    <Chat className="config-page__nav-icon" width={16} height={16} />
    <span>Ayuda y soporte</span>
</div>
```

- It uses `<div>` (not interactive), has `aria-hidden="true"` (hidden from assistive technology), and has **no event handlers, no tab stop, no keyboard interaction**.
- The visual styling (`config-page__nav-footer`) places it at the bottom of the navigation sidebar, separated by a `border-top`. It looks similar to nav items but is visually distinct — no hover effect, no cursor pointer, muted color.
- The nav items above it (lines 65-73) use `<button>` elements with proper `type="button"`, `aria-current`, hover/focus states, and are fully keyboard accessible — but they are hardcoded to `--active` state and are non-functional (the only existing tab is "Usuarios").
- The parent feature (CORTEXDIST-32) will add a feedback modal in a subsequent subtask (CORTEXDIST-28). **This subtask only converts the entry to interactive** and defines how the open-feedback signal flows to the future modal.

### Affected Areas

- **`cortex-frontend/src/presentation/pages/ConfigPage.tsx`** — Replace the decorative `<div>` with an interactive `<button>`; add internal open-feedback state (page-level `useState` or Zustand hook). This is the primary change file.
- **`cortex-frontend/src/presentation/pages/ConfigPage.scss`** — Extend `config-page__nav-item` styles to the footer button to inherit hover/focus/active feedback, OR add a dedicated modifier class. The footer needs to keep its `border-top` and bottom positioning.
- **`cortex-frontend/src/presentation/pages/ConfigPage.test.tsx`** — Add TDD tests: validates it renders as a button with an accessible name, is keyboard-reachable, fires the open handler, and no longer has `aria-hidden`. Existing tests must not regress.
- **`cortex-frontend/src/store/useFeedbackStore.ts`** (conditionally) — Only if Approach B (Zustand global store) is chosen. Otherwise no new file.
- **`cortex-frontend/src/features/auth/store.ts`** — Not directly changed, but the feedback flow will later read the authenticated user from `useAuthStore`. This subtask does NOT touch auth.

### Approaches

#### 1. Page-level `useState` (local state in ConfigPage)

Use `const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)` in ConfigPage. The footer `<button>` calls `setIsFeedbackOpen(true)` on activation. The future modal (CORTEXDIST-28) is rendered inside ConfigPage, controlled by `isFeedbackOpen`.

- **Pros:**
  - Matches existing ConfigPage pattern (`isCreateUserModalOpen` already uses page-level `useState` for modal control)
  - Zero new files — minimal change footprint
  - No inter-component coupling: the trigger and the modal share the same component scope
  - Natural fit for a page where the modal is rendered inline (same pattern as `UserManagement` with `isCreateUserModalOpen`)
  - State lifecycle is tied to ConfigPage mount/unmount — no stale global state
- **Cons:**
  - Cannot trigger feedback from outside ConfigPage (but there is no other entry point planned)
  - The modal must render inside ConfigPage (not at layout level) — this is the existing pattern anyway
  - If a future requirement adds a second feedback entry elsewhere, refactoring to Zustand would be needed
- **Effort:** Low

#### 2. Zustand global store (`useFeedbackStore`)

Create `src/store/useFeedbackStore.ts` with `isOpen: boolean` and `openFeedback()`/`closeFeedback()` actions. ConfigPage's button calls `openFeedback()`. The modal (CORTEXDIST-28) subscribes to `isOpen` from the same store.

- **Pros:**
  - Modal can render anywhere in the tree (not bound to ConfigPage's render scope)
  - Survives ConfigPage unmount — feedback state is independent
  - Consistent with project idioms: `useSidebarStore`, `useThemeStore`, `useChatStore`, `useAuthStore` all use Zustand
  - Easier to extend if additional triggers are added later (e.g., a floating help button)
  - Store can be tested in isolation without React (same pattern as `useSidebarStore.test.ts`)
- **Cons:**
  - Adds a new file and store registration
  - Overkill for a single-producer/single-consumer scenario (just one button → one modal)
  - Global state for what is fundamentally a UI transient state is a weak architectural signal
  - No persistence needed (unlike sidebar/theme/chat), so the `persist` middleware would be unused
- **Effort:** Medium

#### 3. Callback via ConfigPage props

Add `onOpenFeedback?: () => void` to `ConfigPageProps`. The parent (whichever layout renders ConfigPage) manages the state and renders the modal. This delegates state ownership upward.

- **Pros:**
  - ConfigPage stays pure — no modal state, no feedback concern
  - Parent controls where and how the modal renders
  - Testable by passing a mock `onOpenFeedback`
- **Cons:**
  - Pushes responsibility to the parent, which doesn't currently exist as a stateful wrapper for feedback
  - Requires the parent to hold modal state and render the feedback modal — adds complexity to what is currently a simple route component
  - ConfigPage is already stateful (has `useState`, `useAuthStore`) — adding one more state variable is not a meaningful concern
  - Violates the existing pattern where ConfigPage owns its own modals (UserManagement, modal variant close button)
- **Effort:** Medium

### Recommendation

**Approach 1: Page-level `useState`** — use `const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)` in ConfigPage.

**Rationale:**
1. **House style alignment**: ConfigPage already owns modal state via `isCreateUserModalOpen`. Adding `isFeedbackOpen` follows the same established pattern. Every existing modal in the app (`DeleteConfirmationModal`, `EntityFormModal`, `EntityDetailModal`) is rendered inline by the component that triggers it.
2. **Scope simplicity**: There is exactly one trigger (the "Ayuda y soporte" button) and exactly one consumer (the feedback modal). A global store adds indirection without benefit.
3. **Parent constraints**: The task explicitly says CORTEXDIST-28 builds the modal — meaning the modal is not here yet. Page-level state is the lightest possible contract: when CORTEXDIST-28 arrives, it renders a `<FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />` inside ConfigPage. No coordination across subtasks needed.
4. **Agnostic to constraint evolution**: If later a second entry point is added, migrating `useState` → Zustand is a two-file refactor. Starting with Zustand now is speculative.

**How the control should work (implementation blueprint):**
- Replace the `<div className="config-page__nav-footer" aria-hidden="true">` with a `<button type="button" className="config-page__nav-footer config-page__nav-item" aria-label="Abrir ayuda y soporte" onClick={() => setIsFeedbackOpen(true)}>`.
- The `config-page__nav-item` class brings hover/focus states, cursor pointer, and transition for free (already defined in the SCSS at lines 110-141). The existing `config-page__nav-footer` class adds `border-top`, bottom positioning, and muted color.
- No `aria-hidden` — this is now an interactive action, not decorative.
- The `<button>` element provides native keyboard handling (Enter/Space activation, Tab focus) without any custom `onKeyDown` handler.
- The `setIsFeedbackOpen(true)` call will be consumed by CORTEXDIST-28 to open the modal.

### Risks

- **Breaking existing tests**: ConfigPage.test.tsx has 4 test cases that reference the DOM structure. The "Ayuda y soporte" text currently exists as a `<span>` inside a `<div>` — changing to a `<button>` requires the test file to query by button role. Verify all 4 existing tests still pass after the change.
- **SCSS specificity**: The `config-page__nav-footer` class has no `cursor: pointer` or hover state. After adding `config-page__nav-item`, the compound selector must not conflict with the `--active` or `--placeholder` modifier variations. The existing `:hover` rule on `.config-page__nav-item:not(.config-page__nav-item--placeholder):hover` should apply cleanly.
- **Accessibility regression**: The current element is `aria-hidden="true"` — correctly marking it as decorative. Changing it to interactive must NOT retain `aria-hidden`, and must add an accessible name. If the accessible name is omitted, screen reader users get a nameless button.
- **No keyboard trap**: The button's `onClick` toggles a boolean — this is safe. However, if CORTEXDIST-28 later renders a `<dialog>` with `showModal()`, focus trapping is the modal's responsibility (the existing pattern in `DeleteConfirmationModal` already handles this via `dialogRef`/`useEffect`).

### Ready for Proposal

**Yes.** The exploration is thorough. ConfigPage.tsx is well-understood, the existing interactive control patterns are documented, the Zustand store conventions are clear, and a recommended approach with low risk is identified. The orchestrator should proceed to `sdd-propose` for this change.
