# Design: interactive-help-support-entry

## Technical Approach

Convert the decorative `<div aria-hidden="true">` footer in `ConfigPage.tsx` (lines 81-84) into a native `<button>` that flips a page-level `useState` flag `isFeedbackOpen`, and bind that flag to `aria-expanded` on the trigger so the open-state is **observable in the DOM**. The flag is the documented contract surface that CORTEXDIST-28 consumes to render its modal — no consumer exists yet, so it ships wired-but-unconsumed. Styled by **class composition** (`config-page__nav-footer` + `config-page__nav-item`) so hover/focus/cursor come from existing SCSS rules with zero new declarations. Strict TDD: failing tests first (asserting `aria-expanded` toggles), then the 3-file edit.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|---|---|---|---|
| State location | A) page-level `useState` · B) Zustand `useFeedbackStore` · C) parent prop callback | A matches existing `isCreateUserModalOpen` pattern, zero new files, single producer/consumer; B over-engineers for one trigger → one modal; C breaks ConfigPage-owns-its-modals convention | **A — page-level `useState`** |
| Element type | A) native `<button>` · B) `<div role="button">` · C) `<a>` | A gives Enter/Space + Tab for free, no `onKeyDown`; B forces custom keyboard + `tabIndex` + ARIA gymnastics; C is semantic fraud (no navigation) | **A — native `<button type="button">`** |
| Styling strategy | A) compose existing `config-page__nav-item` · B) new `--button` modifier · C) duplicate rules | A reuses tested hover/focus/cursor (SCSS 110-141), zero new CSS; B/C add surface area without benefit | **A — class composition, no new SCSS rules** |
| Accessible name | A) `aria-label="Abrir ayuda y soporte"` · B) rely on inner `<span>` text · C) visible + aria-label | A explicit and robust against icon-only refactors; B fragile (icon siblings can confuse name calc); C redundant | **A — explicit `aria-label`** |
| Open-state observability | A) `aria-expanded={isFeedbackOpen}` on trigger · B) `data-is-open` attribute · C) defer all state verification to CORTEXDIST-28 | A makes the boolean observable in the DOM now (matches proposal L75: "verifiable via state inspection"), is correct ARIA for a button that controls something, and is RTL-assertable via `toHaveAttribute('aria-expanded', 'true')`; B works but is non-semantic; C drops the acceptance criterion | **A — `aria-expanded` bound to `isFeedbackOpen`** |
| Event contract for CORTEXDIST-28 | A) `isFeedbackOpen: boolean` + inline `setIsFeedbackOpen` · B) callback prop `onOpenFeedback` | A mirrors `isCreateUserModalOpen`/`UserManagement` props pattern already proven here; B introduces a parent we don't need | **A — boolean state + setter, inline consumer** |

## Data Flow

```
[User activates button] ──onClick──→ setIsFeedbackOpen(true)
                                          │
                         ┌────────────────┴────────────────┐
                         ▼                                  ▼
            isFeedbackOpen (ConfigPage state)        aria-expanded={isFeedbackOpen}
                         │                                  ▲ (observable now:
                         ▼                                   RTL asserts toggle on click,
           (CORTEXDIST-28, future)                           Enter, and Space)
           <FeedbackModal isOpen={isFeedbackOpen}
                          onClose={() => setIsFeedbackOpen(false)} />
```

Until CORTEXDIST-28 lands, `isFeedbackOpen` is set but its only consumer is the trigger's own `aria-expanded` — a deliberate, harmless, **observable** signal.

## File Changes

| File | Action | Description |
|---|---|---|
| `cortex-frontend/src/presentation/pages/ConfigPage.tsx` | Modify | Add `const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false)`; replace footer `<div>` (L81-84) with `<button type="button" className="config-page__nav-footer config-page__nav-item" aria-label="Abrir ayuda y soporte" aria-expanded={isFeedbackOpen} onClick={() => setIsFeedbackOpen(true)}>`; drop `aria-hidden`. ESLint: state is genuinely consumed by `aria-expanded` and `onClick`, so no disable directive is expected. |
| `cortex-frontend/src/presentation/pages/ConfigPage.scss` | Modify | No new rules. Add a doc-comment above `.config-page__nav-footer` noting class composition with `config-page__nav-item` is intentional and that the footer must NOT use `--active`/`--placeholder` modifiers (preserves `:hover` rule at L138 via the `:not(.config-page__nav-item--placeholder)` guard). |
| `cortex-frontend/src/presentation/pages/ConfigPage.test.tsx` | Modify | Add failing tests FIRST (RED), then make them GREEN. Tests assert the open-state via `aria-expanded` (proposal L75 acceptance criterion). |

## Interfaces / Contracts

```ts
// Inside ConfigPage component (no export — page-local):
const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);
// Trigger: <button ... aria-expanded={isFeedbackOpen} onClick={() => setIsFeedbackOpen(true)}>
// Contract for CORTEXDIST-28: render <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
```

No new exported types. No prop changes to `ConfigPageProps`.

## Testing Strategy (Strict TDD — RED first)

| # | Test | Asserts | How |
|---|---|---|---|
| 1 | renders "Ayuda y soporte" as a button with accessible name | `screen.getByRole('button', { name: 'Abrir ayuda y soporte' })` exists | RTL render, super_admin role |
| 2 | the button has no `aria-hidden` | **no** `aria-hidden="true"` element near the footer | `container.querySelector('.config-page__nav-footer[aria-hidden="true"]')` → `expect(...).not.toBeInTheDocument()` (consistent RTL idiom with the rest of the suite — lines 61, 71-75) |
| 3 | activating via click flips `isFeedbackOpen` to true (observable open-state) | the trigger's `aria-expanded` toggles from `"false"` to `"true"` on click | `userEvent.setup()`; query `getByRole('button', { name: 'Abrir ayuda y soporte' })`; assert `toHaveAttribute('aria-expanded', 'false')` before, then `await user.click(button)`, then `toHaveAttribute('aria-expanded', 'true')` |
| 4 | keyboard activation via Enter and Space also flips the open-state | pressing Enter and Space on the focused button toggles `aria-expanded` to `"true"` for each key | `user.click(button)` to focus (or `button.focus()`), then `user.type(button, '{Enter}')` → assert `toHaveAttribute('aria-expanded', 'true')`; reset by re-render, then `user.type(button, ' ')` (Space) → assert `toHaveAttribute('aria-expanded', 'true')` |
| 5 | visual location unchanged: footer still composes the two classes | class + DOM-position assertion | `container.querySelector('.config-page__nav-footer.config-page__nav-item')` present; footer remains last child of `aside.config-page__nav` |
| 6 | regression: all 4 existing tests pass unchanged | the 4 existing `it(...)` blocks | run full suite `pnpm test ConfigPage` |

RED order: write tests 1-5 first (fail — element is still `<div aria-hidden>`, no `aria-expanded`), then make the edit, then GREEN, then run test 6 (regression).

Note: Space in `user.type` is `' '` (a literal space); `{ }` is not a valid RTL key code — use `' '`.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Rollback = `git revert <commit>`; the change is isolated to 3 files in `ConfigPage.*`, no data, API, or persistence impact.

## Open Questions

- [ ] None blocking. (CORTEXDIST-28 will define the modal shape; this design leaves `isFeedbackOpen` consumed only by the trigger's `aria-expanded` until then.)