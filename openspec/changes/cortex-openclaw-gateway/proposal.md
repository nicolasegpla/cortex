# Proposal: Cortex-OpenClaw Gateway Integration

## Intent

Cortex currently acts as its own agent/provider runtime — directly managing LLM adapters (OpenAI, Kimi, Minimax, Anthropic), streaming responses, and hosting a chat-first UI. This duplicates functionality that OpenClaw already provides as a dedicated agent gateway layer. The goal is to stop building a separate custom agent UI and instead integrate Cortex services with OpenClaw, letting OpenClaw handle agent orchestration, communication, and provider routing.

## Scope

### In Scope
- Define Cortex API surface for OpenClaw to call (business logic, data, workflows)
- Build OpenClaw plugin/adapter that connects to Cortex services
- Migrate provider routing from Cortex direct adapters to OpenClaw gateway
- Repurpose or de-emphasize the existing chat-first UI slice
- Update credential management to work through OpenClaw

### Out of Scope
- Building new agent UI features in Cortex
- Replacing OpenClaw's internal architecture or plugin system
- Multi-tenant or enterprise gateway features beyond what OpenClaw provides
- Real-time collaboration features (deferred)

## Capabilities

### New Capabilities
- `openclaw-gateway`: Cortex exposes a service API that OpenClaw plugins call for business logic, data access, and workflow execution. Defines authentication, endpoints, and request/response contracts.

### Modified Capabilities
- `chat-session`: Chat traffic no longer flows through Cortex direct LLM adapters. Cortex backend mediates business logic only; OpenClaw handles provider routing and streaming.
- `provider-credentials`: Credential storage and validation shifts from Cortex to OpenClaw. Cortex no longer stores or encrypts provider API keys.

## Approach

**Boundary**: Cortex = Business Logic + Data API. OpenClaw = Agent Gateway + Communication + LLM Orchestration.

**Phase 1**: Define Cortex service API contract (endpoints, auth, request/response schemas).
**Phase 2**: Build OpenClaw plugin that calls Cortex API for business operations.
**Phase 3**: Migrate provider routing — OpenClaw handles LLM calls, Cortex handles data/workflows.
**Phase 4**: Update deployment, repurpose existing chat UI or replace with OpenClaw Control UI.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-backend/app/services/llm_provider_service.py` | Removed | Direct LLM adapter calls replaced by OpenClaw gateway |
| `cortex-backend/app/services/provider_credential_service.py` | Modified | Credential storage removed or delegated to OpenClaw |
| `cortex-backend/app/routers/chat.py` | Modified | Routes become Cortex service API for OpenClaw |
| `cortex-backend/app/routers/provider_credentials.py` | Modified | Credential endpoints simplified or removed |
| `cortex-frontend/` | De-emphasized | Chat UI repurposed or replaced by OpenClaw Control UI |
| `openspec/specs/chat-session/spec.md` | Modified | Provider routing requirement changes |
| `openspec/specs/provider-credentials/spec.md` | Modified | Credential ownership shifts to OpenClaw |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| OpenClaw beta APIs change during development | Medium | Pin OpenClaw version, design adapter layer for easy updates |
| Plugin development requires separate Node.js/TS stack | High | Keep plugin thin; most logic stays in Cortex Python backend |
| Existing chat UI investment becomes sunk cost | Medium | Repurpose UI components as OpenClaw plugin views where possible |
| Credential migration breaks existing user setups | Low | Support dual-mode during transition period |

## Rollback Plan

Keep existing LLM adapter code in a feature branch. If OpenClaw integration fails, revert to direct provider routing by restoring the `llm_provider_service.py` adapter layer and re-enabling the existing chat UI. No database schema changes are required for rollback.

## Dependencies

- OpenClaw installed and running (self-hosted)
- OpenClaw plugin SDK documentation available
- Existing Cortex API endpoints documented

## Success Criteria

- [ ] OpenClaw plugin successfully calls Cortex service API for business operations
- [ ] Provider routing flows through OpenClaw, not Cortex direct adapters
- [ ] Existing chat UI is either repurposed or explicitly deprecated
- [ ] Credential management works through OpenClaw without Cortex storing keys
- [ ] End-to-end test: user sends message via OpenClaw → Cortex processes → response returns
