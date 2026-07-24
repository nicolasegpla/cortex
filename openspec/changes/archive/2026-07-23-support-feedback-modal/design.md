# Design: Support Feedback Modal

## Technical Approach

Dedicated `FeedbackModal` organism + new `Textarea` atom. Modal follows the proven `EntityFormModal` / `DeleteConfirmationModal` native-`<dialog>` pattern; atom mirrors `Input` BEM. ConfigPage already owns `isFeedbackOpen` (CORTEXDIST-26) — this change adds the consumer: `<FeedbackModal isOpen={isFeedbackOpen} onClose={()=>setIsFeedbackOpen(false)} onSubmit={stub} />`. The modal owns form state + the IDLE→SUBMITTING→SUCCESS|ERROR lifecycle, exposing only `onSubmit` as the API boundary deferred to CORTEXDIST-27. Every transition is **DOM-observable** (`role="status"` region, `aria-busy`, `disabled`, success confirmation, preserved field values) so RTL asserts acceptance criteria without pseudo-state CSS — the jsdom lesson from the prior gate.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Submit boundary | `onSubmit: (p)=>Promise<FeedbackFormResult>` | Page stays API-agnostic; generic enough for any future API wrapper (proposal risk row) |
| State observability | `role="status"` region rendered only when state≠IDLE | RTL-assertable; forces explicit empty-state absence vs success/error text |
| Inline field validation | `role="alert"` per empty field | Matches house style (DeleteConfirmationModal `__error`) + proposal L70 |
| Submit disabled while submitting | `disabled` prop | RTL-assertable (`toBeDisabled()`); invisible alternatives rejected |
| Success shape | hide form, swap to confirmation + "Cerrar" | Matches DeleteConfirmationModal `success` branch; clarifies IDLE vs SUCCESS |
| Escape / nested guard | reuse `getTopmostModal()` | Proven in both existing modals; no new code (proposal L73) |
| Backdrop click → `onClose` | `onClick={handleBackdropClick}` on `<dialog>`: `if (event.target === event.currentTarget && !isSubmitting) onClose()` | Proposal L68 requires close via backdrop; native `<dialog>` surfaces backdrop as a click on the dialog element itself (target===dialog); DeleteConfirmationModal L55-59 is the house precedent; `!isSubmitting` guard prevents close mid-submit (mirrors `!isDeleting`) |
| Textarea BEM | mirror Input (`textarea-field*`) | Matches proposal; reusing a `form-field` refactor is out of scope |
| `onSubmit` stub | inert `Promise.resolve({success:true,...})` in ConfigPage | Ships working-but-inert for CORTEXDIST-27 swap; never calls HTTP |

## Data Flow

```
ConfigPage owns isFeedbackOpen/setIsFeedbackOpen (CORTEXDIST-26). Renders
<FeedbackModal isOpen onClose={()=>setIsFeedbackOpen(false)} onSubmit={stub} />.
FeedbackModal internal status: idle ─valid submit─→ onSubmit(payload) ─→ {success,message}
   submitting (aria-busy + spinner, fields disabled) ─→ success (form hidden, "Cerrar")
                                                    └→ error (role="status", text preserved, re-enabled) ─resubmit─→ submitting
Close paths → onClose: close button (Cancelar/Cerrar formulario), Escape (topmost guard),
   backdrop click (target===dialog && !isSubmitting). onClose ─→ idle on next reopen (useEffect cleanup).
```

## File Changes

