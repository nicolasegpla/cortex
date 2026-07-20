# Tasks: Align Docs with n8n Ownership of Models and Credentials

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~40-60 (17 surgical edits, mostly deletions) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Delivery strategy | single-pr-default |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

Runtime harness: N/A (docs-only). Likely PR: PR 1.

## Orchestrator rulings (binding)

- Q1: README R1-R8 APPROVED. Q2: VERSIONING.md under umbrella requirement ACCEPTED.
- Q3: `adapters/` line kept with neutral legacy comment APPROVED.
- design.md cosmetic findings (typo, checkboxes): NOT in implementation tasks.

## Phase 1: README.md

Traces: "README presents only active features" + "Ownership boundary discoverable".

- [x] 1.1 R1: delete line 18 (provider-credentials feature bullet)
- [x] 1.2 R2: delete line 32 (provider credential router bullet)
- [x] 1.3 R3: delete line 33 (LLM adapter registry bullet)
- [x] 1.4 R4: delete line 50 (LLM providers architecture row)
- [x] 1.5 R5: delete line 52 (Encryption architecture row)
- [x] 1.6 R6: reword line 63 `adapters/` annotation → `# legacy adapter code (pending removal)`
- [x] 1.7 R7: insert n8n-ownership one-liner (design §Interfaces) as new paragraph after line 3
- [x] 1.8 R8: delete line 172 (`ENCRYPTION_KEY` env-var entry)
- [x] 1.10 [Orchestrator-ruled scope addition] Remove stale `/chat/stream` rollback mentions: chat-interface bullet (line 19), chat-pipeline bullet (line 32), "Chat route" architecture table row (line 48)
- [x] 1.9 Render check: no orphaned bullets or dangling intros

## Phase 2: docs/CORTEX.md

Traces: "CORTEX.md architecture matches reality" + "Ownership boundary discoverable".

- [x] 2.1 C1: delete line 27 (LLM providers table row)
- [x] 2.2 C2: delete line 28 (Encryption table row)
- [x] 2.3 C3: delete line 48 (encrypted-storage bullet)
- [x] 2.4 C4: delete line 49 (adapter-registry bullet)
- [x] 2.5 C5: delete line 82 (backend encryption responsibility bullet)
- [x] 2.6 C6: reword line 102 to `- User management page for super_admin.`
- [x] 2.7 C7: reword line 117 `adapters/` annotation → `# legacy adapter code (pending removal)`
- [x] 2.8 C8: append n8n-ownership sentence (design §Interfaces) to "What CORTEX is today"
- [x] 2.10 [Orchestrator-ruled scope addition] Remove stale `/chat/stream` rollback mentions: "Chat pipeline" table row (line 26), scope bullet (line 45), backend-owns bullet (line 77); reword "Chat database access" intro (line 82) so `/chat/n8n` is the only active route and guardrail bullets frame the retained-but-unrouted SQL code
- [x] 2.9 Render check: architecture table coherent

## Phase 3: docs/DEPLOYMENT.md

Traces: "DEPLOYMENT.md env table excludes dead config".

- [x] 3.1 D1: delete line 39 (`ENCRYPTION_KEY` row from backend env-var table)
- [x] 3.2 Render check: env-var table still aligns

## Phase 4: docs/VERSIONING.md

Traces: umbrella requirement (Q2 — no dedicated scenario).

- [x] 4.1 V1: replace "Add a new LLM provider adapter" with "Add a new entity CRUD module" at line 35 MINOR row
- [x] 4.2 Render check: table column still aligns; example natural

## Phase 5: Verification gate

Traces: design §Testing Strategy. Verification = grep + render pass.

- [x] 5.1 `rg -n "ENCRYPTION_KEY|LLM adapter|adapter registry|provider credentials|Fernet|LLM providers" README.md docs/CORTEX.md docs/DEPLOYMENT.md docs/VERSIONING.md` → 0 TRUE hits — RESOLVED per orchestrator ruling 1: verification is negation-aware (ignores "no active", "no longer", "removed", "legacy ... pending removal"). The CORTEX.md:14 C8 sentence is a spec-correct negation, not a stale reference. Refined check (raw hits piped through `rg -v` negation filter) returns zero TRUE hits.
- [x] 5.2 `rg -n "n8n owns" README.md docs/CORTEX.md` → 2 hits
- [x] 5.3 `rg -n "legacy adapter code" README.md docs/CORTEX.md` → 2 hits
- [x] 5.4 `git diff --name-only` lists exactly 4 markdown files
- [x] 5.5 Natural-read pass of each edited section