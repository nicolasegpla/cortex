# Hermes Chat Client Specification

## Purpose

Frontend service streaming chat completions directly from Hermes Railway via OpenAI-compatible SSE, with configurable base URL, static test bearer auth, and AbortController-cancellable requests.

## Requirements

### Requirement: OpenAI-Compatible SSE Streaming

The client MUST POST to `/v1/chat/completions` with `{ model, messages, stream: true }` and `Content-Type: application/json`, parse `data:` lines extracting `choices[0].delta.content`, terminate on `data: [DONE]`, and yield text deltas via an async generator.

#### Scenario: Stream a completion
- GIVEN a valid model and message history
- WHEN `streamChat` is called
- THEN the generator yields each `delta.content` chunk in order
- AND stops after `data: [DONE]`

#### Scenario: Ignore non-data lines
- GIVEN the stream contains comments or keep-alive lines
- WHEN parsing runs
- THEN only `data:` lines are decoded; others are skipped

### Requirement: AbortController Signal Wiring

The client MUST forward the provided `signal` into `fetch` so cancellation terminates the HTTP request, not just the local read loop. Aborting MUST NOT surface as an error.

#### Scenario: Abort terminates the request
- GIVEN an in-flight stream
- WHEN the signal is aborted
- THEN the HTTP request is cancelled and the generator stops yielding
- AND no error is thrown for the abort

### Requirement: Configurable Base URL

The client MUST read the Hermes endpoint from `VITE_HERMES_CHAT_URL`; the default MUST point to the production Railway URL.

#### Scenario: Custom endpoint via env
- GIVEN `VITE_HERMES_CHAT_URL` is set to a staging URL
- WHEN the client builds the request
- THEN requests target the staging URL, not a hardcoded production URL

### Requirement: Static Bearer Authentication (Test)

The client MUST send `Authorization: Bearer hermes-railway-2026`. This static shared token MUST be documented as NOT production-safe: it shares memory/access across all users and is acceptable only for the test integration.

#### Scenario: Test bearer token attached
- GIVEN a chat request is built
- WHEN the request is sent
- THEN the `Authorization` header is present with value `Bearer hermes-railway-2026`

### Requirement: Error Handling

The client MUST surface non-2xx HTTP and network failures as a typed error, distinguishable from abort.

#### Scenario: Non-2xx response
- GIVEN Hermes returns HTTP 401
- WHEN `streamChat` runs
- THEN a typed error is thrown describing the status

#### Scenario: Network failure
- GIVEN fetch rejects with a network error
- WHEN `streamChat` runs
- THEN a typed error is thrown and no deltas are yielded as success
