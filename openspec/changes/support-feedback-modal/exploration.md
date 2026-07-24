# Exploration: support-feedback-modal

## Current State

ConfigPage already holds `isFeedbackOpen` boolean state + `setIsFeedbackOpen` (CORTEXDIST-26). The trigger button renders `<button aria-expanded={isFeedbackOpen} onClick={() => setIsFeedbackOpen(true)} aria-label="Abrir ayuda y soporte">`. No consumer of `isFeedbackOpen` exists yet beyond the trigger's own `aria-expanded`. The contract per the archived design is: render `<FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />`.

The codebase has two modal patterns:
1. **Div-based** (UserManagement inline): `<section role="dialog" aria-modal="true">` inside a backdrop `<div>`, with escape-key handler via `getTopmostModal()`, and `useRef` for the section.
2. **Native `<dialog>`** (EntityFormModal, DeleteConfirmationModal): uses `dialog.showModal()`/`.close()`, focus restoration, scroll reset, `aria-busy` loading overlay with spinner. More robust (backdrop pseudo-element, native escape handling, top-layer stacking).

Both EntityFormModal and DeleteConfirmationModal live under `cortex-frontend/src/presentation/components/organisms/` and follow Atomic Design conventions.

## Affected Areas

- `cortex-frontend/src/presentation/components/organisms/` — new `FeedbackModal/` organism (FeedbackModal.tsx, FeedbackModal.scss, FeedbackModal.test.tsx, index.ts), plus barrel export update in `organisms/index.ts`
- `cortex-frontend/src/presentation/components/atoms/` — NEW `Textarea/` atom needed (no textarea atom exists; Input is the only text input atom; Select exists). Follows Input atom's BEM pattern (`textarea-field`, `textarea-field__label`, `textarea-field__control`)
- `cortex-frontend/src/presentation/pages/ConfigPage.tsx` — wire `<FeedbackModal isOpen={isFeedbackOpen} onClose={...} onSubmit={...} />` (or stub for now)
- `cortex-frontend/src/presentation/pages/ConfigPage.test.tsx` — add test coverage for FeedbackModal integration (modal opens/closes, stays accessible alongside nested modals)
- `cortex-frontend/src/presentation/components/organisms/index.ts` — add `FeedbackModal` export
- `cortex-frontend/src/presentation/components/atoms/index.ts` — add `Textarea` export

## Approaches

### Approach A: New `FeedbackModal` organism + new `Textarea` atom — native `<dialog>` pattern

Build a dedicated FeedbackModal organism following the EntityFormModal/DeleteConfirmationModal native `<dialog>` pattern. Create a new `Textarea` atom to match the Input/Select house style. Wire into ConfigPage via `isOpen`/`onClose` props + `onSubmit` callback for CORTEXDIST-27.

- **Pros**: Matches existing organism patterns precisely (native `<dialog>`, focus restoration, `aria-busy`, spinner overlay). Self-contained component with all states (idle, submitting, success, error). Textarea atom is reusable across the codebase. No coupling to UserManagement's ad-hoc modal implementation. Clean separation: ConfigPage owns open/close state, FeedbackModal owns form state and submission lifecycle.
- **Cons**: Creates a new atom class (Textarea) — adds ~60 lines of boilerplate but establishes a reusable pattern. Two new files instead of reusing existing patterns inline.
- **Effort**: Medium (4 files for FeedbackModal, 4 files for Textarea, 2 file edits for barrel exports + ConfigPage wiring + tests)

### Approach B: Extend `EntityFormModal` — composition with children

Reuse the existing `EntityFormModal` organism as a wrapper, passing the feedback form as `children`. The form fields live inline or in a small molecule component. No new modal shell is created.

- **Pros**: Zero new modal logic — reuses proven focus/scroll/escape/aria-busy. Less total new code.
- **Cons**: EntityFormModal's loading overlay covers the entire modal (blocks access to the close button during submit). Feedback form has different visual proportions (smaller, simpler) — EntityFormModal is designed for data-entry forms with header/footer. The textarea + select composition is awkward as inline children. Still needs a Textarea atom or raw `<textarea>` usage. The modal title is a string prop — multi-state success/error UI becomes a callback-driven state machine outside the modal, cluttering ConfigPage.
- **Effort**: Medium (but more state management complexity in the consumer)

### Approach C: Inline modal in ConfigPage.tsx (UserManagement pattern)

Follow the UserManagement div-based modal pattern. Define the modal directly inside ConfigPage with all form state managed at the page level.

