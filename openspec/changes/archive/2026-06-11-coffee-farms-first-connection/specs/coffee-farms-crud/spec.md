# coffee-farms-crud Specification

## Purpose

Provide the first manual connection for `coffee_farms`, mirroring breweries where useful but limited to authenticated backend CRUD plus frontend list/create access. Search, inspect, count, and edit-form parity are deferred.

## Requirements

### Requirement: Authenticated coffee farm CRUD API

The system MUST expose authenticated `POST /coffee-farms`, `GET /coffee-farms`, `GET /coffee-farms/{id}`, `PUT /coffee-farms/{id}`, and `DELETE /coffee-farms/{id}` operations backed by `public.coffee_farms`.

#### Scenario: Create and retrieve a coffee farm
- GIVEN an authenticated user and a valid coffee farm payload
- WHEN the user creates a record and then requests it by id
- THEN the API returns `201 Created` for create and `200 OK` for get
- AND the returned record includes the persisted id and timestamps

#### Scenario: Missing coffee farm returns not found
- GIVEN an authenticated user and a non-existent coffee farm id
- WHEN the user requests, updates, or deletes that id
- THEN the API returns `404 Not Found`

#### Scenario: Missing authentication is rejected
- GIVEN no valid authentication token
- WHEN the client calls any coffee farm CRUD endpoint
- THEN the API returns `401 Unauthorized`

### Requirement: Coffee farm schema MUST match migration constraints

The system MUST map request and response fields to the existing `coffee_farms` table, preserve numeric precision for `hectareas_totales`, `hectareas_cafe`, and `puntaje_cafe`, support array fields for `variedades_sembradas` and `equipos`, and accept only DB-valid values for `tipo_actividad`, `tipo_proceso`, and `nivel_tecnificacion`.

#### Scenario: Valid arrays, decimals, and enums are accepted
- GIVEN a valid payload with decimal, array, and constrained text fields
- WHEN the payload is submitted to create or update a coffee farm
- THEN the API accepts the payload and returns the stored values without precision loss

#### Scenario: Invalid constrained value is rejected
- GIVEN a payload with a value outside the DB constraint set
- WHEN the client submits the payload
- THEN the API returns a validation error and does not persist the record

### Requirement: Manual coffee farm list access

The system MUST expose an authenticated `/coffee-farms` page and mark the coffee farms card as active from the databases page. The list page MUST load records from the API and handle empty and failed loads.

#### Scenario: Active database card opens the list page
- GIVEN an authenticated user on the databases page
- WHEN the user selects “Fincas de café”
- THEN the card behaves as an active link to `/coffee-farms`

#### Scenario: Empty list shows first-use state
- GIVEN the API returns no coffee farm records
- WHEN the list page loads
- THEN the page shows an empty state instead of a broken table

#### Scenario: Load failure surfaces feedback
- GIVEN the API request fails
- WHEN the list page loads
- THEN the page shows an error message for the user

### Requirement: Manual coffee farm creation flow

The system MUST expose an authenticated `/coffee-farms/new` form for the initial manual slice. The form MUST require `nombre_finca`, submit supported fields to the API, normalize comma-separated array inputs for list fields, and redirect to `/coffee-farms` after successful creation.

#### Scenario: Successful create redirects to list
- GIVEN an authenticated user completes a valid form
- WHEN the user submits the coffee farm form
- THEN the frontend sends a create request and redirects to `/coffee-farms` on success

#### Scenario: Create failure keeps the user on the form
- GIVEN the create request fails
- WHEN the user submits the form
- THEN the page shows an error message and preserves the workflow on `/coffee-farms/new`

### Requirement: Advanced parity remains deferred

The system MAY defer `search`, `inspect`, `count`, and a dedicated edit form in this first connection, and verification for this change SHALL NOT require those capabilities.

#### Scenario: Initial parity target excludes advanced flows
- GIVEN the first coffee farm connection is under implementation
- WHEN the change is reviewed for completion
- THEN CRUD API, list access, create flow, routing, and activation are sufficient for acceptance
