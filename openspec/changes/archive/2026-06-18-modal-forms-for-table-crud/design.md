# Design: Modal Forms for Table CRUD

## Technical Approach

Extract `BreweryForm` from duplicated create/edit logic, mount it inside a reusable `EntityFormModal` (native `<dialog>`). Modal state is driven by URL search params (`?modal=new` / `?modal=edit&id=x`), preserving deep-link compatibility while keeping the table alive underneath. On success, a callback refreshes the list and clears params.

## Architecture Decisions

| Decision | Option | Tradeoff | Choice |
|----------|--------|----------|--------|
| Modal state driver | URL search params | vs local state: search params enable deep-links and back-button close; local state is simpler but breaks bookmarking | **search params** |
| Form component shape | Single `BreweryForm` with `initialData?` | vs separate CreateForm/EditForm: single component deduplicates 200+ lines of JSX; conditional ID logic is trivial | **single form** |
| List refresh mechanism | Callback `onSuccess` triggers `loadBreweries()` | vs Zustand cache: no global cache exists today; refetch is simpler and consistent with existing patterns | **callback refetch** |
| Modal stacking guard | Reuse `getTopmostModal()` from `modalUtils` | vs new stacking logic: existing utility is battle-tested by `EntityDetailModal`; no need to invent | **reuse existing** |

## Data Flow

Create: click "Agregar" → `setSearchParams({modal:'new'})` → list reads param → opens `EntityFormModal` with `BreweryForm` (no initialData) → submit → `apiClient.post()` → `onSuccess()` triggers `loadBreweries()` → modal closes → `setSearchParams({}, {replace:true})`.

Edit: same with `?modal=edit&id=x`; `BreweryForm` fetches data via `useEffect` when `id` is provided, then `apiClient.put()` on submit.

Browser back: closing calls `setSearchParams({}, {replace:true})` so back skips the cleared state — returns to previous page, not back into the modal.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/breweries/BreweryForm.tsx` | **Create** | Extracted form with `initialData?`, `id?`, `onSuccess`, `onCancel` props |
| `src/presentation/components/organisms/EntityFormModal/EntityFormModal.tsx` | **Create** | Reusable `<dialog>` wrapper; mirrors `EntityDetailModal` patterns |
| `src/presentation/components/organisms/EntityFormModal/EntityFormModal.scss` | **Create** | Modal styles with `max-height:80vh`, scrollable body |
| `src/presentation/components/organisms/EntityFormModal/index.ts` | **Create** | Barrel export |
| `src/features/breweries/BreweryList.tsx` | **Modify** | Add search-param reading, `EntityFormModal` mounting, `id` state for edit |
| `src/features/breweries/BreweryCreate.tsx` | **Delete** | Replaced by `BreweryForm` in modal |
| `src/features/breweries/BreweryEdit.tsx` | **Delete** | Replaced by `BreweryForm` in modal |
| `src/features/breweries/index.ts` | **Modify** | Export `BreweryForm`, remove `BreweryCreate`/`BreweryEdit` |
| `src/app/router.tsx` | **Modify** | Replace `/breweries/new` and `/breweries/:id/edit` with `Navigate` redirects to `/breweries?modal=…` |
| `src/presentation/components/organisms/index.ts` | **Modify** | Export `EntityFormModal` |
| `src/features/breweries/BreweryList.test.tsx` | **Modify** | Rewrite navigation assertions (tests #6, #7) to modal open/close |
| `src/features/breweries/BreweryEdit.test.tsx` | **Replace** | Rename → `BreweryForm.test.tsx`; test form in isolation |
| `src/app/router.test.tsx` | **Modify** | Assert redirect routes instead of page renders |

## Interfaces / Contracts

```typescript
// EntityFormModalProps — generic form dialog
interface EntityFormModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  isLoading?: boolean;
  children: React.ReactNode; // the domain form
}

// BreweryFormProps — pure form, no router
interface BreweryFormProps {
  initialData?: BreweryFormData; // undefined = create mode
  id?: string;                   // defined = edit mode
  onSuccess: () => void;        // list refresh + close
  onCancel: () => void;         // close modal
}

// BreweryFormData — flat string-based form state
// (mirrors Brewery but arrays and numbers as strings for inputs)
```

`BreweryForm` internally calls `parseArray()` / `joinArray()` — zero change to `arrayUtils`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `BreweryForm` fields, submission payload | Mock `apiClient`, assert payload shape and `onSuccess`/`onCancel` calls |
| Integration | Modal open/close via search params | Render list with `?modal=new`, assert dialog visible; close → dialog gone + params cleared |
| E2E | Full create/edit through modal | Click "Agregar" → fill → submit → row appears without page navigation |
| Regression | Delete flow, detail modal, error states | Keep 13 BreweryList tests; rewrite only `navigate` assertions to modal behavior |

**Strict TDD**: write `BreweryForm.test.tsx` BEFORE extraction. Tests validate extracted component matches current behavior. Write modal-integration tests before modifying `BreweryList`.

## Migration / Rollout

1. **Pilot**: Breweries only. Merge, validate in production.
2. **Replicate**: Coffee farms → animal feed producers → wine producers (three follow-up changes). Each: extract `*Form`, update `*List` with search params, redirect routes, rewrite tests. `EntityFormModal` is reused as-is.
3. **Rollback**: revert router changes, restore deleted `*Create`/`*Edit` from git history.

## Open Questions

- [ ] Should `BreweryForm` fetch its own edit data (via `useEffect` + `apiClient.get`), or should `BreweryList` fetch and pass `initialData`? *(Design assumes form fetches — keeps list clean.)*
- [ ] Should `?modal=edit&id=x` with invalid `id` show the form with a "Not Found" message, or redirect to list? *(Design assumes inline not-found state — same UX as current edit page.)*
