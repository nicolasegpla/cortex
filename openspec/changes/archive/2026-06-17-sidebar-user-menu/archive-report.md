# Archive Report: sidebar-user-menu

**Change**: sidebar-user-menu
**Archived**: 2026-06-17
**Artifact Store**: both (Engram + OpenSpec)
**Status**: complete

---

## Executive Summary

Sidebar user menu feature fully implemented, tested, and verified. All 7 SDD tasks completed with 100% test coverage on the new component. Implementation deviates from design in two documented ways (CSS cascade → conditional render; CSS-only ellipsis → inline style) for jsdom testability, both justified. No critical or warning issues in verification. Main spec promoted to `openspec/specs/sidebar-user-menu/spec.md`.

---

## Artifact Observation IDs (Engram)

| Artifact | Observation ID | Topic Key |
|----------|---------------|-----------|
| Proposal | #3275 | `sdd/sidebar-user-menu/proposal` |
| Spec | #3276 | `sdd/sidebar-user-menu/spec` |
| Design | #3277 | `sdd/sidebar-user-menu/design` |
| Tasks | #3278 | `sdd/sidebar-user-menu/tasks` |
| Apply Progress | #3280 | `sdd/sidebar-user-menu/apply-progress` |
| Verify Report | (in OpenSpec archive) | `openspec/changes/archive/2026-06-17-sidebar-user-menu/verify-report.md` |

---

## SDD Phase Summary

### Proposal (ID: 3275)
Intent: provide persistent user identity + logout in sidebar footer. Scope included SidebarFooter component, logout action, collapsed-mode support, and test coverage. Known limitation documented: Supabase server-side session invalidation deferred.

### Spec (ID: 3276)
Three requirements: (1) authenticated user summary in footer, (2) logout action clears auth + navigates to `/login`, (3) collapsed sidebar preserves icon-only logout. Six scenarios total with Given/When/Then format.

### Design (ID: 3277)
SidebarFooter co-located under `molecules/Sidebar/`, self-contained (reads stores directly, no props). Logout uses `useNavigate()`. CSS in `AppShell.scss`. TDD-gated. Two open questions: (1) server-side Supabase signOut follow-up, (2) i18n for aria-label.

### Tasks (ID: 3278)
7 tasks across 4 phases. All checked. Review budget: ~150–200 lines, Low risk, single PR.

### Apply (ID: 3280)
7/7 tasks complete. RED-GREEN-REFACTOR cycle documented per task. 281/281 tests passing. 100% coverage on SidebarFooter.tsx. Build clean. Two deviations:
1. **Collapsed hiding**: conditional render `{!collapsed && ...}` instead of CSS cascade — Vitest/jsdom cannot inspect external SCSS
2. **Long-email truncation**: inline `style={{ textOverflow: 'ellipsis' }}` instead of CSS class only — jsdom assertion requirement

### Verify (OpenSpec: verify-report.md)
- **Build**: `tsc --noEmit` clean ✅
- **Tests**: 281 passed / 0 failed / 0 skipped ✅
- **Coverage**: 100% Stmts/Branches/Functions/Lines on SidebarFooter.tsx ✅
- **Spec compliance**: 6/6 scenarios compliant ✅
- **TDD compliance**: 6/6 checks passed ✅
- **CRITICAL issues**: None ✅
- **WARNING issues**: None ✅
- **SUGGESTION issues**: 2 (non-blocking)
  1. `aria-label="Cerrar sesión"` hardcoded Spanish — should externalize to i18n key when project adopts i18n
  2. Inline ellipsis style duplicates CSS class styling — consolidate when jsdom can inspect CSS modules

---

## Spec Merge (OpenSpec)

| Domain | Action | Details |
|--------|--------|---------|
| `sidebar-user-menu` | Created | No main spec existed; delta spec copied as new main spec |

**Destination**: `openspec/specs/sidebar-user-menu/spec.md`

---

## Archive Contents

```
openspec/changes/archive/2026-06-17-sidebar-user-menu/
├── proposal.md          ✅
├── specs/
│   └── sidebar-user-menu/
│       └── spec.md      ✅
├── design.md            ✅
├── tasks.md             ✅ (7/7 tasks complete)
├── apply-progress.md    ✅
├── verify-report.md     ✅ (PASS — no critical issues)
└── exploration.md       ✅
```

---

## Deviations from Design

| Deviation | Design Intent | Actual | Justification |
|-----------|--------------|--------|---------------|
| Collapsed identity hiding | CSS cascade via `.sidebar--collapsed` | React conditional render `{!collapsed && ...}` | Vitest/jsdom does not apply external SCSS as computed styles; conditional render is testable and produces same visual result |
| Long-email truncation | CSS class only | Inline `style={{ textOverflow: 'ellipsis' }}` + CSS class | jsdom cannot assert CSS class presence for computed overflow; inline style is verifiable |

Both deviations documented in apply-progress and verified as acceptable in verify-report.

---

## Follow-Up Recommendations

1. **Server-side logout**: Add `supabaseClient.auth.signOut()` call on logout to invalidate the Supabase session server-side. Currently only Zustand state is cleared. Low effort, high security improvement.
2. **i18n externalization**: Move `aria-label="Cerrar sesión"` to a translation key when the project adopts i18n.
3. **CSS module consolidation**: Once the project supports CSS module inspection in tests, remove inline ellipsis styles and rely purely on `.sidebar__footer-email` CSS class.

---

## SDD Cycle Complete

The change has been fully planned (proposal), specified (spec), designed (design), tasked (tasks), implemented (apply), verified (verify), and archived.

**Status**: PASS
**Next**: none — SDD cycle complete