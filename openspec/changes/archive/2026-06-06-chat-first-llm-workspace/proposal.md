# Proposal: Chat-First LLM Workspace

## Intent

Cortex today is a table-first dashboard with no LLM interaction surface. This change promotes an LLM conversation to the primary entry point while keeping manual search/browse as a secondary path. Users must also manage provider API keys from the frontend without engineering involvement, with keys stored securely server-side and never exposed to the browser.

## Scope

### In Scope
- Chat page as the primary route (replaces dashboard index)
- Streaming SSE chat endpoint routed through Cortex backend
- Multi-provider adapter layer (OpenAI, Kimi, Anthropic, Minimax)
- Provider credential CRUD (save/list/delete) with encryption at rest
- Frontend settings UI for managing API keys
- Zustand chat store with streaming, abort, and error states
- Navigation restructure: Chat (primary) / Browse (secondary)
- Strict TDD: every new module test-first on both frontend and backend

### Out of Scope
- Chat session/message persistence (in-memory thread for phase 1)
- Tool calling / function execution
- Multi-conversation sidebar or thread management
- Rate limiting or usage quotas
- File uploads or multimodal input
- Provider fallback or auto-routing

## Capabilities

### New Capabilities
- `chat-session`: User initiates streaming LLM conversations through the Cortex backend with multi-provider support.
- `provider-credentials`: Users securely store, list, and delete provider API keys; keys are encrypted at rest and never returned in API responses.

### Modified Capabilities
- None

## Approach

**Streaming**: Custom SSE (`text/event-stream`) from FastAPI → Zustand chat store. Avoids Vercel AI SDK protocol lock-in on the Python side; the frontend store boundary keeps a future `@ai-sdk/react` swap localized.

**Encryption**: Fernet symmetric encryption with versioned ciphertext prefix (`v1:<base64>`) to enable key rotation later. `ENCRYPTION_KEY` sourced from environment.

**Provider adapters**: Interface-based layer (`LlmProviderAdapter`) with concrete implementations per provider. Kimi and Minimax reuse the OpenAI-compatible base URL with isolated config overrides.

**Security**: Keys travel browser→backend over HTTPS, are encrypted immediately, and decrypted only inside the LLM service for outbound calls. Credential list endpoints explicitly exclude the key field. Supabase RLS enforces user isolation.

**Delivery**: Four chained PRs to stay within the 400-line review budget:

| PR | Focus | Estimated Lines |
|----|-------|-----------------|
| 1 | Encryption service + credential table + CRUD endpoints + tests | ~300 |
| 2 | Provider adapter interface + OpenAI + Kimi adapters + tests | ~250 |
| 3 | Anthropic + Minimax adapters + chat SSE endpoint + tests | ~350 |
| 4 | Frontend chat UI + settings + Zustand store + navigation | ~400 |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-frontend/src/app/router.tsx` | Modified | Promote chat to primary route |
| `cortex-frontend/src/presentation/layouts/MainLayout.tsx` | Modified | Nav: Chat / Browse |
| `cortex-frontend/src/features/chat/` | New | Store, container, message list, input, settings |
| `cortex-backend/app/main.py` | Modified | Register chat and credential routers |
| `cortex-backend/app/routers/chat.py` | New | SSE streaming endpoint |
| `cortex-backend/app/routers/provider_credentials.py` | New | CRUD endpoints, key never returned |
| `cortex-backend/app/services/encryption_service.py` | New | Fernet encrypt/decrypt with versioning |
| `cortex-backend/app/services/llm_provider_service.py` | New | Provider adapter interface + implementations |
| `cortex-backend/app/services/provider_credential_service.py` | New | Supabase CRUD with user isolation |
| `cortex-backend/app/schemas/chat.py` | New | Chat request/response schemas |
| `cortex-backend/app/schemas/provider_credentials.py` | New | Credential schemas (excludes key) |
| `cortex-backend/sql/005_create_provider_credentials.sql` | New | Table, indexes, RLS policy |
| `cortex-backend/requirements.txt` | Modified | Add `cryptography`, `openai`, `anthropic` |
| `cortex-backend/.env.example` | Modified | Add `ENCRYPTION_KEY` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| PRs exceed 400-line review budget | High | Explicit chained-PR plan above; each PR scoped to one concern |
| Credential leakage via logging | Low | No-log assertions in tests; schema-level exclusion of key field |
| Provider API drift (Kimi/Minimax) | Medium | Adapter isolates per-provider config; test against real API in CI |
| Encryption key rotation complexity | Medium | Versioned ciphertext prefix from day one |
| SSE test flakiness | Medium | Use `TestClient.stream()` with explicit line parsing; stable fixtures |

## Rollback Plan

1. Revert the chain in reverse order (PR 4 → PR 1).
2. Each PR is independently revertible — no cross-PR runtime dependencies.
3. Credential table migration is safe to keep (no data loss on revert).
4. If encryption key is compromised: rotate `ENCRYPTION_KEY`, run a one-time re-encryption script (enabled by versioned ciphertext), revoke and regenerate all provider API keys.

## Dependencies

- Supabase RLS must be functional (already in place from prior auth work)
- `cryptography` package (new dependency)
- Provider SDKs: `openai`, `anthropic` (new dependencies)

## Success Criteria

- [ ] User can add, view, and delete provider API keys from the frontend settings
- [ ] API keys are encrypted at rest and never returned in any API response
- [ ] User can send a message and receive a streamed response from at least one provider
- [ ] Chat is the primary route; manual browse remains accessible via secondary nav
- [ ] All new backend modules have passing pytest tests (test-first)
- [ ] All new frontend modules have passing Vitest tests (test-first)
- [ ] Each chained PR stays under 400 lines of changed code
