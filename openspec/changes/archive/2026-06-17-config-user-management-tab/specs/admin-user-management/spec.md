# Delta for admin-user-management

## ADDED Requirements

### Requirement: Standalone admin route is unavailable

The system MUST NOT expose `/admin` as a reachable user-management destination or sidebar entry after user management moves into Configuration.

#### Scenario: Direct admin route access is blocked
- GIVEN any authenticated user requests `/admin`
- WHEN the router resolves the request
- THEN the system denies that standalone destination with the standard non-success fallback for unavailable routes or redirects to `/config`

#### Scenario: Application navigation omits Administración
- GIVEN an authenticated user opens the main shell navigation
- WHEN navigation items render
- THEN the system does not show an `Administración` entry

## MODIFIED Requirements

### Requirement: Super admin can provision a user with explicit role selection

The system MUST allow only `super_admin` users to create a user by submitting email, password, password confirmation, and role/type from the Configuration `Usuarios` tab. The system MUST reject creation when confirmation does not match or required fields are missing.
(Previously: Creation was initiated from a standalone admin user-management screen.)

#### Scenario: Super admin creates a user successfully
- GIVEN an authenticated `super_admin` is on the Configuration `Usuarios` tab
- WHEN the user submits matching email, password, password confirmation, and role/type values
- THEN the system creates the platform user and returns a success result with the assigned role/type

#### Scenario: Password confirmation mismatch blocks creation
- GIVEN an authenticated `super_admin` enters a password and a different password confirmation
- WHEN the user submits the create form
- THEN the system rejects the request and explains that the password confirmation must match

### Requirement: Super admin can view and remove managed users

The system MUST allow a `super_admin` to list existing platform users and delete a selected user from the Configuration `Usuarios` tab.
(Previously: Listing and deletion were performed from a standalone admin user-management screen.)

#### Scenario: Super admin views the user directory
- GIVEN an authenticated `super_admin` opens the Configuration `Usuarios` tab
- WHEN the page loads available users
- THEN the system returns a list of platform users with enough identity data to choose a user for deletion

#### Scenario: Super admin deletes a user
- GIVEN an authenticated `super_admin` selects an existing managed user for deletion
- WHEN the deletion is confirmed
- THEN the system removes that user from the managed user list

### Requirement: User management remains restricted to super admins

The system MUST expose user-management access only through the Configuration `Usuarios` tab for `super_admin` users and MUST deny non-`super_admin` requests to list, create, or delete users.
(Previously: Restriction was expressed as hidden admin navigation plus standalone admin access control.)

#### Scenario: Non-admin configuration excludes user management
- GIVEN an authenticated user without `super_admin` role
- WHEN the Configuration page renders
- THEN the system does not show the `Usuarios` tab

#### Scenario: Non-admin access is rejected server-side
- GIVEN an authenticated user without `super_admin` role
- WHEN the user calls an admin user-management endpoint
- THEN the system rejects the request as unauthorized for that role
