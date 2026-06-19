## Exploration: reorganizar-vista-chat-selector-modelos

### Current State

The chat page (`ChatPage.tsx`) renders two native `<select>` elements in the top bar: one for the provider and one for the model. The provider list is derived from `useCredentialsStore.getValidatedProviders()`, and the model list is derived from the `PROVIDER_MODELS` constant in `store.ts` keyed by the active provider. Selection state lives in the persisted Zustand store `useChatStore` (`activeProvider`, `activeModel`). Changing the provider triggers `setActiveProvider`, which keeps the current model only if it exists in the new provider's model list; otherwise it falls back to the provider's default model.

The input area is a fixed bottom bar with an auto-resizing textarea and a send/stop button. There is no reusable dropdown, popover, or menu component in the project; the only overlay patterns are native `<dialog>` modals and a custom config-modal overlay in `AppShell.tsx`.

### Affected Areas

- `cortex-frontend/src/features/chat/ChatPage.tsx` — Currently hosts both selectors in `chat-page__top-bar`; needs to remove them and place a model selector near the input.
- `cortex-frontend/src/features/chat/ChatPage.scss` — Top-bar selector styles (`__selectors`, `__select`) need removal or relocation; input-area styles need a slot for the model badge/dropdown.
- `cortex-frontend/src/features/chat/store.ts` — `PROVIDER_MODELS`, `setActiveProvider`, `setActiveModel`, and hydration logic are the source of truth for model selection. May need a helper to derive the provider from a selected model.
- `cortex-frontend/src/features/chat/credentialsStore.ts` — `getValidatedProviders()` gates which providers (and therefore which models) are available.
- `cortex-frontend/src/features/chat/ChatSettings.tsx` — Sets both provider and model when a new credential is saved; behavior must stay consistent if model becomes the primary user-facing selector.
- `cortex-frontend/src/features/chat/ChatPage.test.tsx` — Tests assert the presence of "Seleccionar proveedor" and "Seleccionar modelo" labels in the top bar; these will need updating.
- `cortex-frontend/src/features/chat/store.test.ts` — Provider/model state tests remain relevant but new tests may be needed for any model-to-provider derivation helper.
- `cortex-frontend/src/presentation/components/atoms/Icon/` — No `ChevronDown` icon exists; one will be needed for a ChatGPT-style badge dropdown.

### Existing Patterns

- **State**: Zustand 5 with `persist` middleware for `activeProvider`/`activeModel`.
- **Selectors**: Native `<select>` only; no custom dropdown library or headless UI installed.
- **Modals/overlays**: Native `<dialog>` (`EntityDetailModal`, `DeleteConfirmationModal`) and a hand-rolled overlay in `AppShell.tsx`.
- **Icons**: Custom SVG icons under `presentation/components/atoms/Icon/`.
- **Styling**: Feature-level SCSS with CSS custom properties; ChatPage uses CSS variables directly rather than the `variables` module used by ChatSettings.

### Approaches

1. **Native select inside the input box (minimal change)**
   - Move the existing model `<select>` from the top bar into the input area, e.g., between the textarea and the send button or as a small badge above the input.
   - Remove the provider `<select>` from the top bar. Keep provider selection implicit: when the user picks a model, derive the provider from `PROVIDER_MODELS` and call `setActiveProvider` + `setActiveModel`.
   - **Pros**: Smallest implementation surface; no new components; leverages existing accessibility and keyboard handling.
   - **Cons**: Does not look like the ChatGPT badge/dropdown described by the user; styling options for native `<select>` are limited.
   - **Effort**: Low

2. **Custom model badge with inline option list (ChatGPT-style)**
   - Add a button/badge next to the textarea showing the active model name with a chevron. Clicking it toggles a small inline list of available models grouped by provider.
   - Build the dropdown with plain JSX + `useState` + `useRef`/click-outside; no external library.
   - **Pros**: Matches the requested visual style; keeps the UX compact and modern; single source of truth becomes the model selection.
   - **Cons**: Requires writing custom dropdown behavior (keyboard navigation, focus trap, positioning, click-outside, accessibility) from scratch; needs new icon and tests.
   - **Effort**: Medium

3. **Reusable `ModelSelector` molecule + derived provider state**
   - Extract a `ModelSelector` component that receives the validated providers and active model and emits `onSelectModel`. Internally it maps model → provider and updates the store.
   - Optionally introduce a store action `setActiveModelById(modelId)` that internally derives and sets both provider and model.
   - **Pros**: Clean separation of concerns; reusable if model selection is needed elsewhere; centralizes model-to-provider mapping.
   - **Cons**: Slightly more files and tests; still requires either Approach 1 or 2 for the dropdown UI.
   - **Effort**: Medium

4. **Keep provider selection elsewhere (settings only)**
   - Remove both selectors from the chat page. Let the user pick the provider only in `ChatSettings`, and pick the model in the input area from that provider's model list.
   - **Pros**: Matches the "only model selector in input" requirement literally; simplifies the chat page header.
   - **Cons**: Provider selection becomes harder to reach during a chat; user must open Config to switch providers.
   - **Effort**: Low-Medium

### Recommendation

Use **Approach 3 combined with Approach 2**: create a small `ModelSelector` molecule that owns the model-to-provider mapping and renders a ChatGPT-style badge button with a custom inline dropdown. This gives the requested UX while keeping store logic centralized and testable. The provider select should be removed from the top bar; provider becomes a derived value of the selected model.

### Risks

- **Provider derivation edge cases**: If two providers ever share a model ID, deriving the provider from the model becomes ambiguous. Current data does not overlap, but the mapping helper should be deterministic (e.g., first match).
- **State synchronization**: `ChatSettings` currently calls `setActiveProvider` then `setActiveModel` when saving a credential. With model as primary, that flow should still work, but the chat-page auto-switch effect that forces a validated provider may conflict if the active model belongs to an unvalidated provider.
- **Hydration logic**: `sanitizePersistedSelection` validates provider + model on rehydration. If model becomes primary, ensure a persisted invalid model still resolves to a valid provider/model pair.
- **Custom dropdown accessibility**: Without a dropdown library, keyboard navigation, focus management, ARIA roles, and screen-reader labels must be implemented and tested manually.
- **Test updates**: `ChatPage.test.tsx` expects top-bar selects; existing assertions must be rewritten and new tests added for the input-area selector.
- **No existing dropdown primitives**: Any new dropdown must be built from scratch or the project must accept a native select (Approach 1) as an interim step.

### Open Questions

1. Should the provider selector be removed entirely, or moved to a secondary location (e.g., inside the model dropdown as a group header, or kept only in `ChatSettings`)?
2. Should the dropdown be a custom ChatGPT-style popover, or is a native `<select>` acceptable for the first iteration?
3. When the user selects a model, should the provider auto-switch implicitly, or should switching provider still be an explicit action?
4. Should the model badge be inside the input box or directly above/below it?

### Ready for Proposal

Yes. The change is well scoped and feasible. The orchestrator should confirm the open questions (especially #1 and #2) before proceeding to `sdd-propose`.
