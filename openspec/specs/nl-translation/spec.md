# nl-translation Specification

## Purpose

Turn executed database results into a grounded natural-language answer without transferring response ownership away from the backend.

## Requirements

### Requirement: Result Translation

The system MUST call the LLM for final synthesis only after successful execution, SHALL base the response only on the result payload, and MUST keep final user-facing answer ownership in the backend.

#### Scenario: Results answer
- GIVEN execution returns rows or aggregates
- WHEN natural-language translation runs
- THEN the final response is derived from those results
- AND the backend preserves the response contract

#### Scenario: Empty results
- GIVEN execution succeeds with no matching records
- WHEN translation runs
- THEN the response states that no records were found
- AND it does not invent unsupported facts
