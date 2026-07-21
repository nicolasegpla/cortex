# Delta for location-catalog

## MODIFIED Requirements

### Requirement: Country-to-city catalog with typed access

The system MUST provide a single source-of-truth catalog mapping each supported country to its city list. The catalog MUST be a `const` object typed `as const` and MUST expose a `CountryCityMapping` type. The catalog MUST include Colombia and Venezuela with non-overlapping city lists. Colombia MUST contain the 32 cities from the known-good catalog (40b6d14), with "Bogotá D.C." as the first entry.

(Previously: Spec catalog table had 20 Colombia cities; corrected to full 32-city list matching original implementation.)

#### Scenario: Catalog contains Colombia and Venezuela cities
- GIVEN the location catalog module is imported
- WHEN a consumer accesses the catalog
- THEN Colombia maps to 32 city strings and Venezuela maps to 23 city strings

#### Scenario: Colombia returns cities with Bogotá D.C. first
- GIVEN the location catalog module is imported
- WHEN a consumer accesses `COUNTRY_CITY_MAP.Colombia`
- THEN the first element MUST be "Bogotá D.C."
- AND the list MUST contain "Medellín", "Cali", "Barranquilla"

#### Scenario: Colombia catalog excludes department names
- GIVEN the location catalog module is imported
- WHEN a consumer accesses `COUNTRY_CITY_MAP.Colombia`
- THEN the list MUST NOT contain "Antioquia", "Cundinamarca", "Valle del Cauca", "Amazonas", or "Santander"

#### Scenario: Venezuela catalog unchanged
- GIVEN the location catalog module is imported
- WHEN a consumer accesses `COUNTRY_CITY_MAP.Venezuela`
- THEN the list MUST match the existing Venezuela catalog
- AND MUST contain "Caracas", "Maracaibo", "Valencia"

#### Scenario: Type-safe country and city values
- GIVEN the catalog is typed `as const`
- WHEN a consumer references a country key
- THEN the compiler restricts keys to catalog countries and cities to that country's list

### Requirement: Legacy value fallback

The system MUST provide a helper that, given a persisted `pais` and `ciudad`, returns the city list for that country with the legacy city prepended when it is not in the catalog.

(Previously: Scenario used "Bogotá"; corrected to "Bogotá D.C." to match catalog.)

#### Scenario: Known city returned as-is
- GIVEN country "Colombia" and city "Bogotá D.C." present in the catalog
- WHEN the helper resolves the option list
- THEN "Bogotá D.C." appears exactly once

#### Scenario: Unknown legacy city appended as transient option
- GIVEN country "Colombia" and city "Palmira" NOT in the catalog
- WHEN the helper resolves the option list
- THEN catalog cities appear plus "Palmira" as the first option
- AND the stored value remains visible

### Country/City Catalog

| Country | Cities |
|---------|--------|
| Colombia | Bogotá D.C., Medellín, Cali, Barranquilla, Cartagena de Indias, Bucaramanga, Cúcuta, Pereira, Santa Marta, Ibagué, Manizales, Villavicencio, Pasto, Neiva, Armenia, Popayán, Valledupar, Montería, Sincelejo, Tunja, Riohacha, Florencia, Quibdó, Yopal, Mocoa, San José del Guaviare, Arauca, San Andrés, Leticia, Mitú, Puerto Carreño, Inírida |
| Venezuela | Caracas, Maracaibo, Valencia, Barquisimeto, Maracay, Ciudad Bolívar, San Cristóbal, Mérida, Barcelona, Maturín, Puerto La Cruz, Cumaná, Coro, San Carlos, Guanare, Trujillo, Tucupita, San Fernando de Apure, Calabozo, San Juan de los Morros, Los Teques, La Asunción, San Felipe |
