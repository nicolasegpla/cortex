# Delta for generic-response-engine

## MODIFIED Requirements

### Requirement: Unified Deterministic Response Contract

The system MUST apply deterministic count, field lookup, detail, table, and enumeration formatters during synthesis after planner/executor retrieval and MUST return one response format regardless of entity, retrieval path, or optional LLM rewrite.

(Previously: The engine formatted answers after direct routing or approved tool results.)

#### Scenario: Detail requests keep one contract
- GIVEN a chat request asks for a single grounded record
- WHEN planner/executor retrieval resolves the record
- THEN the user receives the standard single-record detail format
- AND the output does not vary by retrieval path

#### Scenario: Tool results reuse the same formatter
- GIVEN grounded tool execution returns structured records for a registered entity
- WHEN the final factual answer is prepared
- THEN the generic response engine applies the same labels, ordering, and empty-state rules as planner results
