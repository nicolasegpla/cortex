# Tasks: Remove Provider Management Frontend

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 1,900–2,200; 1,548 are direct deletions |
| Exceeds 800-line budget | Yes |
| Delivery strategy | single-pr-default; cohesive deletion change |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Delete surfaces | One | `pnpm vitest run src/features/chat/ChatPage.test.tsx` | N/A: unreachable UI | Deleted modules/barrel |
| 2 | Strip store | One | `pnpm vitest run src/features/chat/store.test.ts` | `pnpm dev`: chat round-trip | Store and test |
| 3 | Simplify Configuration | One | `pnpm vitest run src/presentation/pages/ConfigPage.test.tsx` | `pnpm dev`: `/config` by role | ConfigPage files |
| 4 | Rewrite regressions | One | Three named frontend suites | N/A: unit cleanup | Three test suites |
| 5 | Integration gate | One | `pnpm vitest run && pnpm build` | Role/chat smoke | Full frontend change |

## Work Unit 1: Deletions

- [x] 1.1 Delete `ChatSettings.tsx`, `ChatSettings.scss`, `ChatSettings.test.tsx`, `credentialsStore.ts`, and `credentialsStore.test.ts`. Trace: Provider Credentials removed requirements.
- [x] 1.2 Delete all three files under `presentation/components/molecules/ModelSelector/`. Trace: Model Selector Inline removed requirements.
- [x] 1.3 Remove credential and `ChatSettings` exports/types from `features/chat/index.ts`; retain chat exports. Trace: prevent direct provider access.

## Work Unit 2: Chat Store

- [x] 2.1 RED: add a legacy-rehydrate case to `store.test.ts`; seed model/provider keys, assert `messages`/`isLoading`/`error`, in-memory stripping, no error, and no storage-key wipe.
- [x] 2.2 GREEN: reduce `store.ts` to session fields/actions; remove provider constants/helpers, credential and `streamChat` imports, and SSE rollback code while preserving `HermesError` and `/chat/n8n`.
- [x] 2.3 Set `partialize: () => ({})` and typed `onRehydrateStorage` stripping for legacy model/provider fields without `any` or disk deletion. Trace: Store Only Tracks In-Memory Chat Session.

## Work Unit 3: Configuration

- [x] 3.1 RED: add super-admin-only Usuarios and non-admin no-sidebar assertions to `ConfigPage.test.tsx`. Trace: role-aware tabs scenarios.
- [x] 3.2 GREEN: simplify `ConfigPage.tsx` to Usuarios, conditionally omit `<aside>`, apply `--no-nav`, render `UserManagement` only for `super_admin`, and simplify copy/accessibility labels.
- [x] 3.3 Add the explicit four-line `.config-page__body--no-nav { grid-template-columns: 1fr; }` modifier to `ConfigPage.scss`.

## Work Unit 4: Test Rewrites

- [x] 4.1 Remove credential mocks and provider-tab transitions from `ConfigPage.test.tsx`; preserve Usuarios modal accessibility and nested-modal coverage.
- [x] 4.2 Remove provider/model imports, setup fields, and describe blocks from `store.test.ts`; preserve legacy rehydrate, `sendMessage`, and `clearMessages` suites.
- [x] 4.3 Add the intentional store-interface-shrink comment to `ChatPage.test.tsx` and verify its existing suite remains green.

## Work Unit 5: Verification Gate

- [x] 5.1 Run the `store`, `ConfigPage`, and `ChatPage` Vitest suites, then full `pnpm vitest run` and `pnpm build` from `cortex-frontend`.
- [x] 5.2 Search `cortex-frontend/src` for deleted imports/exports and `/provider-credentials` calls; allow legacy model names only in the compatibility strip/test.
- [ ] 5.3 Smoke-test `/config` for both roles and a successful `/chat/n8n` response; confirm no provider/model/stop controls or browser vendor calls.
