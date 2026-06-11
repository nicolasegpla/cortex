# sql-generation Specification

## Purpose

Generate one backend-consumable read-only SQL candidate from user intent plus live schema metadata.

## Requirements

### Requirement: Schema-First SQL Generation

The system MUST fetch schema metadata on the backend before SQL generation and MUST request one read-only SQL statement grounded only in `(user_text, schema_context)`.

#### Scenario: Schema first
- GIVEN a factual question
- WHEN SQL generation starts
- THEN schema metadata is already available
- AND the SQL references only schema-described objects

#### Scenario: No schema
- GIVEN schema metadata cannot be prepared
- WHEN SQL generation would start
- THEN SQL generation does not occur
- AND the user receives a grounded failure response

### Requirement: Structured SQL Output

The system SHOULD return structured SQL-generation output that includes a `query` field so the backend can parse execution input deterministically.

#### Scenario: Structured response returned
- GIVEN SQL generation succeeds
- WHEN the model returns orchestration output
- THEN the payload includes a `query` field
- AND the backend reads SQL from that field

#### Scenario: Malformed response rejected
- GIVEN generation output omits the `query` field
- WHEN backend parsing runs
- THEN execution does not start
- AND the request returns a grounded failure
