# Delta for Chat Session

## MODIFIED Requirements

### Requirement: Backend-Mediated Multi-Provider Chat

The system MUST send all chat traffic through the Cortex backend and SHALL support multi-provider chat where the user selects a model and the provider is derived from that model. Provider selection is no longer a direct user action; the active provider is implied by the active model. The chat request MAY ask for tool-backed answers, and database-backed behavior MUST be available for any registered entity through approved server-side tools and the generic response engine.

(Previously: V1 provider selection was a direct user action via a separate top-bar provider select, alongside a separate model select.)

#### Scenario: Stream a provider response

- GIVEN the user has a valid credential for the provider of the selected model
- WHEN the user sends a message
- THEN Cortex routes the request through the derived provider adapter
- AND the assistant response is streamed back incrementally to the workspace

#### Scenario: Provider derived from selected model

- GIVEN the user selects a model belonging to provider P
- WHEN the selection is applied
- THEN the active provider becomes P without a separate provider action

#### Scenario: Prevent direct provider access from browser

- GIVEN a browser session uses the chat workspace
- WHEN a message is sent
- THEN the browser never sends the provider credential or vendor-bound request directly to an external LLM provider

#### Scenario: Use registered-entity database-backed answers

- GIVEN a user asks a factual question for a registered entity in a tool-enabled session
- WHEN tool-backed behavior is available
- THEN Cortex may answer using that entity's approved tools and registry metadata
- AND the request does not expand to unrestricted SQL or unregistered entities

## ADDED Requirements

### Requirement: Active Model as Single Source of Truth

The system MUST treat the active model as the authoritative selection. The active provider MUST be a derived value of the active model, not an independently user-settable state. Persisted selections MUST be sanitized on rehydration: an invalid persisted model MUST resolve to a valid model/provider pair.

#### Scenario: Invalid persisted model is sanitized

- GIVEN a persisted model no longer exists in any validated provider's model list
- WHEN the store rehydrates
- THEN a valid default model/provider pair is restored

#### Scenario: Model belonging to unvalidated provider

- GIVEN the active model belongs to a provider without valid credentials
- WHEN the chat workspace loads
- THEN the selection is sanitized to a validated provider's default model
