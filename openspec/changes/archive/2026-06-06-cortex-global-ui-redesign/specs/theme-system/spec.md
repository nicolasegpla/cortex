# Theme-System Specification

## Purpose

Define runtime theming for the authenticated shell and routed workspace content.

## Requirements

### Requirement: Runtime Theme Switching

The system MUST provide light and dark themes that switch at runtime without a reload and SHALL choose the initial theme from the user's saved choice or system preference.

#### Scenario: First load follows preference
- GIVEN the user has no saved theme choice
- WHEN the shell loads
- THEN the active theme matches the system preference

#### Scenario: User toggles theme during work
- GIVEN the user is on any authenticated route
- WHEN they switch theme mode
- THEN shell and page colors update in place
- AND the chosen theme remains the active preference later
