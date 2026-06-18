# sidebar-user-menu Specification

## Purpose

Provide persistent authenticated identity and logout access in the sidebar footer without changing the existing sidebar visual language.

## Requirements

### Requirement: Sidebar footer shows the authenticated user summary

The system MUST render a user menu in the sidebar footer for authenticated application sessions. The menu MUST show the current user's email and role/type using the existing sidebar visual language.

#### Scenario: Expanded sidebar shows identity details
- GIVEN an authenticated user is viewing the application shell with the sidebar expanded
- WHEN the sidebar renders
- THEN the footer shows the user's email and current role/type

#### Scenario: Long email remains contained
- GIVEN an authenticated user has an email longer than the available footer width
- WHEN the expanded sidebar renders the footer
- THEN the email presentation remains contained inside the sidebar without breaking the layout

### Requirement: Sidebar footer provides a logout action

The system MUST provide a logout action in the sidebar footer. When invoked, the system MUST clear local authentication state and navigate the user to `/login`.

#### Scenario: User logs out from the sidebar footer
- GIVEN an authenticated user can see the sidebar footer
- WHEN the user activates the logout action
- THEN the system clears the local authenticated user, session, and role/type state
- AND the system navigates to `/login`

#### Scenario: Logout remains available without hover-only access
- GIVEN an authenticated user is navigating with keyboard or pointer input
- WHEN the sidebar footer is rendered
- THEN the logout action is available as a direct visible control

### Requirement: Collapsed sidebar preserves logout access

The system MUST adapt the sidebar footer to the collapsed 64px sidebar state. In collapsed mode, the system MUST hide identity text and keep an accessible icon-only logout action.

#### Scenario: Collapsed sidebar hides identity text
- GIVEN an authenticated user has collapsed the sidebar to 64px width
- WHEN the footer renders
- THEN the email and role/type text are not displayed
- AND the logout control remains available

#### Scenario: Collapsed logout control stays understandable
- GIVEN an authenticated user is using the collapsed sidebar
- WHEN the user focuses or queries the icon-only logout control
- THEN the control exposes an accessible name that identifies it as logout
