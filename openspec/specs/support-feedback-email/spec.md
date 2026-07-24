# support-feedback-email Specification

## Purpose

Rich HTML email template, `reply_to` header, and user-context wiring for the `send_support_feedback` seam defined in `support-feedback`. All delivery lifecycle concerns (authentication, payload validation, unconfigured guard, 503/502 errors, logging) remain owned by the `support-feedback` spec.

## Requirements

### Requirement: Seam Signature

`EmailService.send_support_feedback` MUST accept `user_email: str` and `user_id: str` in addition to `feedback_type`, `subject`, and `message`. The router SHALL extract `current_user.email` and `current_user.id` from the authenticated session and pass them to the seam.

#### Scenario: Seam called with user context

- GIVEN authenticated user with `email="user@test.com"` and `id="a1b2c3d4-..."` AND valid feedback payload
- WHEN `POST /support/feedback` succeeds
- THEN `send_support_feedback` is called with `user_email="user@test.com"` AND `user_id="a1b2c3d4-..."`

### Requirement: Reply-To Header

The Resend payload MUST set `reply_to` to the authenticated user's email. The `from` address MUST be `RESEND_FROM_EMAIL` (the verified Resend sender). The user's email SHALL NOT be used as `from`.

#### Scenario: reply_to wired, from is verified sender

- GIVEN `send_support_feedback` is called with `user_email="user@test.com"`
- WHEN the Resend `Emails.send` payload is built
- THEN `payload["reply_to"]` equals `"user@test.com"` AND `payload["from"]` equals `settings.resend_from_email`

#### Scenario: reply_to is NOT from

- GIVEN `user_email="user@test.com"` AND `settings.resend_from_email="noreply@cortex.local"`
- WHEN the Resend payload is built
- THEN `payload["from"]` is `"noreply@cortex.local"` (NOT `"user@test.com"`)

### Requirement: Rich HTML Template

The email HTML body MUST include: feedback type label, user-provided subject, user-provided message, submitting user's email and ID, and a server-generated UTC ISO-8601 timestamp. All user-provided content MUST be HTML-escaped using `html.escape`. The subject MUST be sanitized of CR and LF characters before inclusion.

#### Scenario: Template contains all required sections

- GIVEN `send_support_feedback("bug", "Crash", "Details...", "u@t.com", "abc-123")` is called
- WHEN the HTML body is rendered
- THEN it contains: the feedback type label `"bug"`, the subject `"Crash"`, the message `"Details..."`, the user email `"u@t.com"`, the user ID `"abc-123"`, and an ISO-8601 UTC timestamp

#### Scenario: User content is HTML-escaped

- GIVEN `message` contains `<script>alert(1)</script>`
- WHEN the HTML body is rendered
- THEN the angle brackets are encoded as `&lt;script&gt;` (never interpreted as HTML tags)

#### Scenario: Subject CRLF sanitized

- GIVEN `subject` contains `\r\n` characters
- WHEN the email subject is built
- THEN `\r` and `\n` are replaced before inclusion

### Requirement: Escape Regression

The `message` escaping (`html.escape`) and `subject` CRLF sanitization from CORTEXDIST-29 MUST remain intact in the rich template. No raw user input SHALL appear in the HTML body.

#### Scenario: Generic HTML markup preserved as escaped

- GIVEN a message containing HTML markup (`<div>test</div>`)
- WHEN `send_support_feedback` builds the rich template
- THEN the HTML body contains escaped entities (`&lt;div&gt;`), not raw HTML tags from user input

### Requirement: ResendError Propagation at Service Boundary

When the Resend SDK raises `resend.exceptions.ResendError` during `send_support_feedback`, the service method MUST propagate the exception unchanged to the caller (no swallowing, no translation, no fallback return). The router's existing `except Exception` clause maps it to HTTP 502 with the Spanish detail message.

#### Scenario: ResendError from send_support_feedback is propagated

- GIVEN `resend.Emails.send` raises `ResendError(code=422, error_type='invalid_parameter', message='Invalid email')`
- WHEN `send_support_feedback` is called with the five required arguments (feedback_type, subject, message, user_email, user_id)
- THEN the `ResendError` propagates unchanged to the caller (no catch, no translation, no fallback return)
