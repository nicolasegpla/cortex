# OpenSpec — cortex

Artifact store for structured, persistent SDD artifacts.

## Phase routing

| Phase | Artifact | Location |
|---|---|---|
| `sdd-propose` | proposal | `changes/{change}/proposal.md` |
| `sdd-spec` | spec | `changes/{change}/spec.md` |
| `sdd-design` | design | `changes/{change}/design.md` |
| `sdd-tasks` | tasks | `changes/{change}/tasks.md` |
| `sdd-apply` | apply-progress | `changes/{change}/apply-progress.md` |
| `sdd-verify` | verify-report | `changes/{change}/verify-report.md` |
| `sdd-archive` | archive-report | `changes/{change}/archive-report.md` |

## Version

- Format: 1.0
- Generator: sdd-init skill
