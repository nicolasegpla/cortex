# configuration-tabs Specification

## Purpose

Provide Configuration as a multi-panel shell for administrative settings.

## Requirements

### Requirement: Configuration supports role-aware tabs

The system MUST render Configuration as a tabbed workspace with a persistent tab list and one active content panel. It MUST default to `Proveedores de modelos` and MUST show `Usuarios` only to authenticated `super_admin` users.

#### Scenario: Super admin sees both configuration tabs
- GIVEN an authenticated `super_admin` opens Configuration
- WHEN the page renders
- THEN the system shows `Proveedores de modelos` and `Usuarios`
- AND `Proveedores de modelos` is active until the user selects another tab

#### Scenario: Non-admin does not receive the Usuarios tab
- GIVEN an authenticated user without `super_admin` role opens Configuration
- WHEN the page renders
- THEN the system shows `Proveedores de modelos` only
- AND no `Usuarios` tab is available to select
