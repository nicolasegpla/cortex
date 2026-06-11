# entity-registry Specification

## Purpose

Define one canonical metadata registry per chat entity.

## Requirements

### Requirement: Canonical Entity Registration

The system MUST register each chat entity once with canonical terms, searchable fields, display labels, and tool/service bindings so routing and formatting do not duplicate brewery-only rules.

#### Scenario: Brewery metadata drives deterministic routing
- GIVEN brewery is the first registered entity
- WHEN a factual brewery query is evaluated
- THEN detection, search target selection, and formatter choice come from the registry
- AND no router module requires hardcoded brewery field names

#### Scenario: Future entity extends without router rewrites
- GIVEN a new entity such as coffee is registered with valid metadata
- WHEN the generic response engine evaluates a factual query for that entity
- THEN the engine MUST use the registered metadata to route and format the answer
- AND no new entity-specific router or formatter module is required
