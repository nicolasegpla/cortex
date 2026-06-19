# form-modal-state-reset Specification

## Purpose

Define the shared behavior for entity create-form modals across all list pages: every open MUST present a clean form with scroll at the top, and create-form state MUST NOT bleed into edit sessions or later opens. All four entity lists (breweries, coffee farms, wine producers, animal feed producers) MUST implement this capability.

## Requirements

### Requirement: Create form MUST mount with clean state on every open

The system MUST render the create form only while the modal is open so closing unmounts it and reopening remounts it with `EMPTY_FORM` defaults. Create-form state from a previous open MUST NOT persist into a later open. Edit forms MUST receive their `initialData` on mount and MUST NOT mix prior create-form state.

#### Scenario: Open create form shows empty fields
- GIVEN an entity list is loaded
- WHEN the user opens the create modal
- THEN all form fields match `EMPTY_FORM` defaults

#### Scenario: Close and reopen yields clean state
- GIVEN the create modal is open with user-typed values
- WHEN the user closes the modal via the × button, `Cancelar`, backdrop, or Escape and reopens it
- THEN all fields are empty and match `EMPTY_FORM` defaults

#### Scenario: Edit session is not polluted by prior create state
- GIVEN the create modal was filled and closed
- WHEN the user opens an edit modal for an existing record
- THEN the form is prefilled with that record's data, not the prior create input

### Requirement: Modal body MUST scroll to top on open

The shared `EntityFormModal` MUST reset its `.entity-form-modal__body` scroll position to the top whenever the modal transitions from closed to open.

#### Scenario: Scroll resets when modal reopens
- GIVEN the modal body was scrolled down in a previous open
- WHEN the modal reopens
- THEN the `.entity-form-modal__body` `scrollTop` equals `0`

#### Scenario: Fresh open starts at top
- GIVEN the modal has not been opened before
- WHEN the modal opens
- THEN the modal body `scrollTop` equals `0`

## Coverage Matrix

| List | Clean state on open | Clean state on reopen | Edit isolation | Scroll to top on open |
|------|:---:|:---:|:---:|:---:|
| breweries | YES | YES | YES | YES |
| coffee-farms | YES | YES | YES | YES |
| wine-producers | YES | YES | YES | YES |
| animal-feed-producers | YES | YES | YES | YES |

Scroll-to-top is verified centrally in `EntityFormModal`; clean-state and edit-isolation are verified per list.
