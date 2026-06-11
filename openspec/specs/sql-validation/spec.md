# sql-validation Specification

## Purpose

Block unsafe SQL before any database execution occurs.

## Requirements

### Requirement: SQL Guardrails

The system MUST validate SQL before execution and MUST reject unsafe, mutating, multi-statement, or non-read-only SQL.

#### Scenario: Safe SQL
- GIVEN generated SQL selects from allowed objects
- WHEN validation runs
- THEN the statement is accepted for execution
- AND only read-only execution remains possible

#### Scenario: Unsafe SQL
- GIVEN generated SQL includes a disallowed pattern
- WHEN validation runs
- THEN execution is denied
- AND the user receives a non-executed failure response
