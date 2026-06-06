# Delta for Chat Session

## MODIFIED Requirements

### Requirement: Backend-Mediated Multi-Provider Chat

The system MUST send all chat traffic through the Cortex backend and SHALL support V1 provider selection for OpenAI, Anthropic, Gemini, and DeepSeek through the selected direct provider adapter. The chat request MAY ask for tool-backed answers, but database-backed behavior in the initial implementation MUST be limited to brewery queries through approved server-side tools.

(Previously: chat routing covered provider streaming only and had no defined tool-backed answer path.)

#### Scenario: Stream a provider response
- GIVEN the user has a valid credential for a selected supported provider
- WHEN the user sends a message
- THEN Cortex routes the request through the selected provider adapter
- AND the assistant response is streamed back incrementally to the workspace

#### Scenario: Prevent direct provider access from browser
- GIVEN a browser session uses the chat workspace
- WHEN a message is sent
- THEN the browser never sends the provider credential or vendor-bound request directly to an external LLM provider

#### Scenario: Use brewery-only database-backed answers
- GIVEN a user asks a brewery data question in a tool-enabled session
- WHEN tool-backed behavior is available
- THEN Cortex may answer using approved brewery tools only
- AND the request does not expand to unrestricted SQL or other entity domains
