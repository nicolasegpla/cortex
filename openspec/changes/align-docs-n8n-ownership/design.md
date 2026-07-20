# Design: Align Docs with n8n Ownership of Models and Credentials

## Technical Approach

Doc-only change with surgical line-level edits across `README.md`, `docs/CORTEX.md`, `docs/DEPLOYMENT.md`, `docs/VERSIONING.md`. No code touched. Each edit removes a stale provider / adapter / encryption reference; two additions make the n8n ownership boundary discoverable. The spec scenario "README presents only active features" requires LLM **adapter routing** to be absent from feature lists, so the README cleanup expands slightly beyond the proposal's prose "5 references" (which omitted the LLM-adapter-registry bullet on line 33 and the repo-map `adapters/` annotation on line 63). The spec is authoritatively authoritative; the proposal's "5" is treated as an undercount.

## Architecture Decisions

| Decision | Choice | Rejected alternative | Rationale |
|---|---|---|---|
| Repo-map `adapters/` line (both docs) | Keep the line, strip the misleading comment → `# legacy adapter code (pending removal)` | Delete entire line; keep "LLM provider adapters" comment | Directory still exists in code (deletion deferred out of scope). Deleting the line misrepresents repo state; keeping the old comment advertises a removed feature. Neutral legacy wording is honest and spec-compliant. |
| README n8n-ownership statement placement | New short paragraph after the intro (before "Quick start") | Inline inside "What works in v0.4.0" | Surface the boundary at the very top so readers see it before any feature list; matches the "scan for how LLM features work" scenario. |
| CORTEX.md ownership statement placement | Append sentence to "What CORTEX is today" | Add a new section | Spec scenario accepts "What CORTEX is today" OR "Technical shape"; appending avoids adding sections (proposal forbids restructuring). |
| VERSIONING.md neutral MINOR example | "Add a new entity CRUD module" | "Add a new chat route"; keep LLM-adapter example | Entity CRUD is the active, current v0.4.0 module pattern; a chat-route example would collide with the n8n-boundary story. |
| README edit scope | Remove 7 stale hits + add 1 ownership line | Proposal's strict "5 references" | Spec requirement "adapter routing absent from the feature list" mandates removing the adapter-registry bullet and neutralizing the `adapters/` annotation. |
| CORTEX.md frontend reference (line 102) | Reword to `- User management page for super_admin.` | Delete the whole bullet | User management is still an active frontend page; only the provider-credentials part is gone. |

## Data Flow

N/A — documentation change. No runtime data movement affected.

## File Changes

| File | Action | Edit (line, surgical) | Spec scenario |
|---|---|---|---|
| `README.md` | Modify | R1 delete line 18 (provider-credentials feature bullet) | README presents only active features |
| `README.md` | Modify | R2 delete line 32 (provider credential router bullet) | README presents only active features |
| `README.md` | Modify | R3 delete line 33 (LLM adapter registry bullet) | README presents only active features — adapter routing absent |
| `README.md` | Modify | R4 delete line 50 (LLM providers architecture row) | README presents only active features |
| `README.md` | Modify | R5 delete line 52 (Encryption architecture row) | README presents only active features |
| `README.md` | Modify | R6 reword line 63 `adapters/` annotation → `# legacy adapter code (pending removal)` | Docs reflect current feature surface |
| `README.md` | Insert | R7 n8n-ownership one-liner after intro paragraph (line 3) | Ownership boundary discoverable in README |
| `README.md` | Modify | R8 delete line 172 (`ENCRYPTION_KEY` env-var entry) | README presents only active features |
| `docs/CORTEX.md` | Modify | C1 delete line 27 (LLM providers table row) | CORTEX.md architecture section matches reality |
| `docs/CORTEX.md` | Modify | C2 delete line 28 (Encryption table row) | CORTEX.md architecture section matches reality |
| `docs/CORTEX.md` | Modify | C3 delete line 48 (encrypted-storage bullet) | Docs reflect current feature surface |
| `docs/CORTEX.md` | Modify | C4 delete line 49 (adapter-registry bullet) | Docs reflect current feature surface |
| `docs/CORTEX.md` | Modify | C5 delete line 82 (backend encryption responsibility bullet) | Docs reflect current feature surface |
| `docs/CORTEX.md` | Modify | C6 reword line 102 → `- User management page for super_admin.` | Ownership boundary: provider-credentials dropped from frontend ownership list |
| `docs/CORTEX.md` | Modify | C7 reword line 117 `adapters/` annotation → `# legacy adapter code (pending removal)` | Docs reflect current feature surface |
| `docs/CORTEX.md` | Modify | C8 append n8n-ownership sentence to line 14 ("What CORTEX is today") | Ownership boundary discoverable in CORTEX.md |
| `docs/DEPLOYMENT.md` | Modify | D1 delete line 39 (`ENCRYPTION_KEY` row from backend env-var table) | DEPLOYMENT.md env table excludes dead config |
| `docs/VERSIONING.md` | Modify | V1 replace "Add a new LLM provider adapter" with "Add a new entity CRUD module" at line 35 MINOR-bump row | Docs reflect current feature surface (umbrella — VERSIONING.md has no dedicated scenario in the delta spec; the proposal places it here) |

