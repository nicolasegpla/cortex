# Design: Remove Provider Management Frontend

## Technical Approach

Pure-deletion change with surgical store cleanup. `ChatPage` already runs exclusively on `POST /chat/n8n` and needs zero modifications. `ConfigPage` collapses from a two-tab layout to a single-tab (Usuarios) layout for `super_admin`, and hides the nav sidebar entirely for non-admins. The chat store is stripped of all provider/model state and persistence; legacy `activeModel` entries already in `localStorage` are ignored harmlessly by simply removing those fields from `partialize` (Zustand `persist` merges only known keys, so stale keys are left untouched without errors). No new abstractions, no migrations, no backend coupling.

## Architecture Decisions

### Decision: Sidebar hidden when no tabs are visible

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Render empty sidebar | Confuses non-admins with empty chrome | Hide it |
| Show placeholder "Sin secciones" | Implies broken state | Hide it |

**Choice**: When `navSections` produces zero items (non-`super_admin`), the `<aside>` is not rendered. Content takes full width via the existing grid. A new `hasVisibleItems` boolean drives the conditional; the SCSS grid stays untouched because removing the nav child collapses the first grid column implicitly only if we also override `grid-template-columns`. To keep SCSS changes zero, the `<aside>` element is removed when empty AND the `config-page__body` gets a `--no-nav` modifier that switches to a single-column grid. Minimal SCSS addition.

### Decision: Keep `HermesError` import, drop `streamChat`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Drop both `streamChat` and `HermesError` | `HermesError` is used in the n8n catch block | Keep `HermesError` |
| Keep both | `streamChat` becomes unused | Drop `streamChat` |

**Choice**: Keep `HermesError` (imported and used in the `/chat/n8n` catch block, line 192). Drop `streamChat` import (only referenced in the soon-to-be-deleted SSE rollback comment block). `hermes/client.ts` itself is OUT of scope per proposal — backend-mediated transport and its tests still need it.

### Decision: Remove all model/provider constants from `store.ts`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep `PROVIDER_MODELS`/`DEFAULT_MODELS`/`MODEL_PROVIDER_MAP` exported | No consumers remain after `ModelSelector` deletion | Delete them |
| Move to a `legacy-models.ts` | Adds dead code | Delete them |

**Choice**: Delete `PROVIDER_MODELS`, `DEFAULT_MODELS`, `MODEL_PROVIDER_MAP`, `ModelOption` interface, `resolveSelection` helper, `readSSEChunks` helper. Delete `activeProvider`, `activeModel`, `hydrated`, `setActiveModel`, `hydrate` from `ChatState` and the store. Delete the commented SSE rollback block. `partialize` returns `{}` and `onRehydrateStorage` becomes a no-op (or removed entirely — Zustand tolerates absent `onRehydrateStorage`).

### Decision: Legacy `activeModel` in localStorage is ignored, not migrated

| Option | Tradeoff | Decision |
|--------|----------|----------|
| One-time `localStorage.removeItem('cortex-chat-preferences')` | Wipes messages/history too | Do NOT wipe |
| Migration that strips only `activeModel` | Adds migration code for a harmless stale key | Skip |
| Let `partialize: () => ({})` ignore unknown keys | Stale `activeModel` sits in localStorage, never re-read | Ignore |

**Choice**: `partialize` returns `{}`. On rehydrate, Zustand merges the persisted state over the initializer — since the store no longer has `activeModel`/`activeProvider` fields, the persisted `activeModel` is written onto the state object as an extra property but never read by any consumer. To be strictly typed, `onRehydrateStorage` callback returns a function that strips unknown keys: `(state) => { if (state) delete (state as any).activeModel; }`. The `(state as any)` cast is contained and justified; no broad `any` usage. Per spec chat-session scenario "Store rehydrates ignoring legacy model fields", we add a RED test asserting `messages`, `isLoading`, `error` hydrate normally and a pre-set `activeModel` does not throw.

