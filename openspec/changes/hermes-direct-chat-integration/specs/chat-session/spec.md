# Delta for chat-session

## RENAMED Requirements

### Requirement: Backend-Mediated Multi-Provider Chat → Direct Hermes Chat Transport

(Reason: Chat traffic no longer flows through the Cortex backend; the browser calls Hermes directly.)
(Migration: Update tests asserting backend-mediated routing to assert direct Hermes transport.)

## MODIFIED Requirements

### Requirement: Direct Hermes Chat Transport

The system MUST send chat traffic directly from the browser to Hermes Railway's `/v1/chat/completions`. The active model MUST be sent in the request; the active provider is implied by the model and owned by Hermes. Chat requests MAY ask for tool-backed answers, and database-backed behavior MUST remain available for registered entities through approved server-side tools and the generic response engine.

(Previously: All chat traffic routed through the Cortex backend, which derived the provider adapter and prevented direct browser-to-provider access.)

#### Scenario: Stream a Hermes response
- GIVEN the user has selected a model and entered a message
- WHEN the user sends the message
- THEN the browser posts the full message history directly to Hermes
- AND the assistant response streams back incrementally

#### Scenario: Provider derived from selected model
- GIVEN the user selects a model
- WHEN the selection is applied
- THEN the selected model is passed to Hermes without a separate provider action

#### Scenario: Static-bearer-authenticated direct Hermes access
- GIVEN a browser session uses the chat workspace
- WHEN a message is sent
- THEN the browser sends the request directly to Hermes via `Authorization: Bearer hermes-railway-2026`
- AND no per-user provider credential is sent from the browser

#### Scenario: Use registered-entity database-backed answers
- GIVEN a user asks a factual question for a registered entity in a tool-enabled session
- WHEN tool-backed behavior is available
- THEN Cortex may answer using that entity's approved tools and registry metadata
- AND the request does not expand to unrestricted SQL or unregistered entities

## Assumptions & Open Questions

- **DB-grounded tool answers in the direct path:** The "Use registered-entity database-backed answers" scenario is preserved unchanged; whether the direct Hermes test transport exercises it (vs. the backend SQL orchestrator) is deferred to design/verify. No backend change is in scope.
- **SSE payload shape:** Assumes OpenAI `choices[0].delta.content` + `data: [DONE]`; confirm against the live endpoint before implementation.
- **Model catalog:** Model IDs assumed to map directly; alias mapping is out of scope.
- **Static bearer token:** `hermes-railway-2026` is a temporary shared test token, NOT production-safe; rotation/exchange is out of scope.
