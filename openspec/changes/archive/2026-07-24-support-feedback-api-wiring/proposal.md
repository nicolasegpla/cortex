# Proposal: Support Feedback API Wiring

## Intent

Replace the inert stub in `ConfigPage.tsx` (line 116-121) with a real service call to `POST /support/feedback`. The FeedbackModal organism already implements the full submit lifecycle — it just needs a real `onSubmit` that hits the backend. This is the final frontend integration for CORTEXDIST-32.

## Scope

### In Scope
- New `src/services/supportApi.ts` — service wrapper following `adminUserApi.ts` convention
- New `src/services/supportApi.test.ts` — unit tests for service layer (happy path, error mapping, payload contract, auth header)
- Modified `ConfigPage.tsx` — replace inert stub with `submitFeedback` import
- Modified `ConfigPage.test.tsx` — integration test verifying real API wiring

### Out of Scope
- Backend changes (CORTEXDIST-29 archived, endpoint live)
- `apiClient` modifications (sufficient as-is)
- `currentUrl` / extra context fields (backend `extra="forbid"` would 422)
- Email/role fields (identity is JWT-derived)
- FeedbackModal changes (already spec-complete)

## Capabilities

### New Capabilities
- `support-feedback-api`: Frontend service layer for submitting feedback — wraps `apiClient.post('/support/feedback', payload)`, enforces exact `{type, subject, message}` payload contract, maps errors to `FeedbackFormResult`

### Modified Capabilities
None — `feedback-modal` spec already defines the `onSubmit` boundary contract; this change fulfills it without altering the spec.

## Approach

Service wrapper (`supportApi.ts`) exporting `submitFeedback(payload: FeedbackPayload): Promise<FeedbackFormResult>`:
- Calls `apiClient.post('/support/feedback', payload)` — auth token attached automatically
- On success: returns server's `{success: true, message}`
- On `TypeError` (network): returns `{success: false, message: "No se pudo conectar con el servidor. Verificá tu conexión."}`
- On `Error` (server): passes through `error.message` as-is (backend messages are already user-friendly Spanish)
- ConfigPage: one-line swap — `onSubmit={submitFeedback}`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cortex-frontend/src/services/supportApi.ts` | New | Service module with `submitFeedback` |
| `cortex-frontend/src/services/supportApi.test.ts` | New | Unit tests (7 cases) |
| `cortex-frontend/src/presentation/pages/ConfigPage.tsx` | Modified | Replace stub ~line 116-121 |
| `cortex-frontend/src/presentation/pages/ConfigPage.test.tsx` | Modified | Add wiring integration test |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Extra field in payload → 422 | Med | Test asserts exact `{type, subject, message}` shape; no spread operators |
| ConfigPage test mock conflicts | Low | Isolate new test with dedicated `vi.mock` for `supportApi`; existing mocks unchanged |
| Server message passthrough exposes raw errors | Low | Backend messages are curated Spanish; verified in CORTEXDIST-29 |

## Rollback Plan

Revert the ConfigPage stub replacement (restore `() => Promise.resolve(...)`) and delete `supportApi.ts` + tests. Single commit, zero migration, zero backend impact.

## Dependencies

- Backend `POST /support/feedback` (CORTEXDIST-29) — LIVE
- `apiClient.post` with auth — existing
- `FeedbackModal` organism — existing, spec-complete

## Success Criteria

- [ ] `submitFeedback` sends exactly `{type, subject, message}` to `/support/feedback` with Bearer token
- [ ] Network errors map to user-friendly Spanish message
- [ ] Server errors pass through backend's Spanish message
- [ ] ConfigPage renders FeedbackModal with real `submitFeedback` as `onSubmit`
- [ ] All 7 service unit tests pass; ConfigPage integration test passes
- [ ] `tsc -b` clean; no type errors
