# Delta for Configuration Tabs

## MODIFIED Requirements

### Requirement: Configuration supports role-aware tabs

The system MUST default to `Usuarios` tab and MUST show it only to `super_admin` users. The `Proveedores de modelos` tab MUST NOT appear. When no tabs are visible (non-super-admin), the system SHALL hide the nav sidebar.

(Previously: defaulted to `Proveedores de modelos`; no zero-tab fallback.)

#### Scenario: Super admin sees Usuarios only

- GIVEN a `super_admin` opens Configuration
- WHEN the page renders
- THEN only `Usuarios` is visible and active
- AND `Proveedores de modelos` is absent

#### Scenario: Non-admin sees no tabs

- GIVEN a non-super-admin opens Configuration
- WHEN the page renders
- THEN the nav sidebar is hidden and content renders directly
