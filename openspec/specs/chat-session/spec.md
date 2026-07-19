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

The system MUST send all chat through the Cortex backend using `POST /chat/n8n` with non-streaming JSON `{ answer }`. The frontend MUST NOT expose model, provider, or stop-generation controls. Tool-backed and database-backed answers remain available.

(Previously: store held model/provider state with legacy SSE `/chat/stream` rollback path.)

#### Scenario: Receive n8n answer non-streaming

- GIVEN the user sends a message via `/chat/n8n`
- WHEN backend returns `200 { answer }`
- THEN a single assistant message is appended with no SSE parsing

#### Scenario: Prevent direct provider access

- GIVEN a browser session in the chat workspace
- WHEN a message is sent
- THEN no provider credentials or vendor-bound requests leave the browser directly

#### Scenario: Use registered-entity database-backed answers

- GIVEN a user asks a factual question for a registered entity in a tool-enabled session
- WHEN tool-backed behavior is available
- THEN Cortex may answer using that entity's approved tools and registry metadata
- AND the request does not expand to unrestricted SQL or unregistered entities

### Requirement: Store Only Tracks In-Memory Chat Session

The chat store MUST track only `messages`, `isLoading`, `error`, `sendMessage`, `clearMessages`, and `clearError`. No provider, model, or credential state.

#### Scenario: Store rehydrates ignoring legacy model fields

- GIVEN localStorage has legacy `activeModel` from a prior version
- WHEN the store rehydrates
- THEN `messages`, `isLoading`, and `error` hydrate normally
- AND legacy model keys are ignored without errors

#### Scenario: Send message via n8n

- GIVEN the user types and sends a message
- WHEN `sendMessage` fires
- THEN `isLoading` becomes true, `POST /chat/n8n` executes, answer appends on success, `error` sets on failure

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
