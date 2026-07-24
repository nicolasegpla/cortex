# Tasks: Support Feedback Modal

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~750 (Textarea ~190, FeedbackModal ~540, barrels ~4, ConfigPage ~10) |
| 400-line budget risk | High |
| 800-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | single PR (size:exception accepted at 800-line budget) |
| Delivery strategy | single-pr (800-line exception) |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Textarea + FeedbackModal + ConfigPage wiring (single PR, 800-line exception) | PR 1 | `pnpm test Textarea FeedbackModal ConfigPage` | N/A (UI-only; manual smoke "Ayuda y soporte" → submit → close) | Revert `<FeedbackModal>` render in `ConfigPage.tsx`; trigger button (CORTEXDIST-26) reverts to inert-but-wired; atom/organism files deleted independently |

## Phase 1: Scaffolding

- [x] 1.1 Create `Textarea/textarea.scss` (mirror `input.scss`, BEM `textarea-field*`, `min-height: 120px; resize: vertical;`)
- [x] 1.2 Create `Textarea/index.ts` + `FeedbackModal/FeedbackModal.scss` + `FeedbackModal/index.ts` (barrel + BEM `feedback-modal__*`, error `$color-feedback-error-text`, success icon `$color-accent-primary`)

## Phase 2: Textarea Atom — RED (4 tests)

- [x] 2.1 Create `Textarea.test.tsx` with 4 RED tests: #1 `getByLabelText`, #2 `required`, #3 placeholder, #4 `name`

## Phase 3: Textarea Atom — GREEN

- [x] 3.1 Implement `Textarea.tsx` (extends `TextareaHTMLAttributes<HTMLTextAreaElement>`, `label` required, optional `showRequiredAsterisk`, `id ?? name ?? slug(label)`; no `endAdornment`)
- [x] 3.2 Add Textarea barrel to `atoms/index.ts`
- [x] 3.3 Verify `pnpm test Textarea` 4/4 GREEN

## Phase 4: FeedbackModal — RED (16 tests)

- [x] 4.1 Create `FeedbackModal.test.tsx` with 16 RED tests (#5-20 per design.md testing table): render/labels/options; close-via-button/Escape-topmost/Escape-nested/backdrop-click/inside-click; empty-submit validation; valid-submit payload; submitting aria-busy+spinner+disabled; success hide-form+Cerrar; success-Cerrar→onClose; error role=status+preserved text; Cancelar→onClose
- [x] 4.2 `vi.mock('@/shared/modalUtils', { getTopmostModal: vi.fn() })`; spy `showModal` to set `open` (EntityFormModal pattern)

## Phase 5: FeedbackModal — GREEN

- [x] 5.1 Implement `FeedbackModal.tsx`: native `<dialog>` + focus restoration (copy pattern from `EntityFormModal.tsx`); `useState` for fields + `status` (idle|submitting|success|error); `onCancel` with `getTopmostModal` guard; `onClick={handleBackdropClick}` (`target===currentTarget && !isSubmitting`); props `isOpen`/`onClose`/`onSubmit`; render `Select`/`Input`/`Textarea` + `Button`; `role="status"` region (state≠IDLE); `role="alert"` per empty field; `aria-busy` while submitting
- [x] 5.2 Add FeedbackModal barrel to `organisms/index.ts`
- [x] 5.3 Verify `pnpm test FeedbackModal` 16/16 GREEN

## Phase 6: ConfigPage Integration — RED (3 tests)

- [x] 6.1 Add 3 RED tests to `ConfigPage.test.tsx`: #21 trigger opens modal, #22 close closes, #23 coexists with CreateUser (Escape on Feedback closes only Feedback)

## Phase 7: ConfigPage Integration — GREEN

- [x] 7.1 Wire `<FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} onSubmit={() => Promise.resolve({ success: true, message: 'Gracias por tu feedback.' })} />` in `ConfigPage.tsx` (top-layer `<dialog>` independent of DOM position; stub is inert)
- [x] 7.2 Verify `pnpm test ConfigPage` 13/13 GREEN (10 existing + 3 new)

## Phase 8: Regression + Verification

- [x] 8.1 Full suite: `pnpm test` all GREEN (54 files, 547/547 tests)
- [x] 8.2 Typecheck + build: `pnpm build` zero errors
- [x] 8.3 Diff-stat guard: `git diff --stat` ≤800 lines — 858 changed lines (806 new + 52 modified), over by 58 (+7%). **size:exception APPROVED by maintainer (2026-07-23)** — largest reducible block was `feedback-modal__close` SCSS duplicated from EntityFormModal; maintainer accepted the exception rather than a shared-modal-style refactor that design placed out of scope.

## Phase 9: Review Remediation (2026-07-23)

- [x] 9.1 Guard Escape during SUBMITTING: `handleDialogCancel` now returns without calling `onClose()` when `isSubmitting` (keeps `preventDefault`), matching close/Cancelar/backdrop guards. Prevents text loss mid-submit and stale-state-on-reopen.
- [x] 9.2 Document inert stub: comment above `<FeedbackModal>` wiring in `ConfigPage.tsx` noting onSubmit is intentional pending CORTEXDIST-27.
- [x] 9.3 Comment backdrop technique in `FeedbackModal.tsx` (native `<dialog>` surfaces backdrop clicks on the dialog element; `target === currentTarget` = backdrop).
- [x] 9.4 New test: whitespace-only ('   ') subject + message → both `role="alert"` shown, `onSubmit` NOT called (`.trim().length === 0`).
- [x] 9.5 New test: Escape during SUBMITTING (deferred `onSubmit` promise) does NOT call `onClose`.
- [x] 9.6 Textarea asterisk tests mirroring `Input.test.tsx`: shown when `required && showRequiredAsterisk`; hidden when not required or prop false (3 tests).
- [x] 9.7 Verify: focused `pnpm test FeedbackModal Textarea ConfigPage` 38/38 GREEN; full suite 552/552 GREEN (54 files, 547 + 5 new).

## Phase 10: Verify Remediation Round 2 (2026-07-23)

- [x] 10.1 Spec correction (documented): `configuration-tabs/spec.md` close scenario no longer requires the modal to "unmount"; it now asserts the observable contract (no accessible dialog role after close + internal state reset for the next open), aligned to the approved design decision "Persistent isOpen consumer". Implementation unchanged.
- [x] 10.2 New test: `onSubmit` REJECTS (not `{success:false}`) → generic error in `role="status"`, typed text preserved, submit re-enabled (covers `FeedbackModal.tsx:160-162`).
- [x] 10.3 New test: successful submit → Cerrar → reopen → fresh idle form (empty/default fields, no stale success message).
- [x] 10.4 New test: validation re-run — empty submit shows both `role="alert"`, correct fields, resubmit in the SAME instance → `onSubmit` called with the correct payload, success shown, alerts gone.
- [x] 10.5 Strengthened ConfigPage close test: asserts no dialog role after close AND reopen shows a fresh idle form (typed draft cleared).
- [x] 10.6 Verify: focused `pnpm test FeedbackModal Textarea ConfigPage` 41/41 GREEN (21 FeedbackModal + 7 Textarea + 13 ConfigPage); full suite 555/555 GREEN (54 files, 552 + 3 new).
- [x] 10.7 Persisted TDD Cycle Evidence table in Engram apply-progress (same topic_key, merged).
