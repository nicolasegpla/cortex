# Delta for wine-producers-crud

## MODIFIED Requirements

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
