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

### Requirement: Brewery create-from-table and modal lifecycle

The system MUST open brewery create inside a reusable modal from `/breweries`, SHALL preserve the mounted list behind the modal, MUST close without route reload when the user cancels, presses Escape on the topmost modal, clicks the backdrop, or submits successfully, and MUST yield a clean form with scroll at top on every open per the `form-modal-state-reset` capability. Closing then reopening the create modal MUST NOT retain previously typed values.
(Previously: The requirement only covered open/close lifecycle without specifying clean state or scroll reset on reopen.)

#### Scenario: Create from table
- GIVEN the brewery list is loaded
- WHEN the user activates `Agregar`
- THEN a create modal opens over `/breweries`

#### Scenario: Close without mutation
- GIVEN the create modal is open and nothing was submitted
- WHEN the user closes the topmost modal
- THEN the modal closes and the list data remains unchanged

#### Scenario: Reopen create modal shows clean state and scroll at top
- GIVEN the brewery create modal was filled and closed
- WHEN the user reopens the create modal
- THEN all fields are empty matching `EMPTY_FORM` and the modal body `scrollTop` is `0`

#### Scenario: Brewery edit is not polluted by prior create state
- GIVEN the brewery create modal was filled and closed
- WHEN the user opens an edit modal for an existing brewery
- THEN the form is prefilled with that brewery's data, not the prior create input

### Requirement: Brewery list refresh after modal submit

The system MUST submit create/update through the existing brewery API, MUST close the form modal after a successful response, and MUST refetch the brewery list before the user continues.

#### Scenario: Successful submit refreshes list
- GIVEN a brewery create or edit modal with valid data
- WHEN submission succeeds
- THEN the modal closes and the list refetch shows the saved record state

#### Scenario: Failed submit preserves retry context
- GIVEN a brewery form modal is open
- WHEN the request fails
- THEN the modal stays open with entered values and actionable error feedback

### Requirement: Manual brewery list access

The system MUST expose an authenticated `/breweries` page and mark the breweries card as active from the databases page. The list page MUST load records from the API, handle empty and failed loads, render a compact summary table with `nombre_cerveceria`, `razon_social`, and `ciudad`, open the shared `row-detail-modal` after explicit row activation, and open brewery create/edit forms as modal overlays without unmounting the list.

#### Scenario: Active database card opens the list page
- GIVEN an authenticated user on the databases page
- WHEN the user selects "Cervecerías"
- THEN the card behaves as an active link to `/breweries`

#### Scenario: Deep link opens create modal from list context
- GIVEN an authenticated user opens `/breweries/new`
- WHEN the route resolves
- THEN the list renders and the create modal opens in front of it

### Requirement: Brewery row actions MUST reuse shared edit and delete flows

The system MUST open brewery Edit from the detail modal as a form modal over the list, MUST keep brewery Delete on the shared `record-deletion-ux` flow, and SHALL keep the selected brewery context while stacked modals are open.

#### Scenario: Modal Edit stays in list context
- GIVEN the brewery detail modal is open
- WHEN the user selects Edit
- THEN the form modal opens for that brewery without leaving `/breweries`

#### Scenario: Invalid edit deep link recovers safely
- GIVEN an authenticated user opens `/breweries/unknown-id/edit`
- WHEN the record cannot be loaded
- THEN the list stays visible and the modal shows not-found recovery with close/back-to-list behavior

#### Scenario: Modal Delete keeps the brewery in context
- GIVEN the brewery detail modal is open
- WHEN the user selects Delete
- THEN the shared delete confirmation flow opens for that same brewery record

### Requirement: Brewery form MUST use dependent country/city selects

The brewery create and edit forms MUST replace free-text `pais`/`ciudad` inputs with the shared `CountryCitySelect` molecule. Submitted `pais`/`ciudad` values MUST remain plain strings matching the backend contract.

#### Scenario: Brewery form renders dependent selects
- GIVEN the brewery create form is opened
- WHEN the form renders the location fields
- THEN country and city render as dependent selects, not text inputs
