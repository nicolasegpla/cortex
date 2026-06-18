# Delta for modal-forms-for-table-crud (breweries pilot)

## Domain: breweries-crud

## ADDED Requirements

### Requirement: Brewery create-from-table and modal lifecycle
The system MUST open brewery create inside a reusable modal from `/breweries`, SHALL preserve the mounted list behind the modal, and MUST close without route reload when the user cancels, presses Escape on the topmost modal, clicks the backdrop, or submits successfully.

#### Scenario: Create from table
- GIVEN the brewery list is loaded
- WHEN the user activates `Agregar`
- THEN a create modal opens over `/breweries`

#### Scenario: Close without mutation
- GIVEN the create modal is open and nothing was submitted
- WHEN the user closes the topmost modal
- THEN the modal closes and the list data remains unchanged

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

## MODIFIED Requirements

### Requirement: Manual brewery list access
The system MUST expose an authenticated `/breweries` page and mark the breweries card as active from the databases page. The list page MUST load records from the API, handle empty and failed loads, render a compact summary table with `nombre_cerveceria`, `razon_social`, and `ciudad`, open the shared `row-detail-modal` after explicit row activation, and open brewery create/edit forms as modal overlays without unmounting the list.
(Previously: the list only opened details; create/edit used separate pages.)

#### Scenario: Active database card opens the list page
- GIVEN an authenticated user on the databases page
- WHEN the user selects `Cervecerías`
- THEN the card behaves as an active link to `/breweries`

#### Scenario: Deep link opens create modal from list context
- GIVEN an authenticated user opens `/breweries/new`
- WHEN the route resolves
- THEN the list renders and the create modal opens in front of it

### Requirement: Brewery row actions MUST reuse shared edit and delete flows
The system MUST open brewery Edit from the detail modal as a form modal over the list, MUST keep brewery Delete on the shared `record-deletion-ux` flow, and SHALL keep the selected brewery context while stacked modals are open.
(Previously: Edit navigated to the brewery edit route.)

#### Scenario: Modal Edit stays in list context
- GIVEN the brewery detail modal is open
- WHEN the user selects Edit
- THEN the form modal opens for that brewery without leaving `/breweries`

#### Scenario: Invalid edit deep link recovers safely
- GIVEN an authenticated user opens `/breweries/unknown-id/edit`
- WHEN the record cannot be loaded
- THEN the list stays visible and the modal shows not-found recovery with close/back-to-list behavior

## Domain: entity-edit-flows

### Requirement: Brewery edit routes become modal entry points
The system MUST preserve `/breweries/:id/edit` as a deep-linkable entry point, but SHALL resolve it into the brewery list plus an edit modal driven by search-param-compatible state.
(Previously: `/breweries/:id/edit` rendered a standalone edit page.)

#### Scenario: Browser back closes the modal
- GIVEN the user reached brewery create/edit through modal navigation
- WHEN the user presses the browser back button
- THEN the modal closes and the URL returns to clean `/breweries`

## Domain: Non-functional

### Requirement: Accessibility, performance, and coverage
The system MUST provide labelled modal titles, accessible close controls, focus return to the triggering control, and Escape handling only for the topmost modal. The modal flow SHOULD avoid redundant list reloads while open and MUST use one refetch after successful submit. The breweries pilot MUST add or update automated tests covering create modal, edit modal, deep links, back-button close, failed submit retention, and invalid-id recovery.

#### Scenario: Focus returns on close
- GIVEN a user opened the form modal from a table or detail action
- WHEN the modal closes
- THEN focus returns to the triggering control

## Affected files
- Create: `cortex-frontend/src/features/breweries/BreweryForm.tsx`
- Create: `cortex-frontend/src/presentation/components/organisms/EntityFormModal/*`
- Modify: `cortex-frontend/src/features/breweries/BreweryList.tsx`
- Modify: `cortex-frontend/src/app/router.tsx`
- Modify: `cortex-frontend/src/features/breweries/BreweryList.test.tsx`
- Modify/Add: brewery form/modal tests and router tests
- Delete: `cortex-frontend/src/features/breweries/BreweryCreate.tsx`, `BreweryEdit.tsx`

## Out of scope
- Coffee farms, wine producers, and animal feed producers
- Generic form builders, Zustand CRUD cache, optimistic updates, and unrelated refactors

## Open questions / assumptions
- Assumption: breweries is the only migration in this change
- Assumption: deep links remain supported via list + modal semantics
- Assumption: success closes immediately after refetch, with no intermediate success screen
- Open question: exact search-param shape may vary as long as route compatibility and back-button behavior stay intact
