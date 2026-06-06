# chat-tool-calling Specification

## Purpose

Define server-side tool calling for secure database-backed chat answers.

## Requirements

### Requirement: Server-Side Tool Loop

The system MUST keep tool selection and execution on the server, SHALL execute only approved tools, and MUST return one final assistant answer grounded in tool results.

#### Scenario: Answer brewery question with tool data
- GIVEN tools are enabled and a brewery question needs database data
- WHEN the provider requests a whitelisted tool
- THEN Cortex executes the tool server-side and resumes the chat flow with the tool result
- AND the user receives a final grounded assistant answer

#### Scenario: Preserve seamless streaming contract
- GIVEN a tool-backed answer is produced
- WHEN the response is streamed to the client
- THEN the stream remains a single chat response contract
- AND any tool metadata is optional and non-blocking to the client

### Requirement: Tool Calling Fallback

The system MUST fall back to standard chat streaming when provider tool calling is unavailable, disabled, or unsupported.

#### Scenario: Provider lacks tool calling
- GIVEN a request enables tools but the selected provider cannot use them
- WHEN chat starts
- THEN Cortex skips server-side tool execution
- AND the request continues through standard streaming behavior