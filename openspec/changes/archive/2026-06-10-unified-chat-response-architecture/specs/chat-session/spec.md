# Delta for chat-session

## MODIFIED Requirements

### Requirement: Backend-Mediated Multi-Provider Chat

The system MUST send all chat traffic through the Cortex backend and SHALL support V1 provider selection for OpenAI, Anthropic, Gemini, and DeepSeek through the selected direct provider adapter. The chat request MAY ask for tool-backed answers, and database-backed behavior MUST be available for any registered entity through approved server-side tools and the generic response engine.

(Previously: Database-backed behavior was limited at the spec level to brewery queries only.)

#### Scenario: Stream a provider response
- GIVEN the user has a valid credential for a selected supported provider
- WHEN the user sends a message
- THEN Cortex routes the request through the selected provider adapter
- AND the assistant response is streamed back incrementally to the workspace

#### Scenario: Prevent direct provider access from browser
- GIVEN a browser session uses the chat workspace
- WHEN a message is sent
- THEN the browser never sends the provider credential or vendor-bound request directly to an external LLM provider

#### Scenario: Use registered-entity database-backed answers
- GIVEN a user asks a factual question for a registered entity in a tool-enabled session
- WHEN tool-backed behavior is available
- THEN Cortex may answer using that entity's approved tools and registry metadata
- AND the request does not expand to unrestricted SQL or unregistered entities
