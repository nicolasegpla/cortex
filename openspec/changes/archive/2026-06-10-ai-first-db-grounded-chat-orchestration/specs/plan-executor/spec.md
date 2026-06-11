# plan-executor Specification

## Purpose

Execute validated retrieval plans against registered entity services while keeping the database as the factual source of truth.

## Requirements

### Requirement: Grounded Plan Execution

The system MUST execute each validated retrieval step against registered entity services before synthesis and SHALL treat database results as the factual source of truth.

#### Scenario: Execute multi-step retrieval
- GIVEN a validated plan contains count and inspect steps
- WHEN execution starts
- THEN each step queries the bound entity service
- AND results stay associated with their entity and operation

#### Scenario: Failed execution still blocks free answer
- GIVEN a step cannot run because the operation is unsupported
- WHEN the executor evaluates the step
- THEN the retrieval attempt is recorded as failed
- AND no final answer is produced from model knowledge alone