- **Pros**: Consistent with the CreateUser modal already on the same page. No new organism file.
- **Cons**: ConfigPage already owns `isCreateUserModalOpen`, `isFeedbackOpen`, and would then also own form fields, validation, submit state, success/error messages — violates Single Responsibility. The div-based modal is technically weaker than `<dialog>` (no native backdrop stacking, no `dialog.close()` animation). The spec calls for a form with loading/success/error states — page-level state for this would be ~50+ lines of hooks.
- **Effort**: Low (but incurs technical debt)

## Recommendation

**Approach A** — new `FeedbackModal` organism using native `<dialog>` + new `Textarea` atom. This is the best long-term fit:

1. **House style**: matches EntityFormModal and DeleteConfirmationModal patterns exactly (native `<dialog>`, `showModal()`/`close()`, focus restoration, `aria-busy` spinner, BEM-scoped SCSS with `@use '@/presentation/styles/index.scss' as *;`).
2. **Textarea atom**: the codebase has zero text inputs beyond `<input type="text">`. A Textarea atom following the Input atom's exact BEM structure (`textarea-field`, `textarea-field__label`, `textarea-field__control`, matching SCSS variables for border/radius/focus) is overdue and necessary for this feature.
3. **Separation of concerns**: ConfigPage owns open/close via `isFeedbackOpen` state. FeedbackModal owns form state, validation, submit lifecycle. CORTEXDIST-27 just swaps in the real API via the `onSubmit` callback.
4. **Submit boundary design**: `onSubmit: (payload: FeedbackPayload) => Promise<{ success: boolean; message: string }>` — returns a result the modal consumes for success/error UI, keeping the page unaware of the API contract.

### Field Set
```ts
const FEEDBACK_TYPES = {
  BUG: 'bug',
  MEJORA: 'mejora',
  NUEVA_FUNCION: 'nueva_funcion',
  OTRO: 'otro',
} as const;

type FeedbackType = (typeof FEEDBACK_TYPES)[keyof typeof FEEDBACK_TYPES];

// TypeScript const-types pattern (matches house style — see typescript skill)
interface FeedbackPayload {
  type: FeedbackType;
  subject: string;   // "Asunto" field
  message: string;   // "Mensaje" textarea field
}

interface FeedbackFormResult {
  success: boolean;
  message: string;
}
```

