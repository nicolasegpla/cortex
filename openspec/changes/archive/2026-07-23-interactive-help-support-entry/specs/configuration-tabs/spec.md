# Delta for configuration-tabs

## ADDED Requirements

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
