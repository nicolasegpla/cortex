# ai-planner Specification

## Purpose

Route every factual chat turn through backend-owned SQL orchestration, emitting SQL-planning output instead of a validated `RetrievalPlan`.

## Requirements

### Requirement: Contextual Retrieval Planning

The system MUST route every factual chat turn through backend-owned SQL orchestration, MUST use conversation context plus backend-prepared schema metadata, and MUST emit SQL-planning output instead of a validated `RetrievalPlan`. The planner SHALL NOT depend on runtime feature flags or planner/direct/tool fallback paths.

(Previously: The system interpreted every user turn using the full conversation context and emitted a validated `RetrievalPlan` with `entities[]`, `retrieval_steps[]`, and `response_mode`.)

#### Scenario: Follow-up turn becomes SQL plan
- GIVEN a turn references prior results such as "compare those two"
- WHEN planning starts
- THEN one read-only SQL candidate is produced from conversation and schema context
- AND the output does not include retrieval-step JSON

#### Scenario: Missing schema blocks orchestration
- GIVEN schema metadata is unavailable
- WHEN planning would start
- THEN no SQL plan is emitted
- AND the request returns a grounded failure
