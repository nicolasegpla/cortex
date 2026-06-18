# breweries-crud Specification

## Purpose

Define authenticated brewery CRUD list behavior with compact rows and modal-driven record actions.

## Requirements

### Requirement: Authenticated brewery CRUD API

The system MUST expose authenticated `POST /breweries`, `GET /breweries`, `GET /breweries/{id}`, `PUT /breweries/{id}`, and `DELETE /breweries/{id}` operations backed by `public.breweries`.

#### Scenario: Create and retrieve a brewery
- GIVEN an authenticated user and a valid brewery payload
- WHEN the user creates a record and then requests it by id
- THEN the API returns `201 Created` and `200 OK`

### Requirement: Manual brewery list access

The system MUST expose an authenticated `/breweries` page and mark the breweries card as active from the databases page. The list page MUST load records from the API, handle empty and failed loads, render a compact summary table with `nombre_cerveceria`, `razon_social`, and `ciudad`, and open the shared `row-detail-modal` with full record data plus Edit and Delete actions after explicit row activation.

#### Scenario: Active database card opens the list page
- GIVEN an authenticated user on the databases page
- WHEN the user selects “Cervecerías”
- THEN the card behaves as an active link to `/breweries`

#### Scenario: Row activation opens brewery details
- GIVEN the brewery list shows a compact summary row
- WHEN the user explicitly activates that row
- THEN the shared detail modal opens with the full record and Edit/Delete actions

#### Scenario: Hover alone does not open brewery details
- GIVEN the brewery list is visible
- WHEN the user only hovers or focuses a row without activation
- THEN no detail modal opens

### Requirement: Brewery row actions MUST reuse shared edit and delete flows

The system MUST route brewery Edit actions to the existing brewery edit flow and MUST route brewery Delete actions through the shared `record-deletion-ux` confirmation flow from the detail modal.

#### Scenario: Modal Edit opens the brewery edit flow
- GIVEN the brewery detail modal is open
- WHEN the user selects Edit
- THEN the system navigates to the brewery edit route for that record

#### Scenario: Modal Delete keeps the brewery in context
- GIVEN the brewery detail modal is open
- WHEN the user selects Delete
- THEN the shared delete confirmation flow opens for that same brewery record
