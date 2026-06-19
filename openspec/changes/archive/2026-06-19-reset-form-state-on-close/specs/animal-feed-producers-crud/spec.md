# Delta for animal-feed-producers-crud

## MODIFIED Requirements

### Requirement: Manual animal feed producer creation flow

The system MUST expose an authenticated `/animal-feed-producers/new` form for the initial manual slice. The form MUST require `razon_social`, normalize comma-separated values for `especies_manejadas` and `productos_fabricados`, submit supported fields to the API, and redirect to `/animal-feed-producers` after successful creation. When the create form is rendered in the list modal, it MUST yield a clean form with scroll at top on every open per the `form-modal-state-reset` capability, and closing then reopening MUST NOT retain previously typed values.
(Previously: The requirement only covered route form submission and redirection, without specifying clean state or scroll reset on modal reopen.)

#### Scenario: Successful create redirects to list

- GIVEN an authenticated user completes a valid form
- WHEN the user submits the producer form
- THEN the frontend sends a create request and redirects to `/animal-feed-producers` on success

#### Scenario: Create failure keeps the user on the form

- GIVEN the create request fails
- WHEN the user submits the producer form
- THEN the page shows an error message and preserves the workflow on `/animal-feed-producers/new`

#### Scenario: Reopen create modal shows clean state and scroll at top

- GIVEN the animal feed producer create modal was filled and closed
- WHEN the user reopens the create modal
- THEN all fields are empty matching `EMPTY_FORM` and the modal body `scrollTop` is `0`

#### Scenario: Animal feed producer edit is not polluted by prior create state

- GIVEN the animal feed producer create modal was filled and closed
- WHEN the user opens an edit modal for an existing producer
- THEN the form is prefilled with that producer's data, not the prior create input
