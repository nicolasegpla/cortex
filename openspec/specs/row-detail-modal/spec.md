# row-detail-modal Specification

## Purpose

Define a reusable modal that shows full record details and row-level actions for compact producer tables.

## Requirements

### Requirement: Row detail modal MUST present full record details and actions

The system MUST open a reusable detail modal for a selected row, group the full record into labeled sections, and expose Edit and Delete actions within the modal.

#### Scenario: Explicit row activation opens details
- GIVEN a supported compact table row is available
- WHEN the user clicks, taps, or keyboard-activates that row
- THEN a detail modal opens with the full record grouped by section

#### Scenario: Detail modal exposes row actions
- GIVEN the detail modal is open for a record
- WHEN the user reviews the modal footer or actions area
- THEN Edit and Delete actions are available for that same record

### Requirement: Row detail modal MUST close accessibly and non-destructively

The system MUST provide an accessible close control, SHALL support Escape only for the topmost modal, and SHALL close without mutating record data unless the user confirms another action.

#### Scenario: Close leaves data unchanged
- GIVEN the detail modal is open and no destructive action was confirmed
- WHEN the user closes it with the close button, overlay, or Escape
- THEN the modal closes and the underlying record remains unchanged
