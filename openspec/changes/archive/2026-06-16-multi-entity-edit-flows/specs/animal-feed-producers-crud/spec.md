# Delta for animal-feed-producers-crud

## MODIFIED Requirements

### Requirement: Advanced parity remains deferred for the first connection

The system MAY defer `search`, `inspect`, and `count` in this first connection, but SHALL include a dedicated authenticated edit UI with route entry, prefilled data, update submission, and return-to-list behavior. Verification for this change MUST require edit-flow coverage.
(Previously: The first connection deferred search, inspect, count, and a dedicated edit UI.)

#### Scenario: Acceptance includes the edit flow
- GIVEN the animal feed producer connection is reviewed after this change
- WHEN completion is evaluated
- THEN CRUD API, list access, create flow, and edit flow are required for acceptance
