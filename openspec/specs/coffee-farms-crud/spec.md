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

The system MUST expose an authenticated `/coffee-farms` page and mark the coffee farms card as active from the databases page. The list page MUST load records from the API, handle empty and failed loads, render a compact summary table with no more than eight visible data columns using `nombre_finca`, `razon_social`, and `ciudad`, and open the shared `row-detail-modal` with full record data plus Edit and Delete actions after explicit row activation.

#### Scenario: Active database card opens the list page
- GIVEN an authenticated user on the databases page
- WHEN the user selects "Fincas de café"
- THEN the card behaves as an active link to `/coffee-farms`

#### Scenario: Empty or failed load surfaces usable feedback
- GIVEN the list page requests coffee farm data
- WHEN the API returns no rows or the request fails
- THEN the page shows an empty state or an error state instead of a broken table

#### Scenario: Row activation opens coffee farm details
- GIVEN the coffee farm list shows a compact summary row
- WHEN the user explicitly activates that row
- THEN the shared detail modal opens with the full record and Edit/Delete actions

#### Scenario: Hover alone does not open coffee farm details
- GIVEN the coffee farm list is visible
- WHEN the user only hovers or focuses a row without activation
- THEN no detail modal opens

### Requirement: Manual coffee farm creation flow

The system MUST expose an authenticated `/coffee-farms/new` form for the initial manual slice. The form MUST require `nombre_finca`, submit supported fields to the API, normalize comma-separated array inputs for list fields, and redirect to `/coffee-farms` after successful creation. When the create form is rendered in the list modal, it MUST yield a clean form with scroll at top on every open per the `form-modal-state-reset` capability, and closing then reopening MUST NOT retain previously typed values.
(Previously: The requirement only covered route form submission and redirection, without specifying clean state or scroll reset on modal reopen.)

#### Scenario: Successful create redirects to list
- GIVEN an authenticated user completes a valid form
- WHEN the user submits the coffee farm form
- THEN the frontend sends a create request and redirects to `/coffee-farms` on success

#### Scenario: Create failure keeps the user on the form
- GIVEN the create request fails
- WHEN the user submits the form
- THEN the page shows an error message and preserves the workflow on `/coffee-farms/new`

#### Scenario: Reopen create modal shows clean state and scroll at top
- GIVEN the coffee farm create modal was filled and closed
- WHEN the user reopens the create modal
- THEN all fields are empty matching `EMPTY_FORM` and the modal body `scrollTop` is `0`

#### Scenario: Coffee farm edit is not polluted by prior create state
- GIVEN the coffee farm create modal was filled and closed
- WHEN the user opens an edit modal for an existing coffee farm
- THEN the form is prefilled with that coffee farm's data, not the prior create input

### Requirement: Advanced parity remains deferred

The system MAY defer `search`, `inspect`, and `count` in this first connection, but SHALL include a dedicated authenticated edit form with route entry, prefilled data, update submission, and return-to-list behavior. Verification for this change MUST require edit-flow coverage.

#### Scenario: Acceptance includes the edit flow
- GIVEN the coffee farm connection is reviewed after this change
- WHEN completion is evaluated
- THEN CRUD API, list access, create flow, and edit flow are required for acceptance

### Requirement: Manual coffee farm deletion flow

The `/coffee-farms` list MUST use the shared `record-deletion-ux` flow for hard-delete actions. The delete action MUST remain visible to authenticated users, require confirmation, and show in-modal success or error feedback.

#### Scenario: Coffee farm delete succeeds
- GIVEN an authenticated user confirms deleting an existing coffee farm
- WHEN the delete request succeeds
- THEN the list removes that row and the modal shows success feedback

#### Scenario: Coffee farm delete is rejected
- GIVEN an authenticated user confirms deletion but the request fails
- WHEN the API returns `403` or another error
- THEN the modal shows the error and the row remains visible

### Requirement: Coffee farm form MUST use dependent country/city selects

The coffee farm create and edit forms MUST replace free-text `pais`/`ciudad` inputs with the shared `CountryCitySelect` molecule.

#### Scenario: Coffee farm form renders dependent selects
- GIVEN the coffee farm create form is opened
- WHEN the form renders the location fields
- THEN country and city render as dependent selects
