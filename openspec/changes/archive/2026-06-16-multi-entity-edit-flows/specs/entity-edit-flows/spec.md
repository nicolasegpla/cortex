# entity-edit-flows Specification

## Purpose

Provide authenticated edit-route parity for coffee farms, wine producers, breweries, and animal feed producers.

## Requirements

### Requirement: Entity edit route entry and prefill

The system MUST expose authenticated `/coffee-farms/:id/edit`, `/wine-producers/:id/edit`, `/breweries/:id/edit`, and `/animal-feed-producers/:id/edit` routes. Each route MUST load the record by id, prefill the same editable fields as its create form, and render array-backed values in the create-form input format.

#### Scenario: Edit route opens with prefilled data
- GIVEN an authenticated user selects Edit for an existing record in any supported entity list
- WHEN the edit page loads
- THEN the system shows the matching edit form with values prefilled from that record

#### Scenario: Missing or nonexistent id shows not-found recovery
- GIVEN an authenticated user opens a supported edit route with a missing or nonexistent id
- WHEN the page requests the record
- THEN the system shows a clear not-found state with navigation back to that entity list

### Requirement: Entity update submission returns to the matching list

The system MUST submit edits through the matching entity `PUT /{entity}/{id}` endpoint, preserve create-flow field normalization for supported inputs, and redirect to the matching entity list after a successful update.

#### Scenario: Successful update returns to the entity list
- GIVEN an authenticated user edits a valid existing record
- WHEN the user submits valid changes
- THEN the system updates that record and returns the user to the matching list route
- AND the list workflow remains consistent across all four entities

### Requirement: Entity edit failures preserve retry context

The system SHOULD keep the user on the edit page when an update request fails after the record loads, show actionable error feedback, and preserve entered values for retry.

#### Scenario: Update failure keeps the form available
- GIVEN an authenticated user has loaded a supported edit form
- WHEN the update request fails
- THEN the system shows an error and keeps the current form values on the same edit route
