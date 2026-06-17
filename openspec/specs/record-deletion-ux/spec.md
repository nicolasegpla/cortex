# record-deletion-ux Specification

## Purpose

Define the shared frontend delete flow used by breweries, coffee farms, wine producers, and animal feed producers.

## Requirements

### Requirement: Shared confirmation and feedback flow

The system MUST expose a reusable delete interaction that keeps the delete action visible to authenticated users, opens a custom confirmation modal, shows a pending state during deletion, and renders success or failure feedback inside that modal.

#### Scenario: Confirmed delete succeeds
- GIVEN an authenticated user opens delete for a supported table record
- WHEN the user confirms and the API succeeds
- THEN the modal shows an in-progress state and then success feedback
- AND the deleted row is removed only after success

#### Scenario: Unauthorized delete is explicit
- GIVEN an authenticated user without delete permission opens the modal
- WHEN the user confirms deletion
- THEN the modal stays open and shows an explicit permission error

### Requirement: Delete transport MUST accept empty success bodies

The system MUST treat `204 No Content` delete responses as successful completion and SHALL NOT require a JSON body to finish the UI flow.

#### Scenario: Delete returns 204
- GIVEN the delete endpoint responds with `204 No Content`
- WHEN the frontend completes the request
- THEN the interaction is handled as success without a parse error
