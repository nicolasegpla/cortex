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

The system MUST send all chat traffic through the Cortex backend and SHALL support phase-1 provider selection for OpenAI, Kimi, Minimax, and Anthropic.

#### Scenario: Stream a provider response
- GIVEN the user has a valid credential for a selected provider
- WHEN the user sends a message
- THEN Cortex submits the request to the selected provider through its backend
- AND the assistant response is streamed back incrementally to the workspace

#### Scenario: Prevent direct provider access from browser
- GIVEN a browser session uses the chat workspace
- WHEN a message is sent
- THEN the browser never sends the provider credential or provider-bound request directly to an external LLM vendor

### Requirement: Conversation Status and Phase-1 Session Behavior

The system MUST expose testable sending, streaming, stopped, and failed states, and SHALL keep the active conversation available only for the current in-memory phase-1 session.

#### Scenario: User stops a response
- GIVEN an assistant response is currently streaming
- WHEN the user stops generation
- THEN streaming ends promptly
- AND the conversation retains the content received before the stop action

#### Scenario: User reloads in phase 1
- GIVEN the user has an active conversation in the current browser session
- WHEN the workspace is fully reloaded
- THEN prior conversation history is not required to be restored in phase 1
