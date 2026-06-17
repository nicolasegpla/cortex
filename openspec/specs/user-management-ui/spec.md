# user-management-ui Specification

## Purpose

Render user administration inside Configuration without changing backend behavior.

## Requirements

### Requirement: Usuarios tab shows the managed user directory

The system MUST render the `Usuarios` panel with a visible title, a create-user action, and a users table that follows the existing database-table visual style.

#### Scenario: Super admin opens the embedded directory
- GIVEN an authenticated `super_admin` selects the `Usuarios` tab
- WHEN the panel content loads
- THEN the system shows the user-management title, the create-user button, and the users table

#### Scenario: Empty directory keeps management affordances
- GIVEN an authenticated `super_admin` selects the `Usuarios` tab and no managed users are returned
- WHEN the panel renders
- THEN the system still shows the title and create-user action
- AND the table area communicates that no users are available

### Requirement: Create user uses the configuration modal pattern

The system MUST open user creation in a modal/popup styled consistently with the existing Configuration editor modal pattern.

#### Scenario: Super admin opens the create-user modal
- GIVEN an authenticated `super_admin` is viewing the `Usuarios` tab
- WHEN the user activates the create-user button
- THEN the system opens the create-user modal above the Configuration screen

#### Scenario: Super admin closes the modal without creating a user
- GIVEN the create-user modal is open
- WHEN the user cancels or dismisses it
- THEN the system closes the modal
- AND the `Usuarios` tab remains visible underneath
