# Proposal: Remove Provider Management Frontend

## Intent

n8n now owns agent routing, provider/model selection, and credential management. Cortex frontend must stop exposing, storing, or administering AI provider API keys. This change removes the "Proveedores de modelos" module from Configuración and all frontend code that calls `/provider-credentials`, while preserving the working `/chat/n8n` flow.

## Scope

### In Scope
- Remove "Proveedores de modelos" tab, nav entry, and copy from `ConfigPage`; default active tab becomes `users`
- Delete `ChatSettings.tsx`, `ChatSettings.scss`, `ChatSettings.test.tsx`
- Delete `credentialsStore.ts`, `credentialsStore.test.ts`
- Remove `Provider` type import from `store.ts`; drop `PROVIDER_MODELS`, `DEFAULT_MODELS`, `MODEL_PROVIDER_MAP`, `activeProvider`, `setActiveModel`, `hydrate` and the commented-out SSE rollback block
- Delete unused `ModelSelector` molecule (not rendered in any page)
- Clean `features/chat/index.ts` re-exports
- Update `ConfigPage.test.tsx` and `ChatPage.test.tsx` to remove credential mocks/assertions
- Delete `store.test.ts` provider/model test blocks; keep `/chat/n8n` send tests

### Out of Scope
- Backend `/provider-credentials` endpoint removal (CORTEXDIST-20 child task 2)
- Supabase `provider_credentials` table drop (child task 3)
- Docs cleanup (child task 4)
- Chat UX redesign
- `hermes/client.ts` or `apiClient.stream` removal (still used by tests/infra)

## Capabilities

### New Capabilities
_None_

### Modified Capabilities
- `configuration-tabs`: Remove provider tab entry; default tab changes from `provider` to `users`; nav section shrinks to one item when user is super_admin, zero items otherwise
- `provider-credentials`: Frontend surface deleted entirely (backend endpoint remains for now)
- `model-selector-inline`: Component deleted — was unused in production
- `chat-session`: Store sheds all provider/model state; only `messages`, `isLoading`, `error`, `sendMessage`, `clearMessages`, `clearError` remain

## Approach

Pure deletion + surgical cleanup. `ChatPage` already uses only `/chat/n8n` and needs zero changes. `ConfigPage` collapses to a single-tab layout (Usuarios only for super_admin). The chat store is stripped to the minimum the active chat flow requires. No new abstractions, no migrations.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-frontend/src/presentation/pages/ConfigPage.tsx` | Modified | Remove provider tab/nav/copy; default to users |
| `cortex-frontend/src/presentation/pages/ConfigPage.test.tsx` | Modified | Remove credential mocks, provider tab assertions |
| `cortex-frontend/src/features/chat/ChatSettings.tsx` | Removed | Provider credential UI |
| `cortex-frontend/src/features/chat/ChatSettings.scss` | Removed | Styles |
| `cortex-frontend/src/features/chat/ChatSettings.test.tsx` | Removed | Tests |
| `cortex-frontend/src/features/chat/credentialsStore.ts` | Removed | Zustand store + `/provider-credentials` calls |
| `cortex-frontend/src/features/chat/credentialsStore.test.ts` | Removed | Tests |
| `cortex-frontend/src/features/chat/store.ts` | Modified | Remove provider/model state, constants, legacy SSE block |
| `cortex-frontend/src/features/chat/store.test.ts` | Modified | Remove provider/model test blocks |
| `cortex-frontend/src/features/chat/index.ts` | Modified | Remove credential/chat-settings re-exports |
| `cortex-frontend/src/presentation/components/molecules/ModelSelector/` | Removed | Unused component + tests + styles |
| `cortex-frontend/src/features/chat/ChatPage.test.tsx` | Modified | Remove credential store mocks if present |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Persisted `activeModel` in localStorage causes hydration error after store fields removed | Medium | Remove `activeModel` from `partialize`; clear legacy key or ignore on rehydrate |
| Shared `Provider` type import breaks if backend still exports it | Low | Type is frontend-only; no backend coupling |
| ConfigPage empty state when non-super-admin has zero tabs | Low | Hide entire nav sidebar when no tabs visible; show content directly |

## Rollback Plan

Revert the single git commit. All changes are frontend-only deletions and edits — no DB or backend mutations. No data migration to undo.

## Dependencies

- None. Pure frontend change, no backend contract dependency for this slice.

## Success Criteria

- [ ] UI shows no "Proveedores de modelos" tab or entry in Configuración
- [ ] Frontend never calls `/provider-credentials` (no GET/POST/DELETE)
- [ ] No accessible route or action to save/validate/delete AI provider API keys from Cortex frontend
- [ ] `credentialsStore`, `ChatSettings`, `ModelSelector` files do not exist
- [ ] Chat sends via `/chat/n8n` and remains test-covered
- [ ] Configuración still works — Usuarios tab visible for super_admin
- [ ] All remaining frontend tests pass
