# multi-entity-search Specification

## Purpose

Resolve registered entities and targets from natural factual phrasing.

## Requirements

### Requirement: Natural Language Entity Resolution

The system MUST resolve the intended registered entity and target from natural factual phrasing, including detail and direct field lookup requests that omit the entity noun when the remaining target is identifiable.

#### Scenario: Detail request without entity noun
- GIVEN a tool-enabled chat request says "dame informacion de test 1"
- WHEN "test 1" matches a registered brewery target
- THEN the request is treated as a detail lookup
- AND it does not require the word "cerveceria"

#### Scenario: Direct field lookup without entity noun
- GIVEN a tool-enabled chat request says "dame el telefono de test 1"
- WHEN the phrasing requests a registered direct field
- THEN the system resolves both the target and requested field deterministically
- AND the answer is returned without model-owned factual formatting