## Interfaces / Contracts

**R7 — README n8n-ownership one-liner (insert as new paragraph after line 3):**

```
n8n owns agents, models, providers, and credentials; Cortex proxies chat only through the authenticated `/chat/n8n` route and stores no provider API keys.
```

**C8 — CORTEX.md "What CORTEX is today" appended sentence (extend line 14 paragraph):**

```
n8n owns agents, models, providers, and credentials; Cortex has no active LLM adapter or credential storage, and chat flows exclusively through the `/chat/n8n` proxy.
```

**V1 — VERSIONING.md MINOR-bump row replacement (line 35):**

```
| `MINOR` | New backward-compatible feature or significant UX improvement. | Add a new entity CRUD module; add role-based UI sections; add batch import for producers. |
```

**C6 — CORTEX.md frontend ownership bullet replacement (line 102):**

```
- User management page for super_admin.
```

**R6 / C7 — `adapters/` repo-map annotation replacement (README line 63 and CORTEX.md line 117):**

```
adapters/          # legacy adapter code (pending removal)
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Manual grep — stale strings | No stale references remain in active docs | `rg -n "ENCRYPTION_KEY\|LLM adapter\|adapter registry\|provider credentials\|Fernet\|LLM providers" README.md docs/CORTEX.md docs/DEPLOYMENT.md docs/VERSIONING.md` returns zero hits after edits (the `adapters/` annotations now read "legacy adapter code (pending removal)" and are accepted). |
| Manual grep — ownership statement | Boundary is discoverable | `rg -n "n8n owns" README.md docs/CORTEX.md` returns one hit per file. |
| Render check | Docs still read naturally | Visual scan of edited sections; no broken markdown tables, no orphaned bullets, no dangling list intros. |
| Build / CI | Doc-only change | No build, no test, no runtime impact. Diff stays doc-only: `git diff --name-only` lists only the 4 markdown files. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Rollback = revert the single doc-only PR.

## Open Questions

- [ ] Proposal undercounted README stale hits as "5"; design removes 7 (adds adapter-registry bullet R3 and `adapters/` annotation neutralization R6) to satisfy the spec scenario "LLM adapter routing absent from the feature list". Confirm the two extra removals are wanted, or pin narrower scope.
- [ ] VERSIONING.md edit lives under the spec's umbrella requirement (no dedicated scenario). Confirm that is acceptable or whether a `VERSIONING.md`-specific scenario should be added to the delta spec.
- [ ] `adapters/` directory physically still exists in code (deletion deferred). Confirm "legacy adapter code (pending removal)" wording is preferred over a bare `adapters/` line with no comment.