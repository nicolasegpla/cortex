# Provider Registry Specification

## Purpose

Define supported-provider discovery and provider selection for V1.

## Requirements

### Requirement: Supported Provider Discovery and Routing

The system MUST expose OpenAI, Anthropic, Gemini, and DeepSeek as the only V1 direct providers, SHALL report per-provider availability based on adapter presence (no credential-service dependency), and MUST route chat only to the adapter for the user-selected supported provider. `ProviderRegistry.list_providers()` MUST NOT accept `credential_service` or `user_id` parameters.

(Previously: `list_providers()` accepted `credential_service` and `user_id` params to validate credentials and report per-provider readiness.)

#### Scenario: Show supported providers without credential check

- GIVEN the workspace loads provider choices
- WHEN supported providers are requested via `list_providers()`
- THEN the list includes OpenAI, Anthropic, Gemini, and DeepSeek with adapter-availability metadata
- AND no credential-service call is required

#### Scenario: Exclude unsupported architecture

- GIVEN V1 provider discovery is shown
- WHEN the system determines supported options
- THEN it MUST NOT advertise Kimi Code or any OpenClaw-first or gateway-backed provider path as a supported V1 provider
