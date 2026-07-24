# Proposal: interactive-help-support-entry

## Intent

Convert the passive "Ayuda y soporte" footer entry in the Configuration nav sidebar from a decorative `<div aria-hidden="true">` into an accessible, keyboard-reachable `<button>` that opens the feedback flow. This is the trigger half of CORTEXDIST-32 (authenticated feedback channel); the modal itself is CORTEXDIST-28.

## Scope

### In Scope
- Replace decorative `<div>` with `<button type="button">` at the same visual location in `ConfigPage.tsx` nav footer
- Add `isFeedbackOpen` page-level state (`useState`) and wire `onClick` to set it `true`
- Remove `aria-hidden="true"`; add `aria-label="Abrir ayuda y soporte"`
- Inherit hover/focus styles by composing `config-page__nav-item` class alongside `config-page__nav-footer`
- TDD tests: renders as button with accessible name, keyboard-reachable, fires open handler, no `aria-hidden`

### Out of Scope
- Building the feedback modal (CORTEXDIST-28)
- Backend feedback endpoint / Resend email integration (CORTEXDIST-29+)
- Zustand global store — single producer/consumer does not justify it
- Changes to auth, layout, or any other page

## Capabilities

### New Capabilities
None

### Modified Capabilities
- `configuration-tabs`: Nav footer entry changes from decorative/hidden to interactive button with accessible name and activation behavior that signals intent to open feedback

## Approach

**Page-level `useState`** — `const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)` in `ConfigPage`.

Rationale:
- Matches existing pattern: `isCreateUserModalOpen` already uses page-level `useState` for modal control in the same component
- Zero new files; minimal change footprint
- CORTEXDIST-28 renders `<FeedbackModal isOpen={isFeedbackOpen} onClose={...} />` inside ConfigPage — same pattern as `UserManagement`/`DeleteConfirmationModal`
- If a second entry point is added later, migrating to Zustand is a two-file refactor

**Implementation blueprint:**
- Element: `<button type="button" className="config-page__nav-footer config-page__nav-item" aria-label="Abrir ayuda y soporte" onClick={() => setIsFeedbackOpen(true)}>`
- `config-page__nav-item` provides hover/focus/cursor-pointer for free (SCSS lines 110-141); `config-page__nav-footer` retains border-top and bottom positioning
- Native `<button>` gives Enter/Space activation and Tab focus — no custom `onKeyDown` needed
- `isFeedbackOpen` is the contract surface for CORTEXDIST-28 to consume

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-frontend/src/presentation/pages/ConfigPage.tsx` | Modified | Replace `<div>` footer with `<button>`; add `isFeedbackOpen` state |
| `cortex-frontend/src/presentation/pages/ConfigPage.scss` | Modified | Footer button inherits `config-page__nav-item` hover/focus via class composition — no new rules expected |
| `cortex-frontend/src/presentation/pages/ConfigPage.test.tsx` | Modified | Add tests for button role, accessible name, keyboard activation, open handler; verify existing 4 tests still pass |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing tests reference DOM structure that changes | Low | Existing tests query by role/name for other elements (Usuarios, dialog headings); none target the footer. Run full suite after change |
| SCSS specificity conflict between `--active`/`--placeholder` modifiers and footer | Low | Footer button uses neither modifier; `:hover` rule on `.config-page__nav-item:not(.--placeholder)` applies cleanly |
| Missing accessible name leaves nameless button | Low | Hardcoded `aria-label`; test asserts it |

## Rollback Plan

Revert the single commit. The change is isolated to 3 files in `ConfigPage.*`. No data migration, no API changes, no state persistence affected.

## Dependencies

- CORTEXDIST-28 (feedback modal) consumes `isFeedbackOpen` — but does NOT block this task. This task ships independently with the state wired but unconsumed.

## Success Criteria

- [ ] "Ayuda y soporte" renders as a `<button>` with `aria-label="Abrir ayuda y soporte"`
- [ ] No `aria-hidden` attribute on the element
- [ ] Element is reachable via Tab key and activatable via Enter/Space
- [ ] Clicking/activating sets `isFeedbackOpen` to `true` (verifiable via test spy or state inspection)
- [ ] Visual appearance preserved: same position, border-top, muted color; gains hover/focus feedback
- [ ] All 4 existing ConfigPage tests pass unchanged
- [ ] New TDD tests cover: button role, accessible name, keyboard activation, open-handler invocation
