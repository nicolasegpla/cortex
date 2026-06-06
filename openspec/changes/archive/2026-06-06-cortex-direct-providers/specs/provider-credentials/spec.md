# Delta for provider-credentials

## MODIFIED Requirements

### Requirement: User Credential Lifecycle

The system MUST allow a user to add, update, remove, and test their own provider credentials for OpenAI, Anthropic, Gemini, and DeepSeek from the workspace.
(Previously: The lifecycle covered OpenAI, Kimi, Minimax, and Anthropic.)

#### Scenario: Save or update a credential
- GIVEN a user enters a provider credential in settings
- WHEN they save it
- THEN the credential is associated with that user and provider
- AND the workspace can later use it for direct provider chat without engineering intervention

#### Scenario: Remove a credential
- GIVEN a stored credential exists for a provider
- WHEN the user deletes it
- THEN that credential is no longer available for future chat or validation requests

### Requirement: Validation and Provider Readiness Feedback

The system MUST let the selected provider adapter validate a provider credential and SHALL present ready, invalid, or unavailable status that guides chat usage.
(Previously: Validation was centralized and provider readiness covered only the earlier phase-1 provider set.)

#### Scenario: Credential validates successfully
- GIVEN a user tests a valid provider credential for OpenAI, Anthropic, Gemini, or DeepSeek
- WHEN validation completes
- THEN the workspace shows that provider as ready for chat

#### Scenario: Credential validation fails
- GIVEN a user tests an invalid, revoked, or unreachable provider credential
- WHEN validation completes
- THEN the workspace shows a non-secret actionable failure state
- AND the user is not misled into believing the provider is ready