## Data Flow

    ConfigPage (super_admin)
        └── <UserManagement />  (only when isSuperAdmin)

    ChatPage
        └── useChatStore
              ├── messages: ChatMessage[]
              ├── isLoading: boolean
              ├── error: string | null
              └── sendMessage → POST /chat/n8n  →  { answer }
                  clearMessages / clearError

    localStorage["cortex-chat-preferences"]
        └── {} (partialize empty; legacy keys ignored on rehydrate)

No `/provider-credentials` calls leave the browser. No model/provider routing state in the store.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `cortex-frontend/src/features/chat/ChatSettings.tsx` | Delete | Provider credential UI; sole consumer is `ConfigPage` (removing) |
| `cortex-frontend/src/features/chat/ChatSettings.scss` | Delete | Styles for above |
| `cortex-frontend/src/features/chat/ChatSettings.test.tsx` | Delete | Tests for above |
| `cortex-frontend/src/features/chat/credentialsStore.ts` | Delete | Zustand store + `/provider-credentials` calls; sole importers are `ChatSettings`, `store.ts` (being cleaned), `index.ts`, `ModelSelector`, `ConfigPage.test.tsx` (being cleaned) |
| `cortex-frontend/src/features/chat/credentialsStore.test.ts` | Delete | Tests for above |
| `cortex-frontend/src/presentation/components/molecules/ModelSelector/ModelSelector.tsx` | Delete | Unused in any page/route (verified: no importers outside its own test) |
| `cortex-frontend/src/presentation/components/molecules/ModelSelector/ModelSelector.scss` | Delete | Styles for above |
| `cortex-frontend/src/presentation/components/molecules/ModelSelector/ModelSelector.test.tsx` | Delete | Tests for above |
| `cortex-frontend/src/features/chat/index.ts` | Modify | Drop exports of `useCredentialsStore`, `ChatSettings`, `Provider`, `CredentialInfo`. Keep `useChatStore`, `ChatPage`, `ChatMessage` |
| `cortex-frontend/src/features/chat/store.ts` | Modify | Remove `Provider` import, `ModelOption`, `PROVIDER_MODELS`, `DEFAULT_MODELS`, `MODEL_PROVIDER_MAP`, `readSSEChunks`, `resolveSelection`, `activeProvider`, `activeModel`, `hydrated`, `setActiveModel`, `hydrate`, SSE rollback comment block; `partialize: () => ({})`; `streamChat` import dropped; `onRehydrateStorage` strips stale `activeModel` |
| `cortex-frontend/src/features/chat/store.test.ts` | Modify | Drop imports of `PROVIDER_MODELS`, `MODEL_PROVIDER_MAP`; delete `describe('setActiveModel')`, `describe('hydrate')`, `describe('PROVIDER_MODELS')`, `describe('MODEL_PROVIDER_MAP')`; delete 'should initialize' provider/model assertions; remove `activeProvider`/`activeModel` from `setState` in `beforeEach`; keep all `sendMessage` + `clearMessages` tests; ADD test for legacy `activeModel` rehydrate scenario |
| `cortex-frontend/src/presentation/pages/ConfigPage.tsx` | Modify | Remove `ChatSettings` import; collapse `CONFIG_TAB` to `{ users: 'users' }` (or replace with const string); default `activeTab = 'users'`; remove provider nav item; compute `hasVisibleItems`; conditionally hide `<aside>` and apply `--no-nav` modifier; collapse content ternary to single `<UserManagement>` (only when `isSuperAdmin`, else `null`); update `headerTitle`/`headerDescription` to single set of copy; simplify `aria-labelledby`/`aria-label` logic |
| `cortex-frontend/src/presentation/pages/ConfigPage.scss` | Modify (minor) | Add `.config-page__body--no-nav { grid-template-columns: 1fr; }` rule (4 lines) |
| `cortex-frontend/src/presentation/pages/ConfigPage.test.tsx` | Modify | Drop `vi.mock('@/features/chat/credentialsStore')` and `mockUseCredentialsStore`; drop base mock `fetchCredentials`/`saveCredential`/etc; delete test asserting `Proveedores de modelos` tab exists; delete test that switches FROM provider TO usuarios; rewrite remaining tests: (1) super_admin sees only Usuarios, (2) non-admin sees no nav sidebar and content renders directly, (3) Usuarios tab + Usuarios aria-label still works in modal, (4) parent modal stays open when create-user modal opens |
| `cortex-frontend/src/features/chat/ChatPage.test.tsx` | Modify (minimal) | Already free of credential mocks. No code change required; verify it still passes (mock state already lacks `activeModel`/`activeProvider`). Add a one-line comment noting the store interface shrink is intentional. |
| `cortex-frontend/src/features/chat/ChatPage.tsx` | No change | Already uses only `useChatStore` via the n8n path |

