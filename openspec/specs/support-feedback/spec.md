<!-- Correction 2026-07-23: aligned to the corrected design (orchestrator directive, parent CORTEXDIST-32).
     The `send_support_feedback` seam resolves the recipient INTERNALLY from `settings.support_to_email`
     (default stalloy@stalloy.io). The router calls it with NO `to_email` argument; `current_user.email`
     is used only for logging/audit identity, never as the email recipient. -->

# support-feedback Specification

## Purpose

Authenticated support feedback endpoint. Users submit feedback via `POST /support/feedback`; the backend validates, delegates delivery to `EmailService.send_support_feedback`, and returns success/error. Email body formatting is owned by CORTEXDIST-30.

## Requirements

### Requirement: SupportFeedbackRequest Schema

The system MUST validate feedback payloads against a Pydantic 2 model with strict constraints.

| Field | Type | Constraint |
|-------|------|------------|
| `type` | `Literal["bug","mejora","nueva_funcion","otro"]` | Required |
| `subject` | `str` | Required, `min_length=1`, `max_length=200` |
| `message` | `str` | Required, `min_length=1`, `max_length=5000` |
| Extra fields | — | `extra="forbid"` |

#### Scenario: Valid request accepted

- GIVEN payload `{type: "bug", subject: "Crash on login", message: "Steps to reproduce..."}`
- WHEN validated via `SupportFeedbackRequest.model_validate(payload)`
- THEN schema accepts without error

#### Scenario: Extra field rejected

- GIVEN payload includes unknown field `email: "x@y.com"` alongside required fields
- WHEN validated via `SupportFeedbackRequest.model_validate(payload)`
- THEN `ValidationError` is raised

#### Scenario: All four type values accepted individually

- GIVEN payloads with `type` values `"bug"`, `"mejora"`, `"nueva_funcion"`, `"otro"`
- WHEN each is validated
- THEN all pass; `"invalid"` type raises `ValidationError`

### Requirement: Authentication

The `POST /support/feedback` endpoint MUST require a valid JWT via `get_current_user`. User identity and email MUST be derived from the authenticated session, never from the request payload.

#### Scenario: Unauthenticated returns 401

- GIVEN no `Authorization` header or an invalid/expired token
- WHEN `POST /support/feedback` is called
- THEN response is `401 Unauthorized`

#### Scenario: User email from session, not payload

- GIVEN authenticated user with `email="user@test.com"` AND `id="a1b2c3d4-..."` AND payload contains no email field
- WHEN `POST /support/feedback` succeeds
- THEN `send_support_feedback` is called with `user_email="user@test.com"` AND `user_id="a1b2c3d4-..."` AND no `to_email` argument; the recipient is resolved internally from `settings.support_to_email` (default `stalloy@stalloy.io`)

### Requirement: Payload Validation on POST

The endpoint MUST reject invalid payloads with `422 Unprocessable Entity`. Email service MUST NOT be invoked when validation fails.

#### Scenario: Empty subject returns 422

- GIVEN authenticated user AND payload with `subject: ""`
- WHEN `POST /support/feedback` is called
- THEN response is `422` AND `send_support_feedback` is NOT called

#### Scenario: Extra fields in payload returns 422

- GIVEN authenticated user AND payload includes an unknown field
- WHEN `POST /support/feedback` is called
- THEN response is `422`

### Requirement: Successful Feedback Submission

On valid payload and authentication, the endpoint SHALL delegate to `EmailService.send_support_feedback` and return `200` with `SupportFeedbackResponse` (`{success: bool, message: str}`).

#### Scenario: Valid feedback returns 200

- GIVEN authenticated user AND valid `{type, subject, message}` payload
- WHEN `POST /support/feedback` is called
- THEN response is `200` with `{success: true, message: "..."}`

#### Scenario: Email service called with correct arguments

- GIVEN authenticated user with `email="user@test.com"` AND `id="a1b2c3d4-..."` AND valid payload `{type: "bug", subject: "Issue title", message: "Details"}`
- WHEN `POST /support/feedback` succeeds
- THEN `send_support_feedback(feedback_type="bug", subject="Issue title", message="Details", user_email="user@test.com", user_id="a1b2c3d4-...")` is called (no `to_email` argument — the recipient is resolved internally from `settings.support_to_email`)

### Requirement: Email Service Seam

`EmailService` MUST expose a `send_support_feedback(feedback_type, subject, message, user_email, user_id) → dict` method that resolves the recipient internally from `settings.support_to_email` (default `stalloy@stalloy.io`). The `user_email` and `user_id` parameters carry the authenticated user's identity for template rendering and `reply_to` header; they are NOT used as the email recipient. When email is not configured, the endpoint MUST return `503 Service Unavailable`, following the existing `is_configured()` pattern.

#### Scenario: Email not configured returns 503

- GIVEN `EmailService.is_configured()` returns `False`
- WHEN `POST /support/feedback` is called
- THEN response is `503` with message indicating email service is not configured

#### Scenario: Email send failure returns 502

- GIVEN `send_support_feedback` raises an exception (e.g., `ResendError`)
- WHEN called via `POST /support/feedback`
- THEN response is `502 Bad Gateway`

### Requirement: Logging Policy

The system MUST log request receipt and outcome. It MUST NOT log `payload.message` content at any level.

#### Scenario: Success logged without message content

- GIVEN valid feedback submission is processed
- WHEN `POST /support/feedback` succeeds
- THEN `INFO` log includes feedback type, subject length, and user ID but NOT `payload.message` text

#### Scenario: Failure logged without message content

- GIVEN email delivery fails
- WHEN `POST /support/feedback` handles the failure
- THEN `WARNING` log includes error context but NOT `payload.message` text
