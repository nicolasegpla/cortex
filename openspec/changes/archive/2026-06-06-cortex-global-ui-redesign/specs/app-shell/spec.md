# App-Shell Specification

## Purpose

Define the persistent authenticated shell that frames all workspace routes.

## Requirements

### Requirement: Persistent Shell Layout

The system MUST render authenticated routes inside a persistent application shell with a sidebar, top bar, and central workspace. The shell SHALL keep global navigation and actions available while route content changes.

#### Scenario: User moves between authenticated routes
- GIVEN an authenticated user is inside the workspace
- WHEN they open another shell destination
- THEN the shell chrome remains present
- AND only the workspace content changes

#### Scenario: Viewport becomes narrow
- GIVEN the user is on an authenticated route
- WHEN the viewport crosses a smaller breakpoint
- THEN the sidebar changes to compact or overlay presentation
- AND the current workspace remains reachable
