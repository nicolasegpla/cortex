# Delta for multi-entity-search

## MODIFIED Requirements

### Requirement: Natural Language Entity Resolution

The system MUST resolve intended entities, targets, and follow-up references semantically from natural factual phrasing and full conversation context, and SHALL support multiple entities in one turn.

(Previously: Resolution was deterministic and primarily single-entity.)

#### Scenario: Detail request without entity noun
- GIVEN a tool-enabled chat request says "dame informacion de test 1"
- WHEN semantic resolution matches "test 1" to a registered target
- THEN the request is treated as a detail lookup
- AND it does not require the word "cerveceria"

#### Scenario: Direct field lookup without entity noun
- GIVEN a tool-enabled chat request says "dame el telefono de test 1"
- WHEN the phrasing requests a registered direct field
- THEN the system resolves both the target and requested field semantically
- AND the answer is returned without model-owned factual formatting

#### Scenario: Multi-entity follow-up uses conversation context
- GIVEN the previous turn identified two registered entities
- WHEN the user says "compare those two"
- THEN the system resolves both entities from conversation context
- AND it plans retrieval for each entity in the same turn
