# Delta for entity-registry

## MODIFIED Requirements

### Requirement: Canonical Entity Registration

The system MUST register each chat entity once with structural search fields, display labels, and tool/service bindings so planner, executor, and synthesis do not duplicate entity rules, and lexical keyword lists MUST NOT be required for primary routing.

(Previously: Registration included canonical terms for deterministic routing.)

#### Scenario: Brewery metadata drives semantic routing
- GIVEN brewery is the first registered entity
- WHEN a factual brewery query is evaluated
- THEN planner and executor capability lookup comes from the registry
- AND no router module requires hardcoded brewery field names

#### Scenario: Future entity extends without router rewrites
- GIVEN a new entity such as coffee is registered with valid metadata
- WHEN the planner/executor pipeline evaluates a factual query for that entity
- THEN the pipeline MUST use the registered metadata to retrieve and format the answer
- AND no new entity-specific router, formatter, or lexical keyword pack is required
