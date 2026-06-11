# Delta for plan-executor

## MODIFIED Requirements

### Requirement: Grounded Plan Execution

The system MUST execute only validated read-only SQL through backend database access before synthesis, SHALL treat database results as the factual source of truth, and MUST NOT dispatch entity-service steps or alternate planner/direct/tool paths.

(Previously: The system executed each validated retrieval step against registered entity services before synthesis and treated database results as the factual source of truth.)

#### Scenario: Execute validated SQL
- GIVEN a validated read-only SQL statement
- WHEN execution starts
- THEN the backend runs it against the database
- AND the recorded result remains bound to the request

#### Scenario: Failed execution still blocks free answer
- GIVEN validated SQL cannot be executed
- WHEN execution fails
- THEN no final answer is produced from model knowledge alone
- AND the user receives a grounded execution-failure response
