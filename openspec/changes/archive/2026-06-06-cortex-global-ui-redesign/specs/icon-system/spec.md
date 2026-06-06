# Icon-System Specification

## Purpose

Define consistent iconography for shell destinations and shell actions.

## Requirements

### Requirement: Consistent Shell Iconography

The system MUST use consistent icons to identify navigation destinations and shell actions and SHALL keep those icons understandable in both expanded and compact navigation states.

#### Scenario: Expanded navigation shows destination identity
- GIVEN the sidebar is expanded
- WHEN a destination is listed
- THEN its icon appears with its label

#### Scenario: Compact navigation preserves recognition
- GIVEN the sidebar is compact or overlay-based
- WHEN labels are reduced or deferred
- THEN users can still identify each destination without relying on color alone
