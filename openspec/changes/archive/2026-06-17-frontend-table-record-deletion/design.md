# Design: Frontend Table Record Deletion

## Technical Approach

Fix the `apiClient` 204 parsing bug at the transport layer, extract a reusable `useDeleteRecord` hook + `DeleteConfirmationModal` organism, and refactor four list components to consume them. The hook encapsulates delete lifecycle (open → confirm → pending → result), the modal renders the three visual states, and list components wire the hook via a single `onDelete` + `onDeleted` callback pair. Strict TDD throughout: write tests first, implement to green, refactor.

## Architecture Decisions

| Decision | Option | Tradeoff | Choice |
|----------|--------|----------|--------|
| Modal implementation | Native `<dialog>` | Built-in focus trapping, backdrop, ESC handling vs limited styling control | Native `<dialog>` — accessible by default, no dependency |
| Hook location | `src/hooks/useDeleteRecord.ts` | New directory vs colocation in `src/features/shared/` | `src/hooks/` — project has no hooks dir yet, proposal explicitly scopes it |
| Modal placement | `src/presentation/components/organisms/DeleteConfirmationModal/` | Organisms for composite UIs; follows Atomic Design convention already in the codebase | Organism — it composes Button atoms + dialog wrapper + stateful views |
| apiClient 204 return type | `Promise<void>` for delete | Explicitly void vs generic `Promise<T>` where T is never meaningful on 204 | `Promise<void>` — self-documenting; no consumer expects a body from DELETE |
| Success feedback dismissal | Auto-close after 2s | Auto-close vs manual dismiss button | Auto-close — removes deleted row, feedback briefly visible, matches spec scenario |

## Data Flow

```
ListComponent          useDeleteRecord          apiClient.delete
    │                       │                        │
    │── openModal(id) ───→  │                        │
    │                       │── set isOpen=true      │
    │                       │── show modal           │
    │   [user confirms]     │                        │
    │── confirmDelete() ──→ │                        │
    │                       │── set isDeleting=true  │── DELETE /entity/{id} ──→
    │                       │                        │←── 204 ──
    │                       │── onSuccess(id) ──────→│
    │                       │── set isDeleting=false │
    │                       │── show success state   │
    │   [auto-close 2s]     │                        │
    │── onDeleted(id) ───→  │── set isOpen=false     │
    │   remove row          │                        │

Error path:
    │                       │                        │←── 403 ──
    │                       │── set error="..."      │
    │                       │── set isDeleting=false │
    │                       │── show error state     │
    │   [user dismisses]    │                        │
    │── cancelDelete() ───→ │── set isOpen=false     │
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/services/api/client.ts` | Modify | Guard `response.json()`: return `undefined` when status is 204 |
| `src/hooks/useDeleteRecord.ts` | Create | Generic hook: manages modal state, API call, loading/error/success lifecycle |
| `src/presentation/components/organisms/DeleteConfirmationModal/DeleteConfirmationModal.tsx` | Create | `<dialog>`-based modal with three states: confirm, deleting, result |
| `src/presentation/components/organisms/DeleteConfirmationModal/DeleteConfirmationModal.scss` | Create | Modal styling |
| `src/presentation/components/organisms/DeleteConfirmationModal/index.ts` | Create | Barrel export |
| `src/presentation/components/organisms/index.ts` | Modify | Add `DeleteConfirmationModal` export |
| `src/features/breweries/BreweryList.tsx` | Modify | Replace `window.confirm` + inline handler with `useDeleteRecord` |
| `src/features/coffee-farms/CoffeeFarmList.tsx` | Modify | Same refactor |
| `src/features/wine-producers/WineProducerList.tsx` | Modify | Same refactor |
| `src/features/animal-feed-producers/AnimalFeedProducerList.tsx` | Modify | Same refactor |
| `src/services/api/client.test.ts` | Modify | Add 204 test case |
| `src/hooks/useDeleteRecord.test.ts` | Create | Unit tests for hook states and edge cases |
| `src/presentation/components/organisms/DeleteConfirmationModal/DeleteConfirmationModal.test.tsx` | Create | Component tests: states, accessibility, interactions |
| `src/features/breweries/BreweryList.test.tsx` | Modify | Add delete flow integration test |

## Interfaces / Contracts

```typescript
// Hook interface
interface UseDeleteRecordResult {
  isOpen: boolean;
  isDeleting: boolean;
  error: string | null;
  itemId: string | null;
  openModal: (id: string) => void;
  confirmDelete: () => Promise<void>;
  cancelDelete: () => void;
}

function useDeleteRecord(endpoint: string, onDeleted: (id: string) => void): UseDeleteRecordResult;

// Modal props
interface DeleteConfirmationModalProps {
  isOpen: boolean;
  isDeleting: boolean;
  error: string | null;
  itemLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// apiClient signature change
delete: (endpoint: string) => Promise<void>  // was: <T>(endpoint: string) => Promise<T>
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — apiClient | 204 returns without parse error; non-2xx still throws | Mock fetch with 204 response, verify no JSON parse call |
| Unit — useDeleteRecord | State transitions: idle→open→deleting→success→closed; error path preserves modal | Mock apiClient.delete; assert hook state at each phase |
| Component — Modal | Confirm/deleting/success/error states render correctly; ESC closes; focus trap works | Render with each prop combination; fire user events |
| Integration — List | Full delete flow: button click → modal → confirm → API → row removed; 403 shows error | Mock fetch for 204 and 403; assert DOM at each step |

## Migration / Rollout

No migration required. The apiClient 204 fix is backward-compatible — existing consumers of `delete()` don't expect a return value. All four lists are refactored in one change.

## Open Questions

- None — all product decisions confirmed by user (modal type, error placement, button visibility)
