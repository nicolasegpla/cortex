# admin-user-management Specification

## Purpose

Replace public self-registration with super-admin-controlled user provisioning for Cortex access.

## Requirements

### Requirement: Public registration is unavailable

The system MUST NOT expose a self-service registration route or registration call-to-action in the login experience.

#### Scenario: Login shows no registration entry point
- GIVEN an unauthenticated visitor opens the login page
- WHEN the page renders
- THEN the system shows login-only actions and no registration toggle or link

#### Scenario: Direct registration route is blocked
- GIVEN an unauthenticated visitor requests `/register`
- WHEN the router resolves the request
- THEN the system denies access with the standard non-success fallback for unavailable routes

### Requirement: Super admin can provision a user with explicit role selection

The system MUST allow only `super_admin` users to create a user by submitting email, password, password confirmation, and role/type. The system MUST reject creation when confirmation does not match or required fields are missing.

#### Scenario: Super admin creates a user successfully
- GIVEN an authenticated `super_admin` is on the admin user management screen
- WHEN the user submits matching email, password, password confirmation, and role/type values
- THEN the system creates the platform user and returns a success result with the assigned role/type

#### Scenario: Password confirmation mismatch blocks creation
- GIVEN an authenticated `super_admin` enters a password and a different password confirmation
- WHEN the user submits the create form
- THEN the system rejects the request and explains that the password confirmation must match

### Requirement: Super admin can view and remove managed users

The system MUST allow a `super_admin` to list existing platform users and delete a selected user.

#### Scenario: Super admin views the user directory
- GIVEN an authenticated `super_admin` opens admin user management
- WHEN the page loads available users
- THEN the system returns a list of platform users with enough identity data to choose a user for deletion

#### Scenario: Super admin deletes a user
- GIVEN an authenticated `super_admin` selects an existing managed user for deletion
- WHEN the deletion is confirmed
- THEN the system removes that user from the managed user list

### Requirement: User management remains restricted to super admins

The system MUST hide user-management navigation from users without `super_admin` role and MUST deny non-`super_admin` requests to list, create, or delete users.

#### Scenario: Non-admin navigation excludes user management
- GIVEN an authenticated user without `super_admin` role
- WHEN application navigation renders
- THEN the system does not show the admin user-management entry

#### Scenario: Non-admin access is rejected server-side
- GIVEN an authenticated user without `super_admin` role
- WHEN the user calls an admin user-management endpoint
- THEN the system rejects the request as unauthorized for that role
