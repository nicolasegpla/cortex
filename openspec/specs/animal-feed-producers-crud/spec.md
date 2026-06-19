# animal-feed-producers-crud Specification

## Purpose

Provide the first manual connection for `animal_feed_producers`, aligned with the coffee-farms first-connection slice: authenticated backend CRUD plus frontend list/create access. Advanced parity remains deferred.

## Requirements

### Requirement: Authenticated animal feed producer CRUD API

The system MUST expose authenticated `POST /animal-feed-producers`, `GET /animal-feed-producers`, `GET /animal-feed-producers/{id}`, `PUT /animal-feed-producers/{id}`, and `DELETE /animal-feed-producers/{id}` operations backed by `public.animal_feed_producers`. Delete access SHALL reuse the existing privileged delete guard pattern already used by manual CRUD routers.

#### Scenario: Create and retrieve a producer
- GIVEN an authenticated user and a valid producer payload
- WHEN the user creates a record and requests it by id
- THEN the API returns `201 Created` and `200 OK`
- AND the record includes persisted id and timestamps

#### Scenario: Non-privileged delete is rejected
- GIVEN an authenticated user without the privileged delete role
- WHEN the user deletes an existing producer
- THEN the API returns `403 Forbidden`

### Requirement: Animal feed producer schema MUST match the existing migration

The system MUST require `razon_social`, support nullable text fields for the remaining columns, accept `especies_manejadas` and `productos_fabricados` as text arrays, and return `created_at` and `updated_at`. The system SHALL NOT require enum-style validation for free-text columns that have no DB constraint.

#### Scenario: Valid text arrays are accepted
- GIVEN a payload with `razon_social` and comma-derived array values
- WHEN the payload is submitted to create or update a producer
- THEN the API accepts the payload and returns the stored arrays

#### Scenario: Missing required business name is rejected
- GIVEN a payload without `razon_social`
- WHEN the client submits the payload
- THEN the API returns a validation error and does not persist the record

### Requirement: Manual animal feed producer list access

The system MUST expose an authenticated `/animal-feed-producers` page and mark the animal-feed card as active from the databases page. The list page MUST load records from the API, handle empty and failed loads, render a compact summary table with no more than eight visible data columns, and open the shared `row-detail-modal` with full record data plus Edit and Delete actions after explicit row activation.
(Previously: The list only had to load records and show feedback states for the full-width table.)

#### Scenario: Active database card opens the list page
- GIVEN an authenticated user on the databases page
- WHEN the user selects "Alimentos para animales"
- THEN the card behaves as an active link to `/animal-feed-producers`

#### Scenario: Empty or failed load surfaces usable feedback
- GIVEN the list page requests producer data
- WHEN the API returns no rows or the request fails
- THEN the page shows an empty state or an error state instead of a broken table

#### Scenario: Row activation opens animal feed producer details
- GIVEN the animal feed producer list shows a compact summary row
- WHEN the user explicitly activates that row
- THEN the shared detail modal opens with the full record and Edit/Delete actions

### Requirement: Manual animal feed producer creation flow

The system MUST expose an authenticated `/animal-feed-producers/new` form for the initial manual slice. The form MUST require `razon_social`, normalize comma-separated values for `especies_manejadas` and `productos_fabricados`, submit supported fields to the API, and redirect to `/animal-feed-producers` after successful creation. When the create form is rendered in the list modal, it MUST yield a clean form with scroll at top on every open per the `form-modal-state-reset` capability, and closing then reopening MUST NOT retain previously typed values.
(Previously: The requirement only covered route form submission and redirection, without specifying clean state or scroll reset on modal reopen.)

#### Scenario: Successful create redirects to list
- GIVEN an authenticated user completes a valid form
- WHEN the user submits the producer form
- THEN the frontend sends a create request and redirects to `/animal-feed-producers` on success

#### Scenario: Create failure keeps the user on the form
- GIVEN the create request fails
- WHEN the user submits the form
- THEN the page shows an error message and preserves the workflow on `/animal-feed-producers/new`

#### Scenario: Reopen create modal shows clean state and scroll at top
- GIVEN the animal feed producer create modal was filled and closed
- WHEN the user reopens the create modal
- THEN all fields are empty matching `EMPTY_FORM` and the modal body `scrollTop` is `0`

#### Scenario: Animal feed producer edit is not polluted by prior create state
- GIVEN the animal feed producer create modal was filled and closed
- WHEN the user opens an edit modal for an existing producer
- THEN the form is prefilled with that producer's data, not the prior create input

### Requirement: Advanced parity remains deferred for the first connection

The system MAY defer `search`, `inspect`, and `count` in this first connection, but SHALL include a dedicated authenticated edit UI with route entry, prefilled data, update submission, and return-to-list behavior. Verification for this change MUST require edit-flow coverage.

#### Scenario: Acceptance includes the edit flow
- GIVEN the animal feed producer connection is reviewed after this change
- WHEN completion is evaluated
- THEN CRUD API, list access, create flow, and edit flow are required for acceptance

### Requirement: Manual animal feed producer deletion flow

The `/animal-feed-producers` list MUST use the shared `record-deletion-ux` flow for hard-delete actions. The delete action MUST remain visible to authenticated users, require confirmation, and show in-modal success or error feedback.

#### Scenario: Animal feed producer delete succeeds
- GIVEN an authenticated user confirms deleting an existing producer
- WHEN the delete request succeeds
- THEN the list removes that row and the modal shows success feedback

#### Scenario: Animal feed producer delete is rejected
- GIVEN an authenticated user confirms deletion but the request fails
- WHEN the API returns `403` or another error
- THEN the modal shows the error and the row remains visible

### Requirement: Animal feed producer form MUST use dependent country/city selects

The animal feed producer create and edit forms MUST replace free-text `pais`/`ciudad` inputs with the shared `CountryCitySelect` molecule. The form's `handleChange` MUST accept `HTMLSelectElement` events in addition to `HTMLInputElement`.

#### Scenario: Animal feed producer form renders dependent selects
- GIVEN the animal feed producer create form is opened
- WHEN the form renders the location fields
- THEN country and city render as dependent selects and handleChange handles select events
