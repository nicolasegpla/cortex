# Delta for Chat Session

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Active Model as Single Source of Truth

(Reason: Store no longer owns `activeModel`, `activeProvider`, or model constants. n8n owns routing. Legacy localStorage `activeModel` is ignored on rehydrate — `partialize` excludes model fields.)
(Migration: Remove `activeModel` from Zustand `partialize`; existing localStorage entries are harmless.)

## ADDED Requirements

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