## Interfaces / Contracts

```typescript
// store.ts (after)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/services/api/client';
import { HermesError } from '@/services/hermes/client';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatState {
    messages: ChatMessage[];
    isLoading: boolean;
    error: string | null;
    sendMessage: (text: string) => Promise<void>;
    clearMessages: () => void;
    clearError: () => void;
}

export const useChatStore = create<ChatState>()(
    persist((set, get) => ({
        messages: [],
        isLoading: false,
        error: null,
        sendMessage: async (text) => { /* unchanged n8n POST → { answer } */ },
        clearMessages: () => set({ messages: [], error: null }),
        clearError: () => set({ error: null }),
    }), {
        name: 'cortex-chat-preferences',
        partialize: () => ({}),
        onRehydrateStorage: () => (state) => {
            if (state) {
                delete (state as { activeModel?: unknown }).activeModel;
                delete (state as { activeProvider?: unknown }).activeProvider;
            }
        },
    })
);

// ConfigPage.tsx (after)
const CONFIG_TAB = { users: 'users' } as const;
type ConfigTab = (typeof CONFIG_TAB)[keyof typeof CONFIG_TAB];
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (`store.test.ts`) | `sendMessage` happy path, trim, loading, error, empty; `clearMessages`; NEW: legacy `activeModel` in localStorage does not break rehydrate | Keep existing 8 `sendMessage`/`clearMessages` cases; add 1 RED test seeding `localStorage['cortex-chat-preferences'] = JSON.stringify({ state: { activeModel: 'gpt-4o', activeProvider: 'openai' } })`, assert `messages`/`isLoading`/`error` initial and no throw |
| Unit (`ConfigPage.test.tsx`) | Super_admin sees only Usuarios + active; non-admin sees no sidebar and direct content; Usuarios aria-label in modal; nested create-user modal keeps parent open | Rewrite suite; drop credentials mock; drop provider-tab assertions; add non-admin = no-`aside` assertion |
| Unit (`ChatPage.test.tsx`) | Existing 9 tests still pass; specifically "should not expose legacy streaming controls" still passes | Run unchanged; no provider/model mocks to remove |
| Static (tsc) | No remaining references to `ChatSettings`, `credentialsStore`, `ModelSelector`, `Provider`, `CredentialInfo`, `activeModel`, `setActiveModel`, `hydrate`, `PROVIDER_MODELS`, `DEFAULT_MODELS`, `MODEL_PROVIDER_MAP` outside the deleted files | `npm run lint` + `tsc --noEmit`; RED via tsconfig strict |
| Integration (manual) | Non-admin opens `/config`, sees content directly; admin sees Usuarios; chat round-trip via `/chat/n8n` | Manual smoke + existing E2E suite if present |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Pure frontend component/store deletion with one `localStorage` accessor (read-only rehydrate). No new network verbs; the remaining `/chat/n8n` POST is unchanged.

## Migration / Rollout

No migration. Legacy `localStorage` key `cortex-chat-preferences.state.activeModel` / `.activeProvider` is ignored on rehydrate (the `onRehydrateStorage` callback deletes those keys from the rehydrated state in-memory; the on-disk entry is harmless and self-corrects over time).

Rollback: revert the single commit. All changes are frontend-only deletions/edits — no DB or backend mutations. No data migration to undo. Legacy localStorage keys were never destroyed, so re-introducing `activeModel` reads them again.

## Open Questions

- [ ] Should we age-out the stale `activeModel` localStorage entry by deleting the key entirely on first rehydrate, or leave it forever? Design chose in-memory strip only — conservative. Confirm in review.