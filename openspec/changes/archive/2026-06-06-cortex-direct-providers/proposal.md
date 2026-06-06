# Proposal: Cortex Direct Provider Integrations

## Intent

Cortex needs a clean, direct provider integration architecture — no intermediary gateway. Users manage their own API keys, Cortex backend talks directly to official provider APIs. This replaces the OpenClaw-first direction with a simpler, faster path that ships real multi-provider chat sooner.

## Scope

### In Scope
- Direct provider adapter layer for OpenAI, Anthropic, Gemini, DeepSeek (V1)
- User-managed API key storage, validation, and rotation per provider
- Backend-mediated chat routing with streaming responses
- Provider readiness signals in the frontend workspace
- Unified provider interface with per-adapter implementation

### Out of Scope
- OpenClaw or any external agent gateway integration
- Kimi Code (not a direct API provider — Moonshot/Kimi Platform may be added later)
- Multi-agent orchestration or tool-use beyond single-turn chat
- Provider-agnostic proxy or rate-limiting layer
- Conversation persistence beyond current session (phase 2)

## Capabilities

> Contract with sdd-spec phase. Each new capability becomes `openspec/specs/<name>/spec.md`.

### New Capabilities
- `provider-adapter`: Pluggable adapter interface that normalizes chat, streaming, and validation across providers. Each V1 provider (OpenAI, Anthropic, Gemini, DeepSeek) gets a concrete adapter implementing this contract.
- `provider-registry`: Runtime registry that discovers, instantiates, and routes to the correct adapter based on user selection. Handles provider configuration, credential lookup, and readiness state.

### Modified Capabilities
- `chat-session`: Chat traffic flows through the provider adapter layer instead of hardcoded per-provider routes. Streaming and session behavior remain the same; routing becomes adapter-mediated.
- `provider-credentials`: Credential lifecycle expands to support Gemini and DeepSeek. Validation logic moves into each adapter's `validate()` method rather than a monolithic service.

## Approach

**Pattern**: Strategy + Registry. One `ProviderAdapter` interface, four concrete implementations. A `ProviderRegistry` maps provider IDs to adapter instances at runtime.

**Credential flow**: Frontend → Cortex backend (encrypted storage) → adapter uses key for direct API call → streamed response back to frontend.

**Why direct over gateway**: No extra dependency, no beta SDK risk, full control over error handling and rate limits, simpler deployment, faster to ship.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-backend/app/services/llm_provider_service.py` | Modified | Becomes adapter registry + factory |
| `cortex-backend/app/adapters/` | New | Provider adapter implementations |
| `cortex-backend/app/routers/chat.py` | Modified | Routes use registry, not hardcoded providers |
| `cortex-backend/app/services/provider_credential_service.py` | Modified | Adds Gemini + DeepSeek credential schemas |
| `cortex-frontend/src/providers/` | Modified | Provider selection UI expands |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| DeepSeek API stability or documentation gaps | Medium | Start with OpenAI/Anthropic adapters; DeepSeek as third |
| Gemini auth flow differs significantly | Low | Adapter interface absorbs differences; validate early |
| Adapter interface too rigid for future providers | Low | Design for extension — test with 4 providers before locking |

## Rollback Plan

Keep existing `llm_provider_service.py` on a feature branch. If adapter layer introduces regressions, revert to direct per-provider routes. No database schema changes required — credential records are provider-agnostic by design.

## Dependencies

- Valid API keys for each V1 provider (user-managed)
- Official provider SDKs or HTTP client patterns documented

## Success Criteria

- [ ] All four V1 providers connect, validate, and stream responses through the adapter layer
- [ ] Adding a fifth provider requires only one new adapter file + registry entry
- [ ] Credential lifecycle works identically across all providers
- [ ] No regression in existing chat session behavior
