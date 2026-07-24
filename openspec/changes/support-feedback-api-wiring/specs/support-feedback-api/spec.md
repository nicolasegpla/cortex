# support-feedback-api Specification

## Purpose

Frontend service wrapping `POST /support/feedback` via the existing `apiClient`, enforcing the `{type, subject, message}` payload contract, and mapping network/server errors to `FeedbackFormResult` for consumption by `FeedbackModal`.

## Requirements

### Requirement: Service sends exact payload to backend

The `submitFeedback` function MUST call `apiClient.post('/support/feedback', payload)` with exactly `{type, subject, message}`. The `FeedbackPayload` type SHALL enforce these three string fields.

#### Scenario: Valid payload reaches backend

- GIVEN `submitFeedback({ type: 'bug', subject: 'Crash', message: 'Steps to reproduce' })`
- WHEN the function executes
- THEN `apiClient.post` is called with endpoint `'/support/feedback'` and the exact three-key payload

### Requirement: Auth token is attached automatically

`submitFeedback` SHALL rely on `apiClient.post` to attach the Bearer token from `useAuthStore`. The service SHALL NOT manage tokens directly.

#### Scenario: Authenticated request includes token

- GIVEN a valid session exists in `useAuthStore`
- WHEN `submitFeedback` calls `apiClient.post`
- THEN the request includes an `Authorization: Bearer <token>` header

### Requirement: Success response mapped to positive result

On a 200 response, `submitFeedback` MUST resolve to `{success: true, message}` where `message` is the server's confirmation text.

#### Scenario: Backend confirms submission

- GIVEN the backend returns `{success: true, message: "Mensaje enviado correctamente"}`
- WHEN `apiClient.post` resolves
- THEN `submitFeedback` returns `{success: true, message: "Mensaje enviado correctamente"}`

### Requirement: Network errors produce user-friendly Spanish message

On a `TypeError` (fetch failure, no connection), `submitFeedback` MUST return `{success: false, message: "No se pudo conectar con el servidor. Verificá tu conexión."}` rather than throwing or exposing raw network error text.

#### Scenario: Network unreachable

- GIVEN the backend is unreachable
- WHEN `apiClient.post` throws a `TypeError`
- THEN `submitFeedback` returns `{success: false, message: "No se pudo conectar con el servidor. Verificá tu conexión."}`

### Requirement: Server errors pass through backend's Spanish message

On a non-TypeError `Error`, `submitFeedback` MUST return `{success: false, message: error.message}`. Backend-curated Spanish messages SHALL pass through unmodified.

#### Scenario: Backend 422 with detail

- GIVEN the backend returns 422 with `{detail: "El tipo de solicitud no es válido"}`
- WHEN `apiClient.post` throws `Error("El tipo de solicitud no es válido")`
- THEN `submitFeedback` returns `{success: false, message: "El tipo de solicitud no es válido"}`

### Requirement: Payload excludes identity and context fields

`submitFeedback` MUST NOT include `email`, `role`, or `currentUrl` in the payload. The backend schema has `extra="forbid"` — any extra field causes a 422 rejection. Identity is derived from the JWT server-side.

#### Scenario: Payload is exactly three fields

- GIVEN any call to `submitFeedback`
- WHEN the payload is serialized
- THEN the JSON body contains only `type`, `subject`, and `message` keys

### Requirement: ConfigPage wires submitFeedback to FeedbackModal

`ConfigPage` SHALL import `submitFeedback` from `supportApi` and pass it as `onSubmit` to `FeedbackModal`, replacing the inert `() => Promise.resolve(...)` stub at the injection point documented under CORTEXDIST-27.

#### Scenario: FeedbackModal receives real service

- GIVEN ConfigPage renders FeedbackModal
- WHEN the user submits valid feedback through the modal
- THEN `submitFeedback` is called with the user's `{type, subject, message}` instead of a hardcoded stub
