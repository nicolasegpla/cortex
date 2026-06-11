# mandatory-retrieval-gate Specification

## Purpose

Guarantee that every final answer is preceded by an observable database retrieval attempt.

## Requirements

### Requirement: Retrieval Before Answer

The system MUST attempt database retrieval for every user turn before any final answer, and if retrieval returns nothing the AI MAY answer freely only after that retrieval attempt is recorded.

#### Scenario: Direct path still retrieves first
- GIVEN provider tools are disabled or unavailable
- WHEN a user sends a factual turn
- THEN the planner-executor path still attempts retrieval before any answer
- AND there is no direct model-only response path

#### Scenario: Empty result allows constrained free answer
- GIVEN retrieval completes with no matching records
- WHEN the final answer is produced
- THEN the response records that retrieval was attempted
- AND optional freeform AI text comes only after that record exists
