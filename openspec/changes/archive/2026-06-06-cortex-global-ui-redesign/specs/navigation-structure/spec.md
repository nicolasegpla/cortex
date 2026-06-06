# Navigation-Structure Specification

## Purpose

Define the grouped navigation model for the new application shell.

## Requirements

### Requirement: Grouped Shell Navigation

The system MUST present authenticated destinations in grouped navigation for chat, databases, sessions, configuration, and related sections. It SHALL show the active destination and keep core destinations reachable from every authenticated route.

#### Scenario: User opens a grouped destination
- GIVEN the sidebar is visible
- WHEN the user chooses a destination inside a navigation group
- THEN the matching route opens in the workspace
- AND that destination is shown as active

#### Scenario: Sidebar is compact
- GIVEN the shell is in compact navigation mode
- WHEN the user reviews available destinations
- THEN each destination remains distinguishable
- AND grouped navigation still supports route selection
