# Delta for chat-session

## MODIFIED Requirements

### Requirement: Backend-Mediated Multi-Provider Chat

The system MUST send all chat traffic through the Cortex backend and SHALL support V1 provider selection for OpenAI, Anthropic, Gemini, and DeepSeek through the selected direct provider adapter.
(Previously: Phase-1 chat supported OpenAI, Kimi, Minimax, and Anthropic through backend-mediated provider handling.)

#### Scenario: Stream a provider response
- GIVEN the user has a valid credential for a selected supported provider
- WHEN the user sends a message
- THEN Cortex routes the request through the selected provider adapter
- AND the assistant response is streamed back incrementally to the workspace

#### Scenario: Prevent direct provider access from browser
- GIVEN a browser session uses the chat workspace
- WHEN a message is sent
- THEN the browser never sends the provider credential or vendor-bound request directly to an external LLM provider