| File | Action | Description |
|---|---|---|
| `cortex-frontend/src/presentation/components/atoms/Textarea/Textarea.tsx` | Create | Mirror `Input.tsx`: `extends TextareaHTMLAttributes`, `label` required, optional `showRequiredAsterisk`. BEM `textarea-field`, `textarea-field__label`, `textarea-field__label-row`, `textarea-field__required`, `textarea-field__control`. ID = `id ?? name ?? slug(label)`. No `endAdornment` (out of scope). |
| `cortex-frontend/src/presentation/components/atoms/Textarea/textarea.scss` | Create | Copy `input.scss` block structure; `.textarea-field__control` uses `min-height: 120px; resize: vertical;` plus same border/radius/focus variables. |
| `cortex-frontend/src/presentation/components/atoms/Textarea/Textarea.test.tsx` | Create | 4 RED tests (see Test Plan). |
| `cortex-frontend/src/presentation/components/atoms/Textarea/index.ts` | Create | `export { Textarea } from './Textarea';` |
| `cortex-frontend/src/presentation/components/atoms/index.ts` | Modify | Add `export { Textarea } from './Textarea';` |
| `cortex-frontend/src/presentation/components/organisms/FeedbackModal/FeedbackModal.tsx` | Create | Native `<dialog>`, `useRef` + `useId` + `wasOpen` + focus restoration copied from `EntityFormModal`. Internal `useState` for `type/subject/message` and `status`. `onCancel` with `getTopmostModal()` guard. `onClick={handleBackdropClick}` on `<dialog>` (target===currentTarget && !isSubmitting → onClose). Props: `isOpen`, `onClose`, `onSubmit`. Renders `Select`/`Input`/`Textarea` atoms; "Enviar"/"Cancelar"/"Cerrar" buttons via existing `Button` atom. `role="status"` region; `role="alert"` per empty field. `aria-busy` while submitting. |
| `cortex-frontend/src/presentation/components/organisms/FeedbackModal/FeedbackModal.scss` | Create | BEM `feedback-modal__content/__header/__body/__actions/__overlay/__spinner/__field-error/__status/__status--error/__success-icon`. Error uses `$color-feedback-error-text`; success icon uses `$color-accent-primary` (no success token exists); reuse `vars.$space-*`, `$radius-md`, `$color-border-divider`, `$color-surface-primary`, `$color-surface-elevated`. |
| `cortex-frontend/src/presentation/components/organisms/FeedbackModal/FeedbackModal.test.tsx` | Create | 16 RED tests; mock `@/shared/modalUtils`; spy `HTMLDialogElement.prototype.showModal` to set `open` (matches `EntityFormModal.test.tsx`). |
| `cortex-frontend/src/presentation/components/organisms/FeedbackModal/index.ts` | Create | Barrel export. |
| `cortex-frontend/src/presentation/components/organisms/index.ts` | Modify | Add `export { FeedbackModal } from './FeedbackModal';` |
| `cortex-frontend/src/presentation/pages/ConfigPage.tsx` | Modify | Render `<FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} onSubmit={() => Promise.resolve({ success: true, message: 'Gracias por tu feedback.' })} />` inside the page tree (top-layer `<dialog>` is independent of DOM position). Stub is inert (no HTTP). |
| `cortex-frontend/src/presentation/pages/ConfigPage.test.tsx` | Modify | 3 RED integration tests (existing 4 pass unchanged). |

## Interfaces / Contracts

```ts
// FeedbackModal.tsx
export const FEEDBACK_TYPES = {
    bug: 'bug', mejora: 'mejora', nueva_funcion: 'nueva_funcion', otro: 'otro',
} as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[keyof typeof FEEDBACK_TYPES];
export interface FeedbackPayload { type: FeedbackType; subject: string; message: string; }
export interface FeedbackFormResult { success: boolean; message: string; }
export interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: FeedbackPayload) => Promise<FeedbackFormResult>;
}

// Textarea.tsx
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    showRequiredAsterisk?: boolean;
}
```

## Testing Strategy (Strict TDD — RED first)

RED = 23 tests; each row maps to a proposal success criterion (L66-74). FeedbackModal count grew from the proposal's stated 13 to 16 (+2 backdrop, +1 type-options) to close the gatekeeper's blocking point + non-blocking gap.

### Textarea Atom (4 — proposal L74)
| # | Test | Asserts | How |
|---|---|---|---|
| 1 | renders a labelled textarea | `getByLabelText('Mensaje')` resolves | RTL render |
| 2 | respects `required` | control `toBeRequired()` | attribute assert |
| 3 | shows placeholder | `getByPlaceholderText` resolves | RTL |
| 4 | forwards `name` | `toHaveAttribute('name','message')` | RTL |

