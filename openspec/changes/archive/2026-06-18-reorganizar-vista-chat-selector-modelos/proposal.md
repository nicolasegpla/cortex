# Proposal: Reorganize Chat View — Inline Model Selector

## Intent

Move the model selector from the top bar to the input area (ChatGPT-style badge), removing the separate provider selector. The provider is derived from the selected model, reducing UI complexity and matching user expectations from mainstream AI chat products.

## Scope

### In Scope
- Create `ModelSelector` molecule: badge + popover with model list
- Place badge to the right of the chat textarea in the input bar
- Derive provider from selected model (eliminate separate provider `<select>`)
- Remove top-bar provider and model `<select>` elements
- Update `useChatStore` to keep `activeModel` as single source of truth; `activeProvider` becomes computed
- Update tests for `ChatPage` and store

### Out of Scope
- Intelligence-level selector (Instant/Medium/High) — not part of this change
- Backend changes — no API or routing modifications
- Provider credential management — unchanged
- Chat history or session persistence — unchanged
- Accessibility beyond basic keyboard navigation and ARIA for the popover

## Capabilities

### New Capabilities
- `model-selector-inline`: Inline badge-style model selector in the chat input bar with popover dropdown, model-to-provider derivation, and persisted selection via Zustand.

### Modified Capabilities
- `chat-session`: UI requirement changes — model selection moves from top bar to input area; provider is no longer a direct user selection but derived from model.

## Approach

1. **ModelSelector molecule**: New component at `src/presentation/components/molecules/ModelSelector/`. Renders a badge (`<button>`) showing current model name + chevron. On click, opens a hand-rolled popover (using `<dialog>` or position-fixed overlay — no external library).
2. **Provider derivation**: Add `getProviderForModel(modelId)` utility. `activeProvider` in store becomes a getter/computed value, not a separately settable field.
3. **Store change**: `useChatStore` keeps `activeModel` as persisted state. `activeProvider` is derived via selector. `setModel(modelId)` updates both.
4. **ChatPage cleanup**: Remove top-bar `<select>` elements for provider and model. Insert `ModelSelector` in the input bar area.
5. **Icon**: Add `ChevronDown` SVG icon to `Icon/` atoms.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-frontend/src/presentation/components/molecules/ModelSelector/` | New | Molecule: badge + popover |
| `cortex-frontend/src/features/chat/ChatPage.tsx` | Modified | Remove top selects, add ModelSelector |
| `cortex-frontend/src/features/chat/ChatPage.scss` | Modified | Remove old select styles, add badge styles |
| `cortex-frontend/src/features/chat/store.ts` | Modified | Derive provider from model, simplify setters |
| `cortex-frontend/src/presentation/components/atoms/Icon/` | Modified | Add ChevronDown icon |
| `cortex-frontend/src/features/chat/ChatPage.test.tsx` | Modified | Update tests for new UI |
| `cortex-frontend/src/features/chat/store.test.ts` | Modified | Update tests for derived provider |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Custom popover accessibility (keyboard, screen reader) | Medium | Use `<dialog>` or ARIA menu pattern; test with keyboard only |
| Provider derivation breaks existing sessions with stale model IDs | Low | Add fallback: if model not found, reset to default provider+model |
| Store migration breaks tests | Medium | Update store tests first; keep backward-compatible `setProvider` as no-op during transition |
| Popover positioning conflicts with input bar layout | Low | Use fixed positioning with z-index; test at various viewport sizes |

## Rollback Plan

1. Revert the commit(s) — all changes are frontend-only, no database or backend migration.
2. If partial revert needed: restore top-bar `<select>` elements and revert store changes to separate `activeProvider`/`activeModel` fields.
3. Feature flag not required — change is self-contained in ChatPage and its molecule.

## Dependencies

- Exploration artifact completed (`sdd/reorganizar-vista-chat-selector-modelos/explore`)
- No external library dependencies — hand-rolled popover, no new packages

## Success Criteria

- [ ] Model selector renders as badge in input bar, not in top bar
- [ ] Selecting a model automatically sets the correct provider
- [ ] Top bar no longer contains provider or model `<select>` elements
- [ ] Model selection persists across page reloads (via Zustand persist)
- [ ] All existing chat tests pass with updated UI
- [ ] Popover closes on outside click, Escape key, and model selection

## Size & PR Strategy

- **Estimated size**: ~200-300 lines (new molecule + store refactor + test updates)
- **PR strategy**: Single PR — changes are cohesive and within the 400-line review budget. If tests grow large, split into: (1) store refactor + tests, (2) UI component + ChatPage integration.
