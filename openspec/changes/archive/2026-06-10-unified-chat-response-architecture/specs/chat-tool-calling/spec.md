# Delta for chat-tool-calling

## MODIFIED Requirements

### Requirement: Server-Side Tool Loop

The system MUST keep tool selection and execution on the server, SHALL execute only approved registered-entity tools, and MUST return one final assistant answer formatted by the generic response engine from tool results.

(Previously: Final grounded answers were produced without a shared post-tool response engine.)

#### Scenario: Answer registered-entity question with tool data
- GIVEN tools are enabled and a factual registered-entity question needs database data
- WHEN the provider requests an approved tool
- THEN Cortex executes the tool server-side and resumes the chat flow with the tool result
- AND the user receives the generic response-engine answer contract

#### Scenario: Preserve seamless streaming contract
- GIVEN a tool-backed answer is produced
- WHEN the response is streamed to the client
- THEN the stream remains a single chat response contract
- AND any tool metadata is optional and non-blocking to the client
