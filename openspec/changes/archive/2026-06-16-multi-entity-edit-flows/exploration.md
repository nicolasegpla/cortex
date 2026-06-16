## Exploration: Multi-entity edit flows

### Current State

The four client-record domains (`coffee-farms`, `wine-producers`, `breweries`, `animal-feed-producers`) already have full CRUD infrastructure on the backend:

- Each router exposes `POST /`, `GET /`, `GET /{id}`, `PUT /{id}`, and `DELETE /{id}`.
- Each service implements `create`, `list_all`, `get_by_id`, `update`, and `delete`.
- Each schema defines `Create`, `Update`, and `Response` Pydantic models.
- Backend tests already cover the `PUT /{id}` happy path and 404 cases.

On the frontend, only list and create flows exist:

- `*List.tsx` components fetch records, render tables, and support deletion.
- `*Create.tsx` components render large, sectioned forms and `POST` new records.
- The `Editar` buttons in the list views are present but have no `onClick` handler and no route target.
- `apiClient` already exposes `put(endpoint, data)`.
- `router.tsx` only registers `/:entity/new` routes; no `/:entity/:id/edit` routes exist.

### Affected Areas

- `cortex-frontend/src/app/router.tsx` — add four `/:id/edit` routes.
- `cortex-frontend/src/features/coffee-farms/CoffeeFarmList.tsx` — wire `Editar` button to edit route.
- `cortex-frontend/src/features/coffee-farms/CoffeeFarmEdit.tsx` **(new)** — fetch by ID, render form, `PUT` updates.
- `cortex-frontend/src/features/coffee-farms/index.ts` — export new edit component.
- `cortex-frontend/src/features/wine-producers/WineProducerList.tsx` — wire `Editar` button.
- `cortex-frontend/src/features/wine-producers/WineProducerEdit.tsx` **(new)** — edit form.
- `cortex-frontend/src/features/wine-producers/index.ts` — export new edit component.
- `cortex-frontend/src/features/breweries/BreweryList.tsx` — wire `Editar` button.
- `cortex-frontend/src/features/breweries/BreweryEdit.tsx` **(new)** — edit form.
- `cortex-frontend/src/features/breweries/index.ts` — export new edit component.
- `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerList.tsx` — wire `Editar` button.
- `cortex-frontend/src/features/animal-feed-producers/AnimalFeedProducerEdit.tsx` **(new)** — edit form.
- `cortex-frontend/src/features/animal-feed-producers/index.ts` — export new edit component.
- Test files for each new component and updated list behavior (8+ new/updated test files).
- Backend changes are likely limited to wiring verification; schemas/services/routers already support updates.

### Approaches

1. **Per-entity Edit components (copy Create + load logic)**
   - Pros: Matches existing Create-component pattern; no abstraction risk; easy to test per domain; preserves field-specific selects, checkboxes, and array parsing exactly as created.
   - Cons: Repeats ~250-350 lines of form JSX per entity; four similar but separate files to maintain.
   - Effort: Medium

2. **Shared generic EntityForm shell with per-entity field configs**
   - Pros: Reduces duplication; centralizes layout, loading, error, and submit behavior; easier to add future entities.
   - Cons: High upfront design cost to express all field types (text, email, number, select, checkbox, textarea, comma-array) generically; current code has no such abstraction; may fight TypeScript strictness.
   - Effort: High

3. **Hybrid: shared form-section layout + per-entity field renderers**
   - Pros: Reuses styling and submit/loading/error boilerplate while keeping domain-specific fields explicit and type-safe.
   - Cons: Slightly more files than pure copy; needs careful interface design.
   - Effort: Medium-High

### Recommendation

Start with **Approach 1 (per-entity Edit components)**.

The existing `*Create.tsx` files are already near-identical in structure but diverge in field sets, selects, checkboxes, and array parsing. Copying each Create component into an Edit component and adding:

1. `useParams` to read `:id`,
2. an effect that `GET /{entity}/{id}` and normalizes arrays to comma-separated strings for inputs,
3. a `PUT /{entity}/{id}` submit handler,
4. navigation back to the list on success,

is the lowest-risk path that respects the current codebase style and strict TDD requirement. It also keeps each PR reviewable and self-contained.

A shared generic form abstraction (Approach 2 or 3) should be deferred until at least one entity edit flow is implemented and the real duplication pain points are visible.

### Risks

- **Array field round-trip**: Create forms store arrays as comma-separated strings and parse them on submit. Edit forms must deserialize existing arrays back into comma-separated strings for the inputs and re-serialize on submit. Any mismatch produces corrupt data.
- **Numeric/decimal parsing**: Fields such as `numero_arboles`, `litros_mes`, `hectareas_totales`, `hectareas_cafe`, and `puntaje_cafe` are strings in form state but must be parsed/cast before `PUT`.
- **Loading and error UX**: Edit forms need a loading state while fetching the record and clear error handling if the record is missing or the update fails.
- **Route parameter consistency**: `router.tsx` must use a consistent pattern (e.g., `/:entity/:id/edit`) and all four list views must navigate with the correct record ID.
- **Size/scope creep**: Four Edit components plus tests will likely exceed the 400-line review budget if delivered in a single PR.

### Ready for Proposal

Yes. The backend is already update-capable; the work is primarily frontend wiring and new Edit components. The next phase should produce a proposal that scopes delivery as chained PRs (one per entity or frontend-only slices) to respect the 400-line review budget.
