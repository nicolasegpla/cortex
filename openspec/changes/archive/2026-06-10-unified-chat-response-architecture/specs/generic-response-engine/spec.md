# generic-response-engine Specification

## Purpose

Define one deterministic factual-answer engine for chat.

## Requirements

### Requirement: Unified Deterministic Response Contract

The system MUST route deterministic count, field lookup, detail, table, and enumeration requests through one generic response engine and MUST return one response format regardless of whether records came from direct routing or approved tool results.

#### Scenario: Detail requests keep one contract
- GIVEN a tool-enabled chat request says "dame informacion de la cerveceria 2"
- WHEN deterministic routing resolves the brewery record
- THEN the user receives the standard single-record detail format
- AND the output does not vary by retrieval path

#### Scenario: Tool results reuse the same formatter
- GIVEN approved tool execution returns structured records for a registered entity
- WHEN the final factual answer is prepared
- THEN the generic response engine applies the same labels, ordering, and empty-state rules as direct routing
