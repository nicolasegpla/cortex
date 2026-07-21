# Proposal: Align Docs with n8n Ownership of Models and Credentials

## Intent

After CORTEXDIST-21 (frontend removal) and CORTEXDIST-22 (backend removal), several user-facing docs and the README still present provider-credential management, LLM adapter routing, and `ENCRYPTION_KEY` as active Cortex features. This is misleading: n8n owns agents, models, providers, and credentials; Cortex only proxies chat via `/chat/n8n`. The docs must reflect reality so new contributors and deployers don't configure phantom features.

## Scope

### In Scope

- **README.md** — remove 5 stale references: provider-credentials feature bullet, provider credential router bullet, LLM provider architecture row, Fernet encryption row, `ENCRYPTION_KEY` env var. Add a one-liner clarifying n8n owns provider/model/credential management and Cortex proxies chat only.
- **docs/CORTEX.md** — remove 7 stale references: LLM providers row, Encryption row, encrypted-storage bullet, adapter-registry bullet, backend encryption responsibility, frontend provider-credentials reference, `adapters/` directory annotation. Update "What CORTEX is today" and "Technical shape" to describe the n8n-mediated chat path as the only active LLM route.
- **docs/DEPLOYMENT.md** — remove `ENCRYPTION_KEY` row from the backend env-var table (zero consumers since CORTEXDIST-22 deleted `EncryptionService`).
- **docs/VERSIONING.md** — replace "Add a new LLM provider adapter" MINOR-bump example with a neutral example (e.g., "Add a new entity CRUD module") since the adapter layer is no longer an active feature surface.

### Out of Scope

- Removing `ENCRYPTION_KEY` from `cortex-backend/app/core/config.py` (code change; defer to CORTEXDIST-23 SQL cleanup or a future code-cleanup task).
- Deleting the orphaned `adapters/` directory or legacy backend modules (`sql_orchestrator.py`, `text_normalization.py`, `llm_provider_service.py`) — code changes out of scope.
- Rewriting `CHANGELOG.md` historical entries or `openspec/changes/archive/` content.
- Any frontend/backend functional code changes.
- Supabase SQL or table drops (CORTEXDIST-23).

## Capabilities

### New Capabilities

_None. This is a documentation-only change; no spec-level behavior changes._

### Modified Capabilities

_None. The active specs (`configuration-tabs`, `provider-credentials`, `provider-adapter`) were already synced by CORTEXDIST-21 and CORTEXDIST-22 archives to reflect removal. No further spec updates needed._

## Approach

For each doc, classify every hit as `stale-must-fix`, `already-correct`, or `archived-history` (leave). Apply surgical edits — remove stale lines, adjust surrounding context so the doc still reads naturally. Do not rewrite entire sections. Follow each document's existing language (all four target docs are in English).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `README.md` | Modified | Remove 5 stale provider/encryption references; add n8n-ownership clarification |
| `docs/CORTEX.md` | Modified | Remove 7 stale references; update architecture table and scope sections |
| `docs/DEPLOYMENT.md` | Modified | Remove `ENCRYPTION_KEY` row from env-var table |
| `docs/VERSIONING.md` | Modified | Replace LLM-adapter example with neutral MINOR-bump example |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Removing `ENCRYPTION_KEY` from docs confuses deployers who still have it in `.env` | Low | Note in commit message that the env var is harmless but unused; code field remains (out of scope) |
| Over-editing README breaks flow or removes useful context | Low | Surgical line-level edits only; preserve surrounding structure |
| `adapters/` directory still exists in code, creating doc/code mismatch | Med | Note in proposal that directory cleanup is deferred; docs simply stop advertising it as an active feature |

## Rollback Plan

Revert the single PR. All changes are doc-only; no runtime behavior is affected.

## Dependencies

- CORTEXDIST-21 (frontend removal, merged PR #39) — done
- CORTEXDIST-22 (backend removal, merged PR #41) — done
- CORTEXDIST-23 (SQL cleanup) — runs after this change

## Success Criteria

- [ ] No active doc presents provider credentials as current functionality
- [ ] README and CORTEX.md clearly state n8n owns models/providers/credentials
- [ ] `ENCRYPTION_KEY` removed from DEPLOYMENT.md env-var table and README env-var list
- [ ] Active specs (`configuration-tabs`, `provider-credentials`) remain unchanged (already correct)
- [ ] Archived history (`CHANGELOG.md`, `openspec/changes/archive/`) untouched
