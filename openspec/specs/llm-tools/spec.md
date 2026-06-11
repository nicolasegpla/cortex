# llm-tools Specification

## Purpose

Define the first-slice secure tool catalog for database-backed chat answers.

## Requirements

### Requirement: Whitelisted Brewery Read Tools Only

The system MUST expose only whitelisted, read-only tools bound to registered entities for database-backed answers and MUST NOT accept unrestricted SQL, arbitrary query text, write operations, or tools for unregistered entities.

(Previously: Tool exposure was restricted to brewery-only entities.)

#### Scenario: Count registered entity records from chat
- GIVEN a tool-enabled chat request asks for the total of a registered entity
- WHEN the model selects that entity's approved count tool
- THEN Cortex executes only the whitelisted read operation
- AND the result is returned as structured tool output

#### Scenario: Reject unrestricted data access
- GIVEN a model or request targets raw SQL or an entity without registry metadata
- WHEN the tool layer evaluates the request
- THEN no unsupported database command is executed
- AND the request is refused or ignored as unsupported

### Requirement: Deterministic Tool Outcomes

The system MUST return deterministic success or failure outcomes for each tool execution so the secure tool path can be verified under strict TDD.

#### Scenario: Tool execution fails safely
- GIVEN a whitelisted brewery tool cannot complete
- WHEN execution ends
- THEN the outcome is observable as a non-secret failure
- AND chat can continue through its defined fallback behavior