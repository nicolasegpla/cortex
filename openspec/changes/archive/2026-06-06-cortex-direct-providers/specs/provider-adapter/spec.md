# Provider Adapter Specification

## Purpose

Define a direct-provider contract for V1 chat and validation.

## Requirements

### Requirement: Direct Provider Adapter Contract

The system MUST provide a direct adapter for OpenAI, Anthropic, Gemini, and DeepSeek and SHALL normalize chat, streaming, and credential validation behind one product-facing contract.

#### Scenario: Stream through a selected provider
- GIVEN a user selects a supported provider with a valid key
- WHEN a chat request starts
- THEN Cortex sends the request to that provider through its adapter
- AND the response streams back through Cortex

#### Scenario: Handle provider family differences
- GIVEN the selected provider uses either an OpenAI-compatible or Anthropic-style API
- WHEN Cortex prepares the request
- THEN the adapter applies provider-specific rules without changing the user chat flow

### Requirement: Provider Validation Outcome

Each adapter MUST validate the user-managed credential for its own provider and SHALL return ready, invalid, or unavailable status without disclosing secrets.

#### Scenario: Validation fails safely
- GIVEN a revoked, malformed, or unreachable provider credential
- WHEN validation runs
- THEN the adapter returns a non-secret failure outcome
