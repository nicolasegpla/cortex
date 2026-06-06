# Delta for Chat Session

## MODIFIED Requirements

### Requirement: Chat-First Workspace Entry

The system MUST present chat as the primary authenticated workspace inside the application shell and SHALL keep manual browse/navigation available as a secondary shell destination.
(Previously: Chat opened in the previous header-based layout and manual browse was the secondary fallback path.)

#### Scenario: User lands in chat first
- GIVEN an authenticated user opens the workspace
- WHEN the default application route resolves
- THEN the primary content area shows the chat workspace inside the application shell
- AND the shell marks chat as the active destination

#### Scenario: User needs manual fallback
- GIVEN the user is in the chat workspace
- WHEN they choose the secondary browse/navigation destination from the shell
- THEN the manual browse view is reachable without leaving the authenticated workspace
