# Provider Registry Specification

## Purpose

Define supported-provider discovery and provider selection for V1.

## Requirements

### Requirement: Supported Provider Discovery and Routing

The system MUST expose OpenAI, Anthropic, Gemini, and DeepSeek as the only V1 direct providers, SHALL report per-provider readiness, and MUST route chat only to the adapter for the user-selected supported provider.

#### Scenario: Show supported providers
- GIVEN the workspace loads provider choices
- WHEN supported providers are requested
- THEN the list includes OpenAI, Anthropic, Gemini, and DeepSeek with readiness metadata

#### Scenario: Exclude unsupported architecture
- GIVEN V1 provider discovery is shown
- WHEN the system determines supported options
- THEN it MUST NOT advertise Kimi Code or any OpenClaw-first or gateway-backed provider path as a supported V1 provider
