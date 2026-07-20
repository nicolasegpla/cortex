# Provider Adapter Specification

## Purpose

Define a direct-provider contract for V1 chat and validation.

## Requirements

### Requirement: Direct Provider Adapter Contract

The system MUST provide a direct adapter for OpenAI, Anthropic, Gemini, and DeepSeek and SHALL normalize chat, streaming, credential validation, and optional tool-enabled chat behind one product-facing contract. Adapters MUST expose whether tool calling is supported so Cortex can choose tool-backed or standard streaming without changing the user chat flow.

(Previously: adapters normalized chat and streaming, but had no tool-capability contract.)

#### Scenario: Stream through a selected provider
- GIVEN a user selects a supported provider with a valid key
- WHEN a chat request starts
- THEN Cortex sends the request to that provider through its adapter
- AND the response streams back through Cortex

#### Scenario: Handle provider family differences
- GIVEN the selected provider uses either an OpenAI-compatible or Anthropic-style API
- WHEN Cortex prepares the request
- THEN the adapter applies provider-specific rules without changing the user chat flow

#### Scenario: Fall back when tool calling is unsupported
- GIVEN a chat request asks for tool-backed behavior
- WHEN the selected adapter reports tool calling unavailable
- THEN Cortex uses the adapter's standard streaming path
- AND the request does not fail solely because tools are unavailable

### REMOVED Requirements

### Requirement: Provider Validation Outcome

(Reason: The adapter-level `validate_credential` feature was tied to the backend-stored provider credentials system. With the removal of `ProviderCredentialService`, `EncryptionService`, and all backend credential storage (`remove-provider-credentials-backend`), there is no credential to validate and no caller of adapter validation. Adapters no longer expose a `validate_credential` method.)
(Migration: None.)
