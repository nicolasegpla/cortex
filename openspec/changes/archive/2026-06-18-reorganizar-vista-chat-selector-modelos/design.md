# Design: reorganizar-vista-chat-selector-modelos

## Technical Approach

Move the model selector from the top bar into the chat input area as a ChatGPT-style badge + popover. Derive the active provider from the selected model via a reverse lookup map (`MODEL_PROVIDER_MAP`), eliminating `setActiveProvider` from the public store API. The `activeModel` becomes the single user-settable selection; `activeProvider` stays in state (needed for `sendMessage`'s `{ provider, model }` payload) but is set automatically when `activeModel` changes. Persist only `activeModel` to localStorage; rehydrate with backward-compat for old format.

## Architecture Decisions

| Decision | Option | Tradeoff | Choice |
|----------|--------|----------|--------|
| Popover implementation | Hand-rolled portal vs `<dialog>` | Hand-rolled: exact positioning control, portal to body avoids z-index issues. `<dialog>`: native ESC/backdrop but poor anchored-popover positioning. | **Hand-rolled** — React portal to `document.body` positioned via `getBoundingClientRect()`, manual ARIA menu semantics, `useEffect` click-outside + ESC listeners. |
| Model→provider mapping | `Record<string, Provider>` reverse lookup vs iterate `PROVIDER_MODELS` on every call | Reverse map is O(1) derivation, built once from `PROVIDER_MODELS`. Iteration adds runtime cost and duplication risk. | **`MODEL_PROVIDER_MAP`** — const derived from `PROVIDER_MODELS` during store init. Tie-break: first provider in iteration order if model ID somehow collides (openai, anthropic, gemini, deepseek). |
| Store: persist both fields or model-only | Model-only with rehydrate migration | Model-only: cleaner semantics. Rehydrate must handle old `{activeProvider, activeModel}` stored format gracefully. | **Model-only persist** — `partialize` returns `{ activeModel }`. `onRehydrateStorage` reads `state.activeModel` (old format also has `activeProvider`, ignored). `hydrate(model)` derives provider from `MODEL_PROVIDER_MAP` and sanitizes. |
| ChatSettings integration | Call `setActiveModel` only vs keep `setActiveProvider` | Current code calls `setActiveProvider` + `setActiveModel` after saving credentials. | **`setActiveModel` only** — ChatSettings calls the new `setActiveModel(defaultModel)` which derives provider internally. No other callers of `setActiveProvider` exist. |

## Data Flow

```
User clicks ModelSelector badge
  → Popover opens (state: isOpen=true)
  → Reads validatedProviders from useCredentialsStore
  → Filters PROVIDER_MODELS to validated providers only
  → User clicks a model option
  → onSelect(modelId) → store.setActiveModel(modelId)
    → MODEL_PROVIDER_MAP[modelId] → derived provider
    → set({ activeModel: modelId, activeProvider: derived })
    → persist middleware writes { activeModel } to localStorage
  → Popover closes
```

```
On rehydrate (page load):
  → persist reads localStorage "cortex-chat-preferences"
  → onRehydrateStorage fires
  → state.hydrate(state.activeModel)
    → MODEL_PROVIDER_MAP[model] → provider | undefined
    → validate model ∈ PROVIDER_MODELS[provider]
    → sanitize or accept → set({ activeModel, activeProvider, hydrated: true })
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/presentation/components/atoms/Icon/ChevronDown.tsx` | Create | New SVG icon atom (light Lucide-style chevron-down) |
| `src/presentation/components/atoms/Icon/index.ts` | Modify | Export ChevronDown |
| `src/presentation/components/molecules/ModelSelector/ModelSelector.tsx` | Create | Badge + popover molecule. Props: `activeModel`, `validatedProviders`, `onSelect`. |
| `src/presentation/components/molecules/ModelSelector/ModelSelector.scss` | Create | Badge and popover styles using design tokens |
| `src/presentation/components/molecules/ModelSelector/ModelSelector.test.tsx` | Create | Unit tests: renders badge, opens popover, keyboard nav, ESC dismiss, click-outside, filters unvalidated |
| `src/features/chat/store.ts` | Modify | Add `MODEL_PROVIDER_MAP`. `setActiveModel(model)` derives provider. Remove `setActiveProvider` from public API. Update `hydrate(model)`, `partialize`, `onRehydrateStorage`. |
| `src/features/chat/ChatPage.tsx` | Modify | Remove top-bar selectors. Add `<ModelSelector>` inside input bar before textarea. Remove `setActiveProvider` usage. |
| `src/features/chat/ChatPage.scss` | Modify | Remove `&__selectors`, `&__select` styles. Add `.chat-page__input-box` flex layout for badge + textarea. |
| `src/features/chat/ChatSettings.tsx` | Modify | Replace `setActiveProvider` + `setActiveModel` with `setActiveModel` only. |
| `src/features/chat/store.test.ts` | Modify | Update tests for new `setActiveModel` signature, add model→provider derivation tests, test rehydrate without provider field. |
| `src/features/chat/ChatPage.test.tsx` | Modify | Remove provider selector assertions. Add ModelSelector integration tests (badge renders, popover interaction). |

## Interfaces / Contracts

```typescript
// ModelSelector props
interface ModelSelectorProps {
    activeModel: string;
    validatedProviders: Provider[];
    onSelect: (modelId: string) => void;
}

// New store: MODEL_PROVIDER_MAP
const MODEL_PROVIDER_MAP: Record<string, Provider> = {
    'gpt-4o': 'openai', 'gpt-4o-mini': 'openai',
    'claude-3-5-sonnet-20241022': 'anthropic', 'claude-3-5-haiku-20241022': 'anthropic',
    'gemini-2.0-flash': 'gemini', 'gemini-1.5-pro': 'gemini',
    'deepseek-v4-flash': 'deepseek', 'deepseek-v4-pro': 'deepseek',
    'deepseek-chat': 'deepseek', 'deepseek-reasoner': 'deepseek',
};

// setActiveModel signature change
setActiveModel: (model: string) => void;  // derives + sets activeProvider internally
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — ModelSelector | Badge renders model name + chevron; popover opens/closes on click/ESC/outside; keyboard arrows + Enter; disabled badge when no validated providers. | `@testing-library/react` + `userEvent` |
| Unit — store | `setActiveModel` derives correct provider; `hydrate` sanitizes invalid model; `MODEL_PROVIDER_MAP` covers all models; rehydrate handles old + new persisted formats. | Direct store method calls + localStorage manipulation |
| Integration — ChatPage | ModelSelector renders in input bar; selecting model triggers `setActiveModel`; top bar no longer has provider/model `<select>` elements; ChatSettings integration path. | Render `ChatPage` with mocked stores, assert DOM structure |

## Migration / Rollout

No data migration required. The `persist` format changes from `{activeProvider, activeModel}` to `{activeModel}`. `onRehydrateStorage` handles both formats: reads `activeModel` from either shape, derives provider via `MODEL_PROVIDER_MAP`. Users' existing model selections survive the upgrade transparently.

## Open Questions

None — all design decisions resolved.
