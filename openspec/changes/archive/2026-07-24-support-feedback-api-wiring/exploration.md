# Exploration: support-feedback-api-wiring

## Current State
The `FeedbackModal` organism (`src/presentation/components/organisms/FeedbackModal/FeedbackModal.tsx`) renders a full lifecycle form (idle → submitting → success/error) and accepts `onSubmit: (payload: FeedbackPayload) => Promise<FeedbackFormResult>`. It does NOT perform HTTP calls itself — the boundary contract is pure callback.

`ConfigPage.tsx` (line 116-121) currently passes an **inert stub** to FeedbackModal: `() => Promise.resolve({ success: true, message: 'Gracias por tu feedback.' })` — documented with a comment referencing CORTEXDIST-27.

The backend `POST /support/feedback` (CORTEXDIST-29, archived) is LIVE. It accepts ONLY `{ type, subject, message }` with `extra="forbid"` (any extra field → 422). Identity from JWT; recipient from `settings.support_to_email`. Responses: 200 `{success, message}`, 401, 422, 502, 503.

The API client layer (`src/services/api/client.ts`) exposes `apiClient.post<T>(endpoint, data)`. Auth token is attached automatically by reading `useAuthStore.getState().session?.access_token` (Zustand store, callable outside React). On 401: auto-logout + redirect. On other errors: extracts `error.detail || error.message || HTTP ${status}` from JSON body and throws `Error`. Status codes are NOT preserved in the thrown error — only the message string.

Existing service pattern: `adminUserApi.ts` — module-scope named functions wrapping `apiClient` calls. Tests mock `globalThis.fetch` with `vi.fn()`.

## Affected Areas
- `src/services/supportApi.ts` — **NEW**: service module wrapping `apiClient.post('/support/feedback', ...)` with error-to-FeedbackFormResult mapping
- `src/services/supportApi.test.ts` — **NEW**: unit tests (service layer isolated from React)
- `src/presentation/pages/ConfigPage.tsx` — **MODIFIED** ~line 116-121: replace inert stub with real `onSubmit` that imports and calls `supportApi`
- `src/presentation/pages/ConfigPage.test.tsx` — **MODIFIED**: one new integration test verifying the wiring calls the API endpoint (or a lightweight assertion that the stub is gone)
- `src/services/api/client.ts` — **UNCHANGED**: sufficient as-is; `apiClient.post()` already handles auth, JSON serialization, and error extraction

## CRITICAL TRAP: "Contexto seguro" / Current URL
The task asks about sending the current URL for context. **THE BACKEND SCHEMA HAS `extra="forbid"`.** Sending ANY extra field (including `currentUrl`) would cause a **422 Unprocessable Entity** — the entire request is rejected at the Pydantic validation layer before any business logic runs.

The only accepted payload shape is `{ type, subject, message }`. The backend resolves user identity from the JWT and the email recipient from `settings.support_to_email` (default `stalloy@stalloy.io`) — the frontend MUST NOT send `email`, `role`, `currentUrl`, or any extra keys.

**Decision**: Do NOT send `currentUrl`. If URL context is genuinely valuable for support diagnosis, the user can mention it in the `message` field, or a future backend schema change (CORTEXDIST-30) could add an optional `url` field. For this task, sending extra fields would BREAK the integration.

## Approaches

| Approach | Pros | Cons | Complexity |
|----------|------|------|------------|
| 1. Service wrapper (`supportApi.ts`) | Follows `adminUserApi` convention, testable in isolation, reusable, clean separation | One new file (trivial overhead) | Low |
| 2. Inline in ConfigPage | Zero new files | Service logic leaks into presentation, can't unit-test service, breaks separation of concerns, anti-pattern | Low (but poor architecture) |

## Error Mapping Strategy
Since `apiClient` throws `Error` with the server's detail text (already Spanish from backend), we can:
- Network/TypeError → `"No se pudo conectar con el servidor. Verificá tu conexión."`
- Throw with message containing server detail → pass through as-is (server messages are already user-friendly Spanish: "No se pudo enviar el mensaje de feedback", "El servicio de email no está configurado")
- 401 → auto-handled by `apiClient` (logout + redirect) — no explicit mapping needed; the thrown `Error('Unauthorized')` becomes a generic error

The catch block in the service should differentiate between `TypeError` (network) and generic `Error` (server), returning `FeedbackFormResult` accordingly so FeedbackModal never receives a rejected promise — it always gets a resolved `{ success, message }`.

## Recommendation
**Approach 1 — Service wrapper (`supportApi.ts`)**. Follows the exact pattern of `adminUserApi.ts`, keeps ConfigPage thin, enables isolated unit testing, and is the clear idiomatic choice for this codebase. The change in ConfigPage is a one-line swap: replace the stub with `submitFeedback`.

## Risks
- **422 trap (HIGH)**: If any extra field (email, role, currentUrl) leaks into the payload, the backend rejects everything with 422. The service MUST send exactly `{ type, subject, message }` and nothing else. Tests must assert this contract.
- **Test fragility**: ConfigPage integration tests mock `useAuthStore` extensively; adding a new test that verifies real API wiring requires careful mock management so existing tests don't break.
- **apiClient status ambiguity**: The thrown Error doesn't carry the HTTP status code — only the message. If we need status-specific behavior beyond what the server message provides, we'd need to modify `apiClient`. Not needed for this task.
- **No explicit 403 handling needed**: Backend endpoint has no role gate (any authenticated user). The `apiClient` 401 auto-logout covers the unauthenticated case.

## Ready for Proposal
Yes — the service layer, error mapping, and ConfigPage wiring are clearly understood. The only unresolved question (current URL) is RESOLVED: do NOT send it (backend `extra="forbid"` would reject). Proceed to sdd-propose.
