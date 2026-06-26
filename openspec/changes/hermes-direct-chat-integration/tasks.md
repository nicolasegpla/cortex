# Tasks: Hermes Direct Chat Integration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~300–400 (client.ts ~100, client.test.ts ~180, store.ts ~25, store.test.ts ~50, .env.example ~1) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Hermes client + tests + env) → PR 2 (store swap + tests) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | New Hermes client service + unit tests; no behavior change | PR 1 | Base: main; files: client.ts, client.test.ts, .env.example |
| 2 | Store transport swap; existing UI/store boundary unchanged | PR 2 | Base: main after PR 1 merges (stacked) OR PR 1 branch (feature-chain) |

## Phase 1: Pre-flight Verification (gate before coding)

- [ ] 1.1 Curl `POST https://hermes-railway-production-dfdb.up.railway.app/v1/chat/completions` with `Authorization: Bearer hermes-railway-2026`; confirm `data: {"choices":[{"delta":{"content":"..."}}]}` + `data: [DONE]` terminator. **RESOLVED** — the earlier blocker was an auth-contract mismatch, not an endpoint outage. The live Hermes deployment accepts `Authorization: Bearer hermes-railway-2026` and returns the expected OpenAI-compatible SSE shape and `data: [DONE]`. The spec/design auth header has been updated from the rejected `X-Hermes-Session-Key` to the working bearer contract.
- [ ] 1.2 Confirm Hermes accepts current `MODEL_PROVIDER_MAP` IDs without aliasing; if mapping is required, stop and re-plan. **Previously blocked by auth-contract mismatch** — verification used `Authorization: Bearer hermes-railway-2026`. The tested IDs (`gpt-4o`, `gpt-4o-mini`, `claude-3-5-sonnet-20241022`, `gemini-2.0-flash`, `deepseek-chat`) all streamed successfully, so no aliasing is required.
- [ ] 1.3 Verify Hermes CORS allows the dev origin (`http://localhost:5173`) with the `Authorization` header; document outcome. **RESOLVED** — preflight responds with `Access-Control-Allow-Origin: http://localhost:5173` and `Access-Control-Allow-Headers: Authorization, Content-Type, Idempotency-Key`. The `Authorization` header is permitted; the previously rejected `X-Hermes-Session-Key` custom header is no longer required.
- [x] 1.4 Decide chain strategy (stacked-to-main / feature-branch-chain / size:exception) and capture the choice before apply. **Resolved: stacked-to-main** (implementation boundary = PR 1).

## Phase 2: Hermes Client Foundation (PR 1)

- [x] 2.1 RED: create `cortex-frontend/src/services/hermes/client.test.ts` with mocked `fetch` + fake `ReadableStream` covering: standard `data:` chunk, `data: [DONE]` terminator, non-data lines ignored, abort terminates fetch (no error thrown), HTTP 401 → `HermesError`, network failure → `HermesError`, `Authorization: Bearer hermes-railway-2026` header present.
- [x] 2.2 GREEN: create `cortex-frontend/src/services/hermes/client.ts` exporting `streamChat({ model, messages, signal })` async generator, `HermesError` class with `type: 'http' | 'network'` and optional `status`, and `parseSSEChunks` helper.
- [x] 2.3 Read base URL from `import.meta.env.VITE_HERMES_CHAT_URL`; default `https://hermes-railway-production-dfdb.up.railway.app`; append `/v1/chat/completions`.
- [x] 2.4 Add inline `// TEMPORARY: shared test bearer token — NOT production-safe, shares memory/access across users, do not deploy to real users.` comment above the hardcoded token constant.
- [x] 2.5 Add `VITE_HERMES_CHAT_URL=https://hermes-railway-production-dfdb.up.railway.app` to `cortex-frontend/.env.example`.
- [x] 2.6 REFACTOR: dedupe SSE parsing; confirm `signal` is forwarded to `fetch` (the bug fix).

## Phase 3: Store Integration (PR 2)

- [x] 3.1 RED: rewrite `cortex-frontend/src/features/chat/store.test.ts` to `vi.mock('@/services/hermes/client')` returning a fake async generator; preserve existing scenario coverage (loading, error, abort, message append).
- [x] 3.2 GREEN: in `cortex-frontend/src/features/chat/store.ts` `sendMessage`, replace `apiClient.stream('/chat/stream', ...)` + `readSSEChunks` loop with `for await (const delta of streamChat({ model, messages, signal }))`; keep `readSSEChunks` and the backend import for rollback.
- [x] 3.3 Catch `HermesError` → `set({ error: err.message, isLoading: false })`; abort must NOT surface as error.
- [x] 3.4 Run `pnpm test` + `tsc -b` inside `cortex-frontend/`; both green.

## Phase 4: Verification & Out-of-Scope Marker

- [ ] 4.1 Manual smoke: send a message in dev; SSE chunks stream to UI; stop button terminates fetch (DevTools → no pending request after stop).
- [ ] 4.2 Add explicit note to PR 2 description: **OUT OF SCOPE for this change** — the preserved scenario "Use registered-entity database-backed answers" continues to require the backend SQL orchestrator; the direct Hermes test transport does not exercise it. Backend `/chat/stream` is untouched.
- [ ] 4.3 Confirm rollback path from `proposal.md` (revert `store.ts`, delete `cortex-frontend/src/services/hermes/`, drop the env var); no DB migration required.

## Explicitly Out of Scope (do not implement in this change)

- Per-user session-key exchange/rotation
- Model alias mapping or catalog discovery
- Provider credential UI removal
- Backend `/chat/stream` deprecation
- Conversation truncation/summarization
- Re-implementing the DB-tool-backed scenario over Hermes (preserved, not migrated)
