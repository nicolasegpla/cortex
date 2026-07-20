# Delta for Chat Session

## MODIFIED Requirements

### Requirement: Conversation Status and Phase-1 Session Behavior

The active n8n JSON chat path MUST expose testable sending, awaiting-answer, and failed states, and SHALL keep the active conversation available only for the current in-memory phase-1 session.

(Previously: requirement text referenced a legacy `/chat/stream` SSE rollback path and included a stop-generation scenario for that path.)

#### Scenario: Active n8n path waits for one final answer

- GIVEN the active transport is `/chat/n8n`
- WHEN the user sends a message
- THEN the UI enters a loading state while awaiting one final JSON answer
- AND no partial streaming chunks are rendered on the active n8n path

#### Scenario: User reloads in phase 1

- GIVEN the user has an active conversation in the current browser session
- WHEN the workspace is fully reloaded
- THEN prior conversation history is not required to be restored in phase 1

## REMOVED Requirements

### Requirement: SSE Streaming Stop-Generation Scenario

(Reason: the backend `/chat/stream` SSE route (`app/routers/chat.py`) is deleted — the entire legacy streaming path is gone. The frontend caller was removed in PR #39, and now the server-side endpoint is deleted. There is no SSE transport to stop and no rollback path to restore.)
(Migration: None. The `Requirement: Conversation Status and Phase-1 Session Behavior` requirement above replaces the original without SSE references.)
