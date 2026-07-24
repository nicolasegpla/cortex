# Proposal: Support Feedback Modal

## Intent

Users need a way to report bugs, request improvements, or suggest new features from within the app. The "Ayuda y soporte" button (CORTEXDIST-26) exists but has no consumer — this change delivers the FeedbackModal organism that opens from that button, collects structured feedback, and manages the full submit lifecycle (idle → submitting → success/error).

## Scope

### In Scope
- New `FeedbackModal` organism (native `<dialog>`, follows EntityFormModal pattern)
- New `Textarea` atom (follows Input atom BEM structure)
- Form fields: request type (select), subject (input), message (textarea)
- Client validation: subject and message required, inline error via `role="alert"`
- State machine: IDLE → SUBMITTING → SUCCESS | ERROR (error preserves typed text)
- `onSubmit` callback boundary: `(payload: FeedbackPayload) => Promise<FeedbackFormResult>` — stub for now, CORTEXDIST-27 wires real API
- ConfigPage wiring: render `<FeedbackModal isOpen={isFeedbackOpen} onClose={...} onSubmit={...} />`
- Strict TDD: RED → GREEN for Textarea atom, FeedbackModal, ConfigPage integration

### Out of Scope
- Real HTTP API call (CORTEXDIST-27)
- Backend feedback endpoint
- Feedback history/list UI
- File attachments or screenshots

## Capabilities

### New Capabilities
- `feedback-modal`: FeedbackModal organism — native `<dialog>` form with type/subject/message fields, client validation, submit lifecycle (idle/submitting/success/error), `onSubmit` callback boundary
- `textarea-atom`: Textarea atom — reusable textarea input following Input atom BEM pattern (`textarea-field`, `textarea-field__label`, `textarea-field__control`)

### Modified Capabilities
- `configuration-tabs`: ConfigPage renders `<FeedbackModal>` consuming `isFeedbackOpen`/`setIsFeedbackOpen`; modal owns its own form state and reset on close

## Approach

New `FeedbackModal` organism using native `<dialog>` (matching EntityFormModal/DeleteConfirmationModal): `showModal()`/`close()`, focus restoration, `getTopmostModal()` guard for nested modals, `aria-busy` spinner overlay. New `Textarea` atom mirroring Input atom's BEM + SCSS variables. ConfigPage passes `isOpen`/`onClose`/`onSubmit` — owns only open/close state. Submit boundary returns `{ success, message }` so the modal handles its own UI transitions without the page knowing the API contract.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-frontend/src/presentation/components/organisms/FeedbackModal/` | New | FeedbackModal.tsx, FeedbackModal.scss, FeedbackModal.test.tsx, index.ts |
| `cortex-frontend/src/presentation/components/atoms/Textarea/` | New | Textarea.tsx, textarea.scss, Textarea.test.tsx, index.ts |
| `cortex-frontend/src/presentation/components/organisms/index.ts` | Modified | Add FeedbackModal barrel export |
| `cortex-frontend/src/presentation/components/atoms/index.ts` | Modified | Add Textarea barrel export |
| `cortex-frontend/src/presentation/pages/ConfigPage.tsx` | Modified | Wire `<FeedbackModal>` with stub `onSubmit` |
| `cortex-frontend/src/presentation/pages/ConfigPage.test.tsx` | Modified | Integration tests: open/close, nested modal guard |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CORTEXDIST-27 API contract may differ from `onSubmit` boundary | Low | Callback signature is intentionally generic — any API wraps to `Promise<FeedbackFormResult>` |
| `HTMLDialogElement.showModal` not available in jsdom | Low | Already solved in EntityFormModal.test.tsx — copy spy/mock pattern |
| Textarea atom scope creep | Low | Strict 4-file atom matching Input pattern exactly; no extra features |

## Rollback Plan

Revert the ConfigPage wiring (remove `<FeedbackModal>` render) — the trigger button remains inert (state transitions but no consumer). No data migration, no shared state changes. The new organism and atom files can be deleted independently.

## Dependencies

- CORTEXDIST-26 (completed): `isFeedbackOpen` state + trigger button in ConfigPage
- CORTEXDIST-27 (future): real feedback API — consumes `onSubmit` boundary defined here

## Success Criteria

- [ ] FeedbackModal opens from "Ayuda y soporte" button, closes via close button, Escape, and backdrop click
- [ ] All three fields render with correct labels and `required` attributes
- [ ] Empty submit shows inline validation error (`role="alert"`) without calling `onSubmit`
- [ ] Successful submit shows confirmation message, form hidden, close button available
- [ ] Failed submit shows error message, typed text preserved, submit re-enabled
- [ ] Nested modal guard works (Escape only closes topmost dialog)
- [ ] Textarea atom renders with label, supports `required`, `placeholder`, `name` forwarding
- [ ] All tests pass (Textarea: 4 tests, FeedbackModal: 13 tests, ConfigPage integration: 3 tests)
