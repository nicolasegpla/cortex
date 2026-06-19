# dependent-country-city-select Specification

## Purpose

Define the `CountryCitySelect` molecule that renders dependent country and city `<select>` elements. The city list is filtered by the selected country. When the country changes, the city resets to empty. `departamento` remains a free-text input and is not controlled by this molecule.

## Requirements

### Requirement: Dependent country and city selects

The system MUST render a country `<select>` and a city `<select>` as one reusable molecule. The city select MUST only show cities belonging to the selected country. When the country changes, the city MUST reset to empty. `departamento` MUST remain a free-text input and is NOT controlled by this molecule.

#### Scenario: Initial render — create mode
- GIVEN the molecule renders with no preselected values
- WHEN the form mounts in create mode
- THEN the country select lists all catalog countries and the city select has no city options

#### Scenario: Selecting a country populates its cities
- GIVEN the country select is rendered
- WHEN the user selects "Colombia"
- THEN the city select lists only Colombian cities from the catalog

#### Scenario: Changing country clears the selected city
- GIVEN country "Colombia" and city "Medellín" are selected
- WHEN the user changes country to "Venezuela"
- THEN the city select resets to empty and "Medellín" is no longer selected

#### Scenario: Edit mode preloads existing pais and ciudad
- GIVEN an existing record has pais "Colombia" and ciudad "Cali"
- WHEN the edit form mounts
- THEN the country select shows "Colombia" and the city select shows "Cali"

#### Scenario: Legacy city outside catalog renders as transient option
- GIVEN an existing record has pais "Colombia" and ciudad "Palmira" (not in catalog)
- WHEN the edit form mounts
- THEN "Palmira" appears as a selectable transient option alongside catalog cities

#### Scenario: Persisted payload preserves pais and ciudad strings
- GIVEN the user submits a form with country "Colombia" and city "Bogotá"
- WHEN the form payload is sent to the backend
- THEN the payload contains `pais: "Colombia"` and `ciudad: "Bogotá"` as plain strings (contract unchanged)
