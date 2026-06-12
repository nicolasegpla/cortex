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

The system MUST expose an authenticated `/wine-producers` page and mark the wine-producers card as active from the databases page. The list page MUST load records from the API and handle empty and failed loads.

#### Scenario: Active database card opens the list page
- GIVEN an authenticated user on the databases page
- WHEN the user selects the wine producers card
- THEN the card behaves as an active link to `/wine-producers`

#### Scenario: Empty or failed load surfaces usable feedback
- GIVEN the list page requests wine producer data
- WHEN the API returns no rows or the request fails
- THEN the page shows an empty state or an error state instead of a broken table

### Requirement: Manual wine producer creation flow

The system MUST expose an authenticated `/wine-producers/new` form for the initial manual slice. The form MUST require `nombre_comercial`, normalize comma-separated values for the eight array fields, submit supported fields to the API, and redirect to `/wine-producers` after successful creation.

#### Scenario: Successful create redirects to list
- GIVEN an authenticated user completes a valid form
- WHEN the user submits the wine producer form
- THEN the frontend sends a create request and redirects to `/wine-producers` on success

#### Scenario: Create failure keeps the user on the form
- GIVEN the create request fails
- WHEN the user submits the wine producer form
- THEN the page shows an error message and preserves the workflow on `/wine-producers/new`

### Requirement: Advanced parity remains deferred for the first connection

The system MAY defer `search`, `inspect`, `count`, and a dedicated edit form in this first connection, and verification for this change SHALL NOT require those capabilities.

#### Scenario: Acceptance excludes deferred flows
- GIVEN the first wine producer connection is under review
- WHEN completion is evaluated for this change
- THEN CRUD API, list access, create flow, routing, and card activation are sufficient for acceptance
