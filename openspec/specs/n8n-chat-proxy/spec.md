# n8n Chat Proxy Specification

## Purpose

Define the backend-mediated proxy that forwards authenticated chat requests from the Cortex frontend to a configured n8n webhook and maps the response to a stable JSON contract. The webhook URL is hidden from the browser; all traffic is mediated by the Cortex backend.

## Requirements

### Requirement: Authenticated n8n Chat Proxy Route

The system MUST expose `POST /chat/n8n` requiring a valid Supabase JWT (via `get_current_user`); unauthenticated requests MUST return `401`. The frontend MUST NOT call the n8n webhook directly — all traffic MUST be mediated by the Cortex backend.

#### Scenario: Authenticated user sends a chat message

- GIVEN an authenticated user with a valid Supabase JWT
- WHEN the frontend POSTs `{ message }` to `/chat/n8n`
- THEN the backend accepts the request and proxies it to the n8n webhook
- AND the response is returned to the frontend as JSON

#### Scenario: Unauthenticated request is rejected

- GIVEN a request to `/chat/n8n` with no or invalid JWT
- WHEN the request reaches the router
- THEN the backend returns `401` before calling n8n

### Requirement: n8n Proxy Payload Contract

The backend MUST send exactly `{ message, sessionId }` to the n8n webhook — no additional fields, no frontend-controlled passthrough. For MVP, `sessionId` MUST equal `current_user.id`.

#### Scenario: Exact payload is forwarded

- GIVEN an authenticated request with body `{ message: "hi" }` and user id `U1`
- WHEN the backend calls the n8n webhook
- THEN the outbound body is exactly `{ "message": "hi", "sessionId": "U1" }`

#### Scenario: Backend injects sessionId, not the frontend

- GIVEN the frontend sends `{ message }` without a `sessionId`
- WHEN the backend builds the outbound payload
- THEN `sessionId` is sourced from the authenticated user, never from the request body

### Requirement: Downstream n8n Webhook Call

The backend MUST call the n8n webhook with a normal HTTP POST and `Content-Type: application/json`. The outbound JSON body MUST remain exactly `{ message, sessionId }`; no token or additional fields are sent. The webhook URL MUST NOT appear in operational logs.

#### Scenario: Webhook call body

- GIVEN `N8N_CHAT_WEBHOOK_URL` is set
- WHEN the backend calls the n8n webhook
- THEN the request body is exactly `{ message, sessionId }`
- AND the request uses the configured timeout

### Requirement: n8n Response Mapping to Stable Frontend Contract

On a successful n8n response of shape `{ ok: true, answer: string }`, the backend MUST return a stable `200` JSON body `{ answer: string }` to the frontend. Any other n8n shape MUST be treated as a proxy error.

#### Scenario: Successful n8n answer

- GIVEN n8n returns `{ "ok": true, "answer": "do this" }`
- WHEN the backend maps the response
- THEN the frontend receives `200 { "answer": "do this" }`

#### Scenario: Malformed n8n response

- GIVEN n8n returns `{ "ok": false }` or a body without `answer`
- WHEN the backend validates the response
- THEN the backend returns `502` to the frontend and does not surface the raw n8n body

#### Scenario: n8n timeout

- GIVEN the n8n webhook does not respond within `N8N_CHAT_TIMEOUT_SECONDS`
- WHEN the request exceeds the timeout
- THEN the backend returns `504` to the frontend

#### Scenario: Upstream HTTP error

- GIVEN the n8n webhook responds with a non-2xx HTTP status
- WHEN the backend receives the response
- THEN the backend returns `502` to the frontend and does not surface the raw n8n body or the webhook URL in logs

### Requirement: n8n Proxy Configuration

The backend MUST read `N8N_CHAT_WEBHOOK_URL` (optional) and `N8N_CHAT_TIMEOUT_SECONDS` (optional, sane default) from configuration. When `N8N_CHAT_WEBHOOK_URL` is missing or empty, the backend MUST still boot and `POST /chat/n8n` MUST return a clear `503` proxy-unavailable response.

#### Scenario: Webhook URL configured

- GIVEN `N8N_CHAT_WEBHOOK_URL` is set in the environment
- WHEN the backend starts and a chat request arrives
- THEN requests are forwarded to that URL with the configured timeout

#### Scenario: Webhook URL missing at startup

- GIVEN `N8N_CHAT_WEBHOOK_URL` is not set
- WHEN the backend boots
- THEN startup succeeds
- AND a request to `POST /chat/n8n` returns `503` with a clear "not configured" message

#### Scenario: Webhook URL empty at startup

- GIVEN `N8N_CHAT_WEBHOOK_URL` is set to an empty string
- WHEN the backend boots and a chat request arrives
- THEN the route treats it as unconfigured and returns `503`

### Requirement: SSE Streaming Path Retained for Rollback

The existing `/chat/stream` route MUST remain available and unmodified so rollback can restore the legacy SSE frontend transport without any backend changes to `/chat/stream`. The new `/chat/n8n` route MUST coexist with `/chat/stream` without behavioral coupling.

#### Scenario: Rollback by restoring the legacy frontend transport

- GIVEN `/chat/n8n` is the active transport
- WHEN the frontend restores the legacy SSE `/chat/stream` transport implementation
- THEN chat continues to function over SSE without any backend change

#### Scenario: Both routes coexist

- GIVEN both `/chat/n8n` and `/chat/stream` are deployed
- WHEN either route is called independently
- THEN the other route is unaffected