### Client Validation Approach
- **HTML5 `required`** on all three fields (matching the existing `Input` atom's `required` prop usage in UserManagement)
- **Inline validation message**: displayed before submission attempt if fields are empty (`role="alert"`, BEM-scoped `feedback-modal__field-error`)
- **Error message never clears typed text**: form state lives in `useState` in the modal component. On submit error (API returns `{ success: false, message }`), the modal stays open with the message displayed and all field values intact. Only on `success` does the modal transition to the success state (confirm message + close button).
- **Submit button** is the primary trigger — clicking "Enviar" validates, calls `onSubmit`, and shows result.

### Native `<dialog>` Pattern (from EntityFormModal)
```ts
// Key patterns to replicate:
- dialogRef = useRef<HTMLDialogElement>(null)
- useEffect: isOpen → dialog.showModal(), !isOpen → dialog.close()
- onCancel handler: getTopmostModal() guard for nested modals, event.preventDefault(), onClose()
- aria-modal={isOpen ? 'true' : undefined}
- aria-labelledby={headingId}
- aria-busy={isSubmitting ? 'true' : undefined}
```

### State Machine
```
IDLE → (submit) → SUBMITTING → (API result) → SUCCESS | ERROR
ERROR → (correct & resubmit) → SUBMITTING
SUCCESS → (close) → IDLE
```

States:
- **IDLE**: form rendered, all fields editable, "Enviar" button primary + "Cancelar" button secondary
- **SUBMITTING**: all fields disabled, "Enviar" → spinner "Enviando...", loading overlay (`aria-busy`)
- **SUCCESS**: form hidden, success icon + confirmation message + "Cerrar" button. `onClose()` callable.
- **ERROR**: form still rendered with field values intact, error alert message displayed inline, submit re-enabled

## Component Placement

```
cortex-frontend/src/presentation/components/
├── atoms/
│   ├── Textarea/                    ← NEW (follows Input pattern)
│   │   ├── Textarea.tsx
│   │   ├── textarea.scss
│   │   ├── Textarea.test.tsx
│   │   └── index.ts
│   └── index.ts                     ← MODIFY (add Textarea export)
└── organisms/
    ├── FeedbackModal/               ← NEW
    │   ├── FeedbackModal.tsx
    │   ├── FeedbackModal.scss
    │   ├── FeedbackModal.test.tsx
    │   └── index.ts
    └── index.ts                     ← MODIFY (add FeedbackModal export)
```

## Strict TDD Test Plan Outline

### Phase 1: Textarea Atom (RED → GREEN)
1. **Textarea renders with label** — `screen.getByLabelText('Mensaje')` resolves
2. **Textarea respects `required`** — `screen.getByLabelText('Mensaje')` has `required` attribute
3. **Textarea shows placeholder** — `screen.getByPlaceholderText('...')` resolves
4. **Textarea forwards `name` attribute** — attribute assertion

### Phase 2: FeedbackModal Component (RED → GREEN)
Testing patterns match `EntityFormModal.test.tsx`:
1. **Does not render when `isOpen={false}`** — `screen.queryByRole('dialog')` is null
2. **Renders dialog with correct title when `isOpen`** — `screen.getByRole('dialog', { name: 'Ayuda y soporte' })` resolves
3. **Renders all three form fields** — `getByLabelText('Tipo de solicitud')`, `getByLabelText('Asunto')`, `getByLabelText('Mensaje')`
4. **Close button fires `onClose`** — `user.click(getByRole('button', { name: 'Cerrar formulario' }))` → `expect(onClose).toHaveBeenCalled()`
5. **Escape key closes modal** — `user.keyboard('{Escape}')` → `expect(onClose).toHaveBeenCalled()`
6. **Escape ignores when another modal is on top** — `getTopmostModal` mock returns different element, Escape → onClose NOT called
7. **Exposes `aria-modal="true"`** — attribute assertion
8. **Submitting empty form shows validation error** — `user.click(getByRole('button', { name: 'Enviar' }))` → `expect(screen.getByRole('alert')).toBeInTheDocument()`
9. **Fills form, submits, calls `onSubmit` with correct payload** — type all fields, click submit, `expect(mockOnSubmit).toHaveBeenCalledWith({ type: 'bug', subject: 'Test', message: 'Test message' })`
10. **Shows loading state during submission** — `aria-busy="true"`, spinner visible, fields disabled
11. **Shows success state on successful submit** — confirm message visible, close button present, form not visible
12. **Shows error state on failed submit without losing typed text** — `userEvent.type(subjectInput, 'Test')` → submit → error role=alert appears, `subjectInput.value` still 'Test'
13. **Cancels submit, calls `onClose`** — `user.click(getByRole('button', { name: 'Cancelar' }))` → `expect(onClose).toHaveBeenCalled()`

### Phase 3: ConfigPage Integration
1. **Modal opens when trigger is clicked** — `user.click(supportButton)` → `screen.getByRole('dialog', { name: 'Ayuda y soporte' })` resolves
2. **Modal closes when close button is clicked** — open modal, click close, modal disappears
3. **Feedback modal stays accessible alongside nested modals** — open CreateUser modal, then open Feedback → both dialogs exist, topmost guard works

## Risks

- **No Textarea atom exists today**: must create one. Low risk (follows Input atom pattern exactly), but adds ~4 files to scope. This atom will be immediately useful for other features.
- **CORTEXDIST-27 API contract unknown**: designing the `onSubmit` callback interface now may need adjustment later. Mitigation: the callback signature `(payload: FeedbackPayload) => Promise<FeedbackFormResult>` is intentionally generic — any API implementation can be wrapped to match it.
- **Message display styles**: the existing `.error-message`/`.success-message` classes in UserManagement have NO corresponding SCSS definitions. The FeedbackModal must define its own BEM-scoped message styles (following `DeleteConfirmationModal`'s `__error` pattern). Do NOT depend on non-existent global message classes.
- **ConfigPage test complexity**: existing tests mock `adminUserApi`. Adding FeedbackModal tests may require additional arrangement but the modal is self-contained so ConfigPage tests stay focused on integration.
- **Native `<dialog>` in jsdom**: `HTMLDialogElement.prototype.showModal` must be spied/mocked in tests (matching `EntityFormModal.test.tsx` pattern — already proven in this codebase).

## Ready for Proposal

**Yes**. The exploration confirms the approach is sound, all patterns are established in the codebase (EntityFormModal, DeleteConfirmationModal, Input atom), the contract surface from CORTEXDIST-26 is understood, and the component placement follows existing conventions. The orchestrator should proceed to `sdd-propose`.
