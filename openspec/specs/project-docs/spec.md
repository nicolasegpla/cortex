# Project Documentation Specification

## Purpose

This capability governs the project's user-facing and operator-facing documentation — `README.md`, `docs/CORTEX.md`, `docs/DEPLOYMENT.md`, and `docs/VERSIONING.md`. Its purpose is to ensure the documentation accurately represents the current feature surface and architecture, avoiding stale references to removed capabilities. Since n8n owns agents, models, providers, and credentials, the docs must reflect that Cortex only proxies chat through the `/chat/n8n` route and stores no provider API keys.

## Requirements

### Requirement: Docs MUST Reflect Current Feature Surface

Project documentation (README.md, docs/CORTEX.md, docs/DEPLOYMENT.md, docs/VERSIONING.md) MUST NOT present removed features as current functionality. Specifically, active docs MUST NOT reference provider-credential management, LLM provider adapters, or `ENCRYPTION_KEY` as available Cortex features.

#### Scenario: README presents only active features

- GIVEN the provider-credentials UI was removed (CORTEXDIST-21) and the backend adapter/encryption layer was removed (CORTEXDIST-22)
- WHEN a contributor reads README.md
- THEN provider credentials, LLM adapter routing, and `ENCRYPTION_KEY` are absent from the feature list
- AND the README states that n8n owns model, provider, and credential management

#### Scenario: CORTEX.md architecture section matches reality

- GIVEN the backend no longer hosts LLM provider adapters or encrypted credential storage
- WHEN a contributor reads docs/CORTEX.md
- THEN the architecture table excludes LLM provider and Encryption rows
- AND the document states Cortex proxies chat exclusively through `/chat/n8n`

#### Scenario: DEPLOYMENT.md env table excludes dead config

- GIVEN `ENCRYPTION_KEY` has zero consumers since `EncryptionService` was deleted (CORTEXDIST-22)
- WHEN an operator reads docs/DEPLOYMENT.md
- THEN the backend env-var table does not list `ENCRYPTION_KEY`

### Requirement: Docs MUST State n8n Ownership Boundary

README.md and docs/CORTEX.md MUST explicitly state that n8n owns agents, models, providers, and credentials, and that Cortex's only active LLM path is the `/chat/n8n` proxy.

#### Scenario: Ownership boundary is discoverable in README

- GIVEN a new contributor opens README.md
- WHEN they scan for how LLM features work
- THEN they find a clear statement that n8n manages agents, models, providers, and credentials
- AND Cortex proxies chat via the n8n webhook only

#### Scenario: Ownership boundary is discoverable in CORTEX.md

- GIVEN a developer reads docs/CORTEX.md to understand architecture
- WHEN they reach the "What CORTEX is today" or "Technical shape" section
- THEN they find the n8n-mediated chat path described as the sole active LLM route
