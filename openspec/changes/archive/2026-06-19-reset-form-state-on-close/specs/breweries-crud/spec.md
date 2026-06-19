# Delta for breweries-crud

## MODIFIED Requirements

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
