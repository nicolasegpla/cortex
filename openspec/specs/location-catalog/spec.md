# location-catalog Specification

## Purpose

Define the shared location catalog that provides country-to-city mappings as a single source of truth for all forms that require location input. The catalog is a typed `const` object used by the `CountryCitySelect` molecule.

## Requirements

### Requirement: Country-to-city catalog with typed access

The system MUST provide a single source-of-truth catalog mapping each supported country to its city list. The catalog MUST be a `const` object typed `as const` and MUST expose a `CountryCityMapping` type derived from it. The catalog MUST include at least Colombia and Venezuela. No cities MUST be shared between countries so that country change always clears city.

#### Scenario: Catalog contains Colombia and Venezuela cities
- GIVEN the location catalog module is imported
- WHEN a consumer accesses the catalog
- THEN Colombia and Venezuela each map to a non-empty array of city strings

#### Scenario: Type-safe country and city values
- GIVEN the catalog is typed `as const`
- WHEN a consumer references a country key
- THEN the compiler restricts the key to catalog countries and cities to that country's list

### Requirement: Legacy value fallback

The system MUST provide a helper that, given a persisted `pais` and `ciudad`, returns the city list for that country with the legacy city appended as a transient option when the city is not in the catalog.

#### Scenario: Known city returned as-is
- GIVEN country "Colombia" and city "Bogotá" present in the catalog
- WHEN the helper resolves the option list
- THEN "Bogotá" appears once in the returned list

#### Scenario: Unknown legacy city appended as transient option
- GIVEN country "Colombia" and city "Palmira" NOT in the catalog (legacy data)
- WHEN the helper resolves the option list
- THEN catalog cities appear plus "Palmira" as an extra option so the stored value stays visible

### Country/City Catalog

| Country | Cities |
|---------|--------|
| Colombia | Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga, Pereira, Manizales, Ibagué, Santa Marta, Villavicencio, Neiva, Pasto, Montería, Valledupar, Sincelejo, Armenia, Tunja, Riohacha, Quibdó |
| Venezuela | Caracas, Maracaibo, Valencia, Barquisimeto, Maracay, Ciudad Guayana, Barcelona, Maturín, San Cristóbal, Mérida, Cumaná, Barinas, Puerto La Cruz, Cabimas, Petare, Turmero |
