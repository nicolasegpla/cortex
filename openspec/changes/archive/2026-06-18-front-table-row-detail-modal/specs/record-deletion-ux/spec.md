# Delta for record-deletion-ux

## MODIFIED Requirements

### Requirement: Shared confirmation and feedback flow

The system MUST expose a reusable delete interaction that keeps the delete action visible to authenticated users from the current record context, including row detail modals, opens a custom confirmation modal, shows a pending state during deletion, and renders success or failure feedback inside that modal.
(Previously: The shared delete flow did not define modal-launched delete entry points.)

#### Scenario: Confirmed delete succeeds
- GIVEN an authenticated user opens delete for a supported record from its current UI context
- WHEN the user confirms and the API succeeds
- THEN the confirmation modal shows progress and success feedback
- AND the deleted row is removed only after success

#### Scenario: Unauthorized delete is explicit
- GIVEN an authenticated user without delete permission opens the confirmation modal
- WHEN the user confirms deletion
- THEN the modal stays open and shows an explicit permission error
