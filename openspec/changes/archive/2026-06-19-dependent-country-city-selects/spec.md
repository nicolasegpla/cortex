# Delta Spec: Dependent Country/City Selects

> Change: `dependent-country-city-selects` — replaces free-text `pais`/`ciudad` inputs with dependent selects across all four customer forms.

---

## Domain: location-catalog (NEW)

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

---

## Domain: dependent-country-city-select (NEW)

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

---

## Domain: breweries-crud (DELTA — ADDED)

### Requirement: Brewery form MUST use dependent country/city selects

The brewery create and edit forms MUST replace free-text `pais`/`ciudad` inputs with the shared `CountryCitySelect` molecule. Submitted `pais`/`ciudad` values MUST remain plain strings matching the backend contract.

#### Scenario: Brewery form renders dependent selects
- GIVEN the brewery create form is opened
- WHEN the form renders the location fields
- THEN country and city render as dependent selects, not text inputs

---

## Domain: coffee-farms-crud (DELTA — ADDED)

### Requirement: Coffee farm form MUST use dependent country/city selects

The coffee farm create and edit forms MUST replace free-text `pais`/`ciudad` inputs with the shared `CountryCitySelect` molecule.

#### Scenario: Coffee farm form renders dependent selects
- GIVEN the coffee farm create form is opened
- WHEN the form renders the location fields
- THEN country and city render as dependent selects

---

## Domain: wine-producers-crud (DELTA — ADDED)

### Requirement: Wine producer form MUST use dependent country/city selects

The wine producer create and edit forms MUST replace free-text `pais`/`ciudad` inputs with the shared `CountryCitySelect` molecule. The form's `handleChange` MUST accept `HTMLSelectElement` events in addition to `HTMLInputElement`.

#### Scenario: Wine producer form renders dependent selects
- GIVEN the wine producer create form is opened
- WHEN the form renders the location fields
- THEN country and city render as dependent selects and handleChange handles select events

---

## Domain: animal-feed-producers-crud (DELTA — ADDED)

### Requirement: Animal feed producer form MUST use dependent country/city selects

The animal feed producer create and edit forms MUST replace free-text `pais`/`ciudad` inputs with the shared `CountryCitySelect` molecule. The form's `handleChange` MUST accept `HTMLSelectElement` events in addition to `HTMLInputElement`.

#### Scenario: Animal feed producer form renders dependent selects
- GIVEN the animal feed producer create form is opened
- WHEN the form renders the location fields
- THEN country and city render as dependent selects and handleChange handles select events

---

## Test Coverage Matrix

| Test Category | Molecule (CountryCitySelect) | breweries | coffee-farms | wine-producers | animal-feed-producers |
|---|---|---|---|---|---|
| Initial render (create mode) | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| City filtering by country | REQUIRED | smoke | smoke | smoke | smoke |
| City clears on country change | REQUIRED | smoke | smoke | smoke | smoke |
| Edit-mode preload (known values) | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| Legacy value transient option | REQUIRED | smoke | smoke | smoke | smoke |
| Payload persistence (plain strings) | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| handleChange select event | — | — | — | REQUIRED | REQUIRED |
| Catalog unit tests (types + fallback) | REQUIRED | — | — | — | — |

**Legend:** REQUIRED = dedicated test must exist; smoke = covered by molecule-level test plus one integration assertion that the form renders the molecule.
