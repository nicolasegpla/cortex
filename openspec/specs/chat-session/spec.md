# Chat Session Specification

## Purpose

Define the phase-1 chat-first workspace where conversation is primary, manual browse remains available, and all LLM traffic is mediated by Cortex.

## Requirements

### Requirement: Chat-First Workspace Entry

The system MUST present chat as the primary authenticated workspace and SHALL keep manual browse/navigation available as a secondary fallback path.

#### Scenario: User lands in chat first

- GIVEN an authenticated user opens the workspace
- WHEN the default application route resolves
- THEN the primary content is the chat workspace
- AND the user can still navigate to a manual browse view

#### Scenario: User needs manual fallback

- GIVEN the user is in the chat workspace
- WHEN they choose the secondary browse/navigation path
- THEN the manual browse view is reachable without leaving the authenticated workspace

### Requirement: Backend-Mediated Multi-Provider Chat

The system MUST send all chat traffic through the Cortex backend. For the active n8n-powered mode the frontend MUST use non-streaming `POST /chat/n8n` and receive the assistant answer as a single JSON `{ answer }` payload. The legacy SSE path `/chat/stream` SHALL remain available for rollback and continues to use model/provider selection, streaming, and stop-generation controls. The active n8n chat page intentionally does not expose model, provider, or stop-generation controls. The chat request MAY ask for tool-backed answers, and database-backed behavior MUST be available for any registered entity through approved server-side tools and the generic response engine.

(Previously: Frontend streamed the response over SSE from `/chat/stream`; the n8n mode replaces the transport with a synchronous JSON POST while preserving backend mediation and the SSE path for rollback.)

#### Scenario: Receive an n8n answer non-streaming

- GIVEN the active chat transport is the n8n proxy and the user sends a message
- WHEN the backend returns `200 { answer }`
- THEN the frontend appends a single assistant message with that answer
- AND no SSE parsing is performed on this path

#### Scenario: Provider derived from selected model on the legacy SSE path

- GIVEN the user selects a model belonging to provider P while using `/chat/stream`
- WHEN the selection is applied
- THEN the active provider becomes P without a separate provider action

#### Scenario: Prevent direct provider access from browser

- GIVEN a browser session uses the chat workspace
- WHEN a message is sent
- THEN the browser never sends the provider credential, the n8n webhook URL, or any vendor-bound request directly to an external LLM provider or n8n

#### Scenario: SSE rollback path preserved

- GIVEN `/chat/n8n` is the active transport
- WHEN the frontend is reverted to `/chat/stream`
- THEN the SSE streaming flow is still available without backend changes

#### Scenario: Use registered-entity database-backed answers

- GIVEN a user asks a factual question for a registered entity in a tool-enabled session
- WHEN tool-backed behavior is available
- THEN Cortex may answer using that entity's approved tools and registry metadata
- AND the request does not expand to unrestricted SQL or unregistered entities

### Requirement: Active Model as Single Source of Truth (Legacy SSE Path and Store Persistence)

The chat store MAY retain the active model as a persisted preference so that the legacy SSE path can reuse it on rollback. The active n8n chat page does not expose model or provider controls, so no active UX guarantee depends on this selection. When the legacy SSE path is used, the active provider MUST be a derived value of the active model, not an independently user-settable state. Persisted selections MUST be sanitized on rehydration: an invalid persisted model MUST resolve to a valid model/provider pair.

#### Scenario: Invalid persisted model is sanitized

- GIVEN a persisted model no longer exists in any validated provider's model list
- WHEN the store rehydrates
- THEN a valid default model/provider pair is restored

#### Scenario: Model belonging to unvalidated provider

- GIVEN the active model belongs to a provider without valid credentials
- WHEN the chat workspace loads
- THEN the selection is sanitized to a validated provider's default model

### Requirement: Conversation Status and Phase-1 Session Behavior

The active n8n JSON chat path MUST expose testable sending, awaiting-answer, and failed states, and SHALL keep the active conversation available only for the current in-memory phase-1 session. Streaming and stop-generation behavior apply only when the legacy `/chat/stream` SSE path is explicitly restored for rollback.

#### Scenario: Active n8n path waits for one final answer

- GIVEN the active transport is `/chat/n8n`
- WHEN the user sends a message
- THEN the UI enters a loading state while awaiting one final JSON answer
- AND no partial streaming chunks are rendered on the active n8n path

#### Scenario: User stops a response on the legacy SSE path

- GIVEN the frontend restores the legacy `/chat/stream` SSE transport
- AND an assistant response is currently streaming over `/chat/stream`
- WHEN the user stops generation
- THEN streaming ends promptly
- AND the conversation retains the content received before the stop action

#### Scenario: User reloads in phase 1

- GIVEN the user has an active conversation in the current browser session
- WHEN the workspace is fully reloaded
- THEN prior conversation history is not required to be restored in phase 1
