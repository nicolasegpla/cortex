# Delta for animal-feed-producers-crud

## ADDED Requirements

### Requirement: Manual animal feed producer deletion flow

The `/animal-feed-producers` list MUST use the shared `record-deletion-ux` flow for hard-delete actions. The delete action MUST remain visible to authenticated users, require confirmation, and show in-modal success or error feedback.

#### Scenario: Animal feed producer delete succeeds
- GIVEN an authenticated user confirms deleting an existing producer
- WHEN the delete request succeeds
- THEN the list removes that row and the modal shows success feedback

#### Scenario: Animal feed producer delete is rejected
- GIVEN an authenticated user confirms deletion but the request fails
- WHEN the API returns `403` or another error
- THEN the modal shows the error and the row remains visible
