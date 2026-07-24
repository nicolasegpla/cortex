# configuration-tabs Specification

## Purpose

Provide Configuration as a multi-panel shell for administrative settings.

## Requirements

### Requirement: Configuration supports role-aware tabs

The system MUST default to `Usuarios` tab and MUST show it only to `super_admin` users. The `Proveedores de modelos` tab MUST NOT appear. When no tabs are visible (non-super-admin), the system SHALL hide the nav sidebar.

(Previously: defaulted to `Proveedores de modelos`; no zero-tab fallback.)

#### Scenario: Super admin sees Usuarios only

- GIVEN a `super_admin` opens Configuration
- WHEN the page renders
- THEN only `Usuarios` is visible and active
- AND `Proveedores de modelos` is absent

#### Scenario: Non-admin sees no tabs

- GIVEN a non-super-admin opens Configuration
- WHEN the page renders
- THEN the nav sidebar is hidden and content renders directly

### Requirement: Support entry is an accessible interactive button

The "Ayuda y soporte" entry in the configuration nav footer MUST render as a `<button>` element with `aria-label="Abrir ayuda y soporte"`. It MUST NOT carry `aria-hidden`. The button MUST be focusable via Tab and activatable via Enter and Space.

#### Scenario: Support entry renders as accessible button

- GIVEN the configuration page is rendered
- WHEN the DOM is inspected
- THEN the "Ayuda y soporte" element has button role
- AND has accessible name "Abrir ayuda y soporte"
- AND does NOT have `aria-hidden`

#### Scenario: Support entry accepts keyboard activation

- GIVEN the support entry button is focused via Tab
- WHEN the user presses Enter or Space
- THEN the button's activation handler fires

### Requirement: Support entry activation signals feedback intent

Activating the "Ayuda y soporte" button SHALL transition the feedback-open state to `true`.

#### Scenario: Clicking support entry opens feedback state

- GIVEN the configuration page is rendered
- WHEN the user clicks or keyboard-activates the "Ayuda y soporte" button
- THEN the feedback-open state is set to `true`

### Requirement: Support entry provides hover and focus visual feedback

The support entry button SHALL visually respond to hover and focus states while preserving its existing position, border-top separation, and muted color.

#### Scenario: Support entry shows hover and focus indicators

- GIVEN the support entry button is visible in the nav footer
- WHEN the user hovers or Tab-focuses the button
- THEN a visual indicator appears (cursor, background, or color change)
- AND the button's position and border-top are preserved

### Requirement: ConfigPage renders FeedbackModal when feedback is open

The ConfigPage MUST render `<FeedbackModal>` consuming `isFeedbackOpen` from local state. The modal MUST receive `isOpen={isFeedbackOpen}`, `onClose={() => setIsFeedbackOpen(false)}`, and a stub `onSubmit` callback (real API deferred to CORTEXDIST-27).

#### Scenario: FeedbackModal opens when isFeedbackOpen is true

- GIVEN the "Ayuda y soporte" button sets `isFeedbackOpen` to `true`
- WHEN ConfigPage re-renders
- THEN `<FeedbackModal>` is rendered with `isOpen={true}`

#### Scenario: FeedbackModal close resets feedback state

<!-- Wording correction (2026-07-23): the previous wording required the modal to "unmount".
     That contradicted the approved design decision "Persistent isOpen consumer" (design.md),
     which deliberately follows the house pattern of an always-mounted native <dialog> driven
     by isOpen (same as EntityFormModal). The scenario now asserts the OBSERVABLE contract
     instead of the implementation detail. Implementation unchanged. -->

- GIVEN FeedbackModal is open in ConfigPage
- WHEN the modal calls `onClose`
- THEN `isFeedbackOpen` transitions to `false`, no accessible dialog is exposed (a dialog role query finds none), AND internal form state is reset so the next open presents a fresh idle form
