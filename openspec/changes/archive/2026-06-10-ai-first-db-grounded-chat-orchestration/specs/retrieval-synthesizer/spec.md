# retrieval-synthesizer Specification

## Purpose

Turn grounded retrieval results into one consistent final response contract across entities and execution paths.

## Requirements

### Requirement: Unified Grounded Synthesis

The system MUST produce the final answer through the shared deterministic formatter contract and MAY apply optional LLM rewriting only after a grounded retrieval payload exists.

#### Scenario: Grounded data keeps one format
- GIVEN retrieval returns structured results for one or more entities
- WHEN the final answer is prepared
- THEN the shared formatter contract is applied
- AND the output stays consistent across entities and paths

#### Scenario: Empty retrieval stays grounded
- GIVEN all retrieval steps return no records
- WHEN the final response is prepared
- THEN the shared empty-state contract is returned
- AND any freeform AI text is explicitly based on the recorded retrieval attempt
