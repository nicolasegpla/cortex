# ai-planner Specification

## Purpose

Interpret each user turn semantically and emit a validated retrieval plan grounded in conversation context.

## Requirements

### Requirement: Contextual Retrieval Planning

The system MUST interpret every user turn using the full conversation context and MUST emit a validated `RetrievalPlan` with `entities[]`, `retrieval_steps[]`, and `response_mode`.

#### Scenario: Follow-up multi-entity plan
- GIVEN a turn references prior results such as "compare those two"
- WHEN the planner resolves the request
- THEN it outputs retrieval steps for each resolved entity
- AND no regex keyword list is required

#### Scenario: Invalid plan becomes clarification
- GIVEN the planner proposes an unknown entity or unsupported field
- WHEN plan validation runs
- THEN the plan is rejected
- AND the system asks a clarifying question instead of querying blindly
