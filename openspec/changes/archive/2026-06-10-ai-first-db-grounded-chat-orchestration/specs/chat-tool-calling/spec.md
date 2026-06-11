# Delta for chat-tool-calling

## MODIFIED Requirements

### Requirement: Server-Side Tool Loop

The system MUST keep tool selection and execution on the server, SHALL execute only approved registered-entity tools, and MUST treat tool calling as a compatibility path behind the planner/executor pipeline while preserving the unified final response contract.

(Previously: Tool calling could act as a primary factual-answer path.)

#### Scenario: Answer registered-entity question with tool data
- GIVEN a factual registered-entity question reaches the compatibility tool path
- WHEN the provider requests an approved tool
- THEN Cortex executes the tool server-side and resumes the flow with grounded tool data
- AND the user receives the shared synthesized response contract

#### Scenario: Preserve seamless streaming contract
- GIVEN a tool-backed answer is produced
- WHEN the response is streamed to the client
- THEN the stream remains a single chat response contract
- AND any tool metadata is optional and non-blocking to the client

### Requirement: Tool Calling Fallback

The system MUST fall back to the planner → executor → synthesizer pipeline when provider tool calling is unavailable, disabled, or unsupported.

(Previously: The fallback was standard chat streaming without mandatory retrieval.)

#### Scenario: Provider lacks tool calling
- GIVEN a request enables tools but the selected provider cannot use them
- WHEN chat starts
- THEN Cortex skips provider-side tool execution
- AND the request continues through the mandatory retrieval pipeline
