# Proposal: Modal Forms for Table CRUD

## Intent

Replace full-page create/edit routes with modal forms rendered over the entity list. This keeps table context alive, reduces navigation friction, and consolidates duplicated form/modal patterns across four producer domains.

## Scope

### In Scope
- Extract domain-specific `*Form` components (reusable, testable, modal-agnostic)
- Create a reusable `EntityFormModal` organism (native `<dialog>` wrapper)
- Wire modal open/close into `*List` components via search params
- Migrate **breweries** as the pilot domain
- Preserve deep-link compatibility (`/breweries/new`, `/breweries/:id/edit`)
- List auto-refresh after successful create/update
- Update affected tests

### Out of Scope
- Migrating coffee-farms, animal-feed-producers, wine-producers (follow-up changes)
- Generic form builder or schema-driven forms
- Optimistic list updates (we refetch, not patch)
- Per-row inline edit actions outside the detail modal

## Capabilities

### New Capabilities
- `entity-form-modal`: Reusable `<dialog>` wrapper that hosts any domain form, manages open/close lifecycle, focus trapping, Escape handling, and success/error states
- `domain-form-components`: Extracted `BreweryForm` (and later others) as pure form components accepting `initialData`, `onSubmit`, `onCancel` props

### Modified Capabilities
- `breweries-crud`: List now opens create/edit modals instead of navigating to separate pages; Edit action from detail modal opens form modal instead of route navigation
- `entity-edit-flows`: Edit routes become search-param-driven modal triggers on the list page instead of standalone page renders; submission closes modal and refreshes list instead of redirecting
- `row-detail-modal`: Edit button behavior changes from route navigation to opening the form modal (stays within list context)

## Approach

**Hybrid of Approach 3 + 4 from exploration:**

1. **Extract `BreweryForm`** from `BreweryCreate`/`BreweryEdit` into a single component that accepts `initialData?`, `onSubmit`, `onCancel`. This is a pure form — no routing, no modal logic.

2. **Create `EntityFormModal`** as a reusable `<dialog>` organism that accepts `title`, `children`, `isOpen`, `onClose`, `isLoading`. Uses `showModal()`/`close()`, backdrop click, Escape (topmost guard via existing `getTopmostModal`), and focus return to trigger element.

3. **Keep routes but change semantics.** `/breweries/new` and `/breweries/:id/edit` remain registered but render the `BreweryList` with search params (`?modal=new` or `?modal=edit&id=xyz`). The list reads `useSearchParams()` and opens the corresponding modal.

4. **Deep-link behavior:** Direct URL to `/breweries/new` loads the list and opens the create modal. Direct URL to `/breweries/:id/edit` loads the list and opens the edit modal for that ID. If the list route is already loaded, the search param alone triggers the modal.

5. **Back button:** Closing the modal calls `navigate('/breweries', { replace: true })` to clear search params. The browser back button naturally exits the modal because the search param is removed from history.

6. **List refresh:** The form modal receives a `onSuccess` callback from the list. After successful POST/PUT, the callback triggers `fetchBreweries()` (the list's existing fetch function). The modal then closes. Simple refetch — no optimistic updates, no Zustand cache.

7. **Accessibility:** Native `<dialog>` provides built-in focus trap and Escape handling. On close, `useRef` on the trigger button restores focus. Stacked modals (detail → form) use existing `getTopmostModal` to ensure Escape only closes the topmost.

8. **Pilot:** Breweries only. Once the pattern is proven, replicate for the other three domains in follow-up changes.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/breweries/BreweryForm.tsx` | New | Extracted form component from Create/Edit |
| `src/features/breweries/BreweryCreate.tsx` | Removed | Replaced by modal flow |
| `src/features/breweries/BreweryEdit.tsx` | Removed | Replaced by modal flow |
| `src/features/breweries/BreweryList.tsx` | Modified | Adds search-param modal trigger, `EntityFormModal` mounting, `onSuccess` refresh |
| `src/presentation/components/organisms/EntityFormModal/` | New | Reusable form modal organism |
| `src/app/router.tsx` | Modified | `/breweries/new` and `/breweries/:id/edit` redirect to list with search params |
| `src/features/breweries/*.test.tsx` | Modified | Rewrite navigation assertions to modal open/close + form submission |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Test churn (~20 tests) | High | Rewrite tests incrementally; form component tests stay stable |
| Stacked modal focus conflicts (detail → form) | Medium | Reuse existing `getTopmostModal` guard; test Escape precedence |
| Long forms overflow modal viewport | Medium | Scrollable inner container with `max-height: 80vh` |
| Search param conflicts with existing list filters | Low | Use dedicated `modal` param; verify no collision with filter params |
| Direct deep-link to edit with invalid ID | Low | Form modal shows not-found state; same recovery as current edit page |

## Rollback Plan

1. Revert the `router.tsx` change to restore standalone `/breweries/new` and `/breweries/:id/edit` route elements.
2. Restore `BreweryCreate.tsx` and `BreweryEdit.tsx` from git history.
3. Revert `BreweryList.tsx` to pre-modal state (remove search-param handling and modal mounting).
4. The new `EntityFormModal` and `BreweryForm` files can remain as dead code or be deleted — they have no side effects if not imported.

## Dependencies

- Existing `EntityDetailModal` and `DeleteConfirmationModal` patterns (already in place)
- Existing `modalUtils.ts` (`getTopmostModal`, `hasNestedModal`)
- Existing `arrayUtils.ts` (`parseArray`, `joinArray`)
- React Router 7 `useSearchParams` API

## Success Criteria

- [ ] Brewery create/edit renders as a modal over the list, not a separate page
- [ ] Direct links to `/breweries/new` and `/breweries/:id/edit` open the list with the modal
- [ ] Browser back button closes the modal and returns to the clean list URL
- [ ] After successful create/update, the list refreshes with the new/updated data
- [ ] Escape closes the form modal; focus returns to the triggering button
- [ ] All brewery tests pass with modal assertions instead of navigation assertions
- [ ] `BreweryForm` component is independently testable (no modal or router coupling)
