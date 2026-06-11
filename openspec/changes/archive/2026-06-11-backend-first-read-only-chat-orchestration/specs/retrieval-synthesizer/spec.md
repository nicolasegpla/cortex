# Delta for retrieval-synthesizer

## MODIFIED Requirements

### Requirement: Unified Grounded Synthesis

The system MUST let the backend own the final user-facing answer contract after database execution, MUST synthesize from the recorded result payload, and MAY call the LLM only after successful execution.

(Previously: The system produced the final answer through the shared deterministic formatter contract and applied optional LLM rewriting only after a grounded retrieval payload existed.)

#### Scenario: Grounded data keeps one format
- GIVEN execution returns database results
- WHEN the final answer is prepared
- THEN translation is based on the recorded result payload
- AND the backend preserves the shared response contract

#### Scenario: Empty retrieval stays grounded
- GIVEN validation or execution failed earlier
- WHEN the final response is prepared
- THEN no translation call is made
- AND the failure response stays grounded in that error
