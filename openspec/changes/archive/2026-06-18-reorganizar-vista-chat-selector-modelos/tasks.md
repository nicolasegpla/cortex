# Tasks: reorganizar-vista-chat-selector-modelos

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 600–700 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: single-pr
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full implementation | PR 1 | All phases in one PR; within 800-line budget |

---

## Phase 1: Foundation — Icon Atom + Store Mapping

- [x] 1.1 Create `src/presentation/components/atoms/Icon/ChevronDown.tsx` with Lucide-style SVG chevron-down icon
- [x] 1.2 Add `export { ChevronDown }` to `src/presentation/components/atoms/Icon/index.ts`
- [x] 1.3 Add `MODEL_PROVIDER_MAP: Record<string, Provider>` const to `src/features/chat/store.ts` derived from `PROVIDER_MODELS` (openai, anthropic, gemini, deepseek models mapped to their provider)
- [x] 1.4 Update `src/features/chat/store.test.ts`: add tests for `MODEL_PROVIDER_MAP` coverage and `setActiveModel` → provider derivation

---

## Phase 2: Core — ModelSelector Molecule

- [x] 2.1 Create `src/presentation/components/molecules/ModelSelector/ModelSelector.tsx`: badge (model display name + chevron) + popover with validated-provider models; use React portal to `document.body`; implement `useEffect` click-outside + ESC listeners; ARIA menu semantics (`role="menu"`, `aria-haspopup`, keyboard arrow nav)
- [x] 2.2 Create `src/presentation/components/molecules/ModelSelector/ModelSelector.scss` with badge and popover styles using existing SASS tokens
- [x] 2.3 Create `src/presentation/components/molecules/ModelSelector/ModelSelector.test.tsx`: test badge renders model name + chevron; popover opens on click; closes on ESC/outside-click; keyboard arrow nav + Enter selects; only validated-provider models appear; disabled state when no validated providers

---

## Phase 3: Integration — Wire ModelSelector into ChatPage + Store

- [x] 3.1 Modify `src/features/chat/store.ts`: update `setActiveModel(model)` to derive `activeProvider` via `MODEL_PROVIDER_MAP`; update `hydrate(model)` to sanitize invalid persisted model; update `partialize` to return `{ activeModel }` only; update `onRehydrateStorage` to handle old `{activeProvider, activeModel}` format
- [x] 3.2 Remove `setActiveProvider` from the store's public API in `src/features/chat/store.ts`
- [x] 3.3 Modify `src/features/chat/ChatPage.tsx`: remove top-bar `<select>` for provider and model; add `<ModelSelector>` inside input bar before the textarea; wire `activeModel` from store and `validatedProviders` from `useCredentialsStore`; pass `onSelect={store.setActiveModel}`
- [x] 3.4 Modify `src/features/chat/ChatPage.scss`: remove `&__selectors`, `&__select` styles; add `.chat-page__input-box` flex layout to position badge + textarea + send button
- [x] 3.5 Modify `src/features/chat/ChatSettings.tsx`: replace `setActiveProvider` + `setActiveModel` with single `setActiveModel(defaultModel)` call
- [x] 3.6 Update `src/features/chat/ChatPage.test.tsx`: remove provider/model selector assertions; add assertions that `ModelSelector` badge renders in input bar; test that selecting a model calls `setActiveModel`

---

## Phase 4: Verification

- [x] 4.1 Run `pnpm test -- --run` and confirm all store, ModelSelector, and ChatPage tests pass
- [x] 4.2 Run `pnpm dev` and visually verify badge appears in input bar, popover opens, model selection persists after reload