### FeedbackModal (16 — numbered 5–20; proposal L66-73)
| # | Test | Asserts | How |
|---|---|---|---|
| 5 | hidden when `isOpen={false}` | `queryByRole('dialog')` null | RTL |
| 6 | renders dialog titled "Ayuda y soporte" with `aria-modal="true"` when open | `getByRole('dialog',{name})` + attribute assert | spy `showModal` |
| 7 | renders Tipo/Asunto/Mensaje fields with labels | `getByLabelText('Tipo de solicitud'\|'Asunto'\|'Mensaje')` | RTL |
| 8 | type select renders all four options: bug / mejora / nueva función / otro (Plane criterion) | `getByRole('option',{name:'bug'})`, `'mejora'`, `'nueva función'`, `'otro'`; `getAllByRole('option')` length 4 | RTL |
| 9 | close button → `onClose` | `user.click(getByRole('button',{name:'Cerrar formulario'}))` | userEvent |
| 10 | Escape → `onClose` when our dialog is topmost | `user.keyboard('{Escape}')`, mock `getTopmostModal` returns our dialog | userEvent |
| 11 | Escape ignored when another modal is on top (proposal L73) | `getTopmostModal` mock returns foreign dialog; Escape → onClose NOT called | userEvent |
| 12 | backdrop click (target===dialog element) → `onClose` (proposal L68) | `fireEvent.click(dialog, { target: dialog })`; `expect(onClose).toHaveBeenCalled()` — native `<dialog>` surfaces backdrop as click on dialog itself | RTL `fireEvent` + target assert |
| 13 | click inside dialog content → `onClose` NOT called | `fireEvent.click(fieldset, { target: fieldset })`; `expect(onClose).not.toHaveBeenCalled()` | RTL `fireEvent` + target assert |
| 14 | empty submit shows `role="alert"` validation and does NOT call `onSubmit` (proposal L70) | `user.click('Enviar')` → `getByRole('alert')`; `expect(onSubmit).not.toHaveBeenCalled()` | userEvent |
| 15 | valid submit calls `onSubmit` with correct payload (proposal L69) | type fields, click Enviar; `toHaveBeenCalledWith({type:'bug',subject:...,message:...})` | userEvent + mock `onSubmit` resolving success |
| 16 | submitting shows `aria-busy`, spinner "Enviando...", submit disabled, fields disabled | `onSubmit` returns never-resolving promise; assert `aria-busy="true"`, "Enviando...", submit `toBeDisabled()`, all fields `toBeDisabled()` | RTL + pending promise |
| 17 | success state hides form, shows confirmation, "Cerrar" available (proposal L71) | resolve `onSubmit` success; `queryByLabelText('Asunto')` gone; `getByText(/gracias/i)`; `getByRole('button',{name:'Cerrar'})` present | userEvent |
| 18 | success "Cerrar" → `onClose` | click "Cerrar"; `expect(onClose).toHaveBeenCalled()` | userEvent |
| 19 | error state shows `role="status"` message, preserves typed text, re-enables submit (proposal L72) | `onSubmit` resolves `{success:false,message:'...'}`; `subjectInput` value still 'Test'; `getByRole('status')`; submit `not.toBeDisabled()` | userEvent |
| 20 | "Cancelar" → `onClose` (IDLE secondary action) | `user.click(getByRole('button',{name:'Cancelar'}))` | userEvent |

### ConfigPage Integration (3 — numbered 21–23; proposal L66,73)
| # | Test | Asserts | How |
|---|---|---|---|
| 21 | trigger click opens modal | `user.click(supportButton)` → `getByRole('dialog',{name:'Ayuda y soporte'})` | userEvent |
| 22 | close button closes modal | open → click 'Cerrar formulario' → `queryByRole('dialog')` null | userEvent |
| 23 | FeedbackModal coexists with CreateUser modal (nested guard) | open CreateUser modal then Feedback; both dialogs in DOM; Escape on Feedback closes only Feedback (topmost guard) | userEvent + `getTopmostModal` real query |

**jsdom lesson applied**: tests never assert pseudo-state CSS; every criterion is DOM-text/attribute/role based. `showModal`/`close` are spied (`EntityFormModal.test.tsx` pattern). `getTopmostModal` is mocked via `vi.mock('@/shared/modalUtils')`.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required (no data, no API). Rollback = remove `<FeedbackModal>` render in `ConfigPage.tsx`; the trigger button (CORTEXDIST-26) reverts to inert-but-wired (it flips `isFeedbackOpen` and `aria-expanded` with no consumer). The new atom/organism files can be deleted independently.

## Open Questions

- [ ] None blocking. CORTEXDIST-27 will swap the `onSubmit` stub for the real API; the boundary signature is fixed here and intentionally generic.