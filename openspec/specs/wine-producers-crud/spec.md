# wine-producers-crud Specification

## Purpose

Provide the first manual connection for `wine_producers`: authenticated backend CRUD plus frontend list/create access, aligned with the existing coffee-farms and animal-feed first-connection pattern. Search, inspect, count, and edit parity remain deferred.

## Requirements

### Requirement: Authenticated wine producer CRUD API

The system MUST expose authenticated `POST /wine-producers`, `GET /wine-producers`, `GET /wine-producers/{id}`, `PUT /wine-producers/{id}`, and `DELETE /wine-producers/{id}` operations backed by `public.wine_producers`. Delete access SHALL reuse the existing privileged delete guard pattern used by manual CRUD routers.

#### Scenario: Create and retrieve a wine producer
- GIVEN an authenticated user and a valid wine producer payload
- WHEN the user creates a record and then requests it by id
- THEN the API returns `201 Created` and `200 OK`
- AND the record includes the persisted id and timestamps

#### Scenario: Unauthorized or non-privileged access is rejected
- GIVEN a caller without valid auth or without the privileged delete role
- WHEN the caller invokes a protected CRUD endpoint or deletes a record
- THEN the API returns `401 Unauthorized` or `403 Forbidden` as appropriate

### Requirement: Wine producer schema MUST match migration constraints

The system MUST require `nombre_comercial`, support nullable text fields for the remaining scalar columns, accept `marcas`, `tipo_uva`, `tipo_vino`, `levaduras_utilizadas`, `botellas_utilizadas`, `nutrientes_utilizados`, `conservantes_utilizados`, and `clarificantes_utilizados` as text arrays, and return `created_at` and `updated_at`. The system SHALL NOT enforce enum-style validation for free-text columns that have no DB constraint.

#### Scenario: Valid arrays are accepted
- GIVEN a payload with `nombre_comercial` and comma-derived array values
- WHEN the payload is submitted to create or update a producer
- THEN the API accepts the payload and returns the stored arrays

#### Scenario: Missing commercial name is rejected
- GIVEN a payload without `nombre_comercial`
- WHEN the client submits the payload
- THEN the API returns a validation error and does not persist the record

### Requirement: Manual wine producer list access

The system MUST expose an authenticated `/wine-producers` page and mark the wine-producers card as active from the databases page. The list page MUST load records from the API, handle empty and failed loads, render a compact summary table with no more than eight visible data columns, and open the shared `row-detail-modal` with full record data plus Edit and Delete actions after explicit row activation.
(Previously: The list only had to load records and show feedback states for the full-width table.)

#### Scenario: Active database card opens the list page
- GIVEN an authenticated user on the databases page
- WHEN the user selects the wine producers card
- THEN the card behaves as an active link to `/wine-producers`

#### Scenario: Empty or failed load surfaces usable feedback
- GIVEN the list page requests wine producer data
- WHEN the API returns no rows or the request fails
- THEN the page shows an empty state or an error state instead of a broken table

#### Scenario: Row activation opens wine producer details
- GIVEN the wine producer list shows a compact summary row
- WHEN the user explicitly activates that row
- THEN the shared detail modal opens with the full record and Edit/Delete actions

### Requirement: Manual wine producer creation flow

The system MUST expose an authenticated `/wine-producers/new` form for the initial manual slice. The form MUST require `nombre_comercial`, normalize comma-separated values for the eight array fields, submit supported fields to the API, and redirect to `/wine-producers` after successful creation. When the create form is rendered in the list modal, it MUST yield a clean form with scroll at top on every open per the `form-modal-state-reset` capability, and closing then reopening MUST NOT retain previously typed values.
(Previously: The requirement only covered route form submission and redirection, without specifying clean state or scroll reset on modal reopen.)

#### Scenario: Successful create redirects to list
- GIVEN an authenticated user completes a valid form
- WHEN the user submits the wine producer form
- THEN the frontend sends a create request and redirects to `/wine-producers` on success

#### Scenario: Create failure keeps the user on the form
- GIVEN the create request fails
- WHEN the user submits the wine producer form
- THEN the page shows an error message and preserves the workflow on `/wine-producers/new`

#### Scenario: Reopen create modal shows clean state and scroll at top
- GIVEN the wine producer create modal was filled and closed
- WHEN the user reopens the create modal
- THEN all fields are empty matching `EMPTY_FORM` and the modal body `scrollTop` is `0`

#### Scenario: Wine producer edit is not polluted by prior create state
- GIVEN the wine producer create modal was filled and closed
- WHEN the user opens an edit modal for an existing wine producer
- THEN the form is prefilled with that wine producer's data, not the prior create input

### Requirement: Advanced parity remains deferred for the first connection

The system MAY defer `search`, `inspect`, and `count` in this first connection, but SHALL include a dedicated authenticated edit form with route entry, prefilled data, update submission, and return-to-list behavior. Verification for this change MUST require edit-flow coverage.

#### Scenario: Acceptance includes the edit flow
- GIVEN the wine producer connection is reviewed after this change
- WHEN completion is evaluated
- THEN CRUD API, list access, create flow, and edit flow are required for acceptance

### Requirement: Manual wine producer deletion flow

The `/wine-producers` list MUST use the shared `record-deletion-ux` flow for hard-delete actions. The delete action MUST remain visible to authenticated users, require confirmation, and show in-modal success or error feedback.

#### Scenario: Wine producer delete succeeds
- GIVEN an authenticated user confirms deleting an existing wine producer
- WHEN the delete request succeeds
- THEN the list removes that row and the modal shows success feedback

#### Scenario: Wine producer delete is rejected
- GIVEN an authenticated user confirms deletion but the request fails
- WHEN the API returns `403` or another error
- THEN the modal shows the error and the row remains visible

### Requirement: Wine producer form MUST use dependent country/city selects

The wine producer create and edit forms MUST replace free-text `pais`/`ciudad` inputs with the shared `CountryCitySelect` molecule. The form's `handleChange` MUST accept `HTMLSelectElement` events in addition to `HTMLInputElement`.

#### Scenario: Wine producer form renders dependent selects
- GIVEN the wine producer create form is opened
- WHEN the form renders the location fields
- THEN country and city render as dependent selects and handleChange handles select events
