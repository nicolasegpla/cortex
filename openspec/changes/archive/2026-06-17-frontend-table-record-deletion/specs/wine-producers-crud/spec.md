# Delta for wine-producers-crud

## ADDED Requirements

### Requirement: Manual wine producer deletion flow

The `/wine-producers` list MUST use the shared `record-deletion-ux` flow for hard-delete actions. The delete action MUST remain visible to authenticated users, require confirmation, and show in-modal success or error feedback.

#### Scenario: Wine producer delete succeeds
- GIVEN an authenticated user confirms deleting an existing wine producer
- WHEN the delete request succeeds
- THEN the list removes that row and the modal shows success feedback

#### Scenario: Wine producer delete is rejected
- GIVEN an authenticated user confirms deletion but the request fails
- WHEN the API returns `403` or another error
- THEN the modal shows the error and the row remains visible
