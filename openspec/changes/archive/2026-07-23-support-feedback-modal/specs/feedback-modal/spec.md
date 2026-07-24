# feedback-modal Specification

## Purpose

Modal form for collecting structured user feedback (bugs, improvements, feature requests) via native `<dialog>`, supporting a full submit lifecycle: idle, submitting, success, and error states.

## Requirements

### Requirement: Feedback modal opens and closes via isOpen prop

The FeedbackModal MUST render when `isOpen` is `true` using native `<dialog>` `showModal()`, and MUST call `onClose` on external dismissals (close button, Escape, backdrop click). The modal MUST expose `role="dialog"` and `aria-modal="true"`.

#### Scenario: Modal opens on isOpen=true

- GIVEN `isOpen` is `true`
- WHEN the component mounts
- THEN the dialog is visible with `aria-modal="true"`

#### Scenario: Modal closes via close button

- GIVEN the modal is open
- WHEN the user clicks the close button
- THEN `onClose` is called

#### Scenario: Modal closes via Escape

- GIVEN the modal is the topmost dialog
- WHEN the user presses Escape
- THEN `onClose` is called

#### Scenario: Escape ignored when another modal is on top

- GIVEN another modal is open on top of FeedbackModal
- WHEN the user presses Escape
- THEN the topmost modal closes; FeedbackModal `onClose` is NOT called

### Requirement: Feedback modal renders all form fields

The modal MUST render: a `<select>` for request type (options: bug, mejora, nueva función, otro), an `<input>` for subject, and a `<textarea>` for message. All fields MUST have `required`.

#### Scenario: Form fields are present

- GIVEN the modal is open
- WHEN rendered
- THEN "Tipo de solicitud", "Asunto", and "Mensaje" labeled fields are present with `required`

### Requirement: Client validation prevents empty submits

Submitting with empty subject or message MUST NOT call `onSubmit`. An inline error with `role="alert"` SHALL appear near the empty field. Validation MUST re-run on each submit attempt.

#### Scenario: Empty form shows validation error

- GIVEN the modal is open with all fields empty
- WHEN the user clicks "Enviar"
- THEN `role="alert"` error is displayed and `onSubmit` is NOT called

### Requirement: Submit lifecycle transitions through loading, success, and error

On submit, the modal MUST enter SUBMITTING state: fields disabled, `aria-busy="true"`, spinner visible. On `onSubmit` resolving with `{ success: true }`: form is hidden, confirmation message and close button shown. On `onSubmit` resolving with `{ success: false }` or rejecting: error message displayed, typed text preserved, submit re-enabled. On close during SUCCESS state: `onClose` called, state reset.

#### Scenario: Successful submit shows confirmation

- GIVEN `onSubmit` resolves with `{ success: true, message: "Gracias" }`
- WHEN the promise resolves
- THEN the form is hidden, confirmation message "Gracias" is shown, and a close button is available

#### Scenario: Failed submit preserves typed text

- GIVEN user typed "Test subject" and `onSubmit` resolves with `{ success: false, message: "Error de red" }`
- WHEN the error occurs
- THEN the subject field value is still "Test subject", error message "Error de red" is shown, and "Enviar" is re-enabled

### Requirement: Submit boundary passes typed payload and consumes result

The `onSubmit` callback SHALL receive `{ type, subject, message }` and MUST return `Promise<{ success: boolean; message: string }>`. The modal SHALL NOT perform HTTP calls directly.

#### Scenario: onSubmit receives correct payload on submit

- GIVEN user selects "bug", types "Crash" as subject, "Steps" as message
- WHEN "Enviar" is clicked (fields valid)
- THEN `onSubmit` is called with `{ type: 'bug', subject: 'Crash', message: 'Steps' }`
