# Archive Report: reorganizar-vista-chat-selector-modelos

**Change**: reorganizar-vista-chat-selector-modelos
**Archived**: 2026-06-18 (initial)
**Re-archived**: 2026-06-18 (after left-position + viewport-clamping adjustment)
**Artifact Store**: both (Engram + OpenSpec)
**Verdict**: PASS

---

## Executive Summary

The inline model selector change has been fully implemented, tested, and verified across two adjustment cycles. A new `ModelSelector` molecule was created with a badge + popover in the chat input bar; the provider is derived from the selected model via `MODEL_PROVIDER_MAP`; `setActiveProvider` was removed from the store's public API.

**Cycle 1** (initial archive): Popover opens upward by default with downward fallback. 14 tasks, 403 tests, verdict PASS WITH WARNINGS.

**Cycle 2** (this re-archive): After user feedback, ModelSelector was repositioned to the LEFT of the send button, and horizontal viewport clamping was added (8px padding on both sides, max-width capped at viewport minus padding). 12 tasks, 405 tests, verdict PASS. All 12 spec scenarios compliant. No CRITICAL issues.

---

## Task Completion Gate

- Tasks artifact: Engram observation #3404 / `openspec/changes/archive/2026-06-18-reorganizar-vista-chat-selector-modelos/tasks.md`
- Total tasks: 12 | Completed: 12 | Incomplete: 0
- **Gate status**: PASS — all implementation tasks checked `[x]`

> **Note**: Task count changed from 14 → 12 after position adjustment. Tasks 1.3 (MODEL_PROVIDER_MAP) and 3.1 (store modifications) were consolidated; task numbering reflects final implementation state.

---

## Verification Summary (Final State)

| Metric | Value |
|--------|-------|
| Build | ✅ PASS (`tsc -b && vite build`, 436 modules, 2.90s) |
| Tests | ✅ 405/405 passed / 0 failed / 0 skipped |
| Spec compliance | 12/12 scenarios compliant |
| CRITICAL issues | None |
| Warnings | 1 (keyboard-open index restoration not fully exercised — low risk) |

### Adjustment History

| Adjustment | Description | Verified |
|------------|-------------|----------|
| Popover opens upward by default | `useLayoutEffect` prefers `bottom` anchor, falls back to `top` | ✅ |
| ModelSelector left of send button | DOM order test: `selectorIndex < sendIndex` | ✅ |
| Viewport clamping (horizontal) | 8px padding both sides, max-width = viewport - 16px | ✅ |
| Viewport clamping (vertical) | Upward preferred, downward fallback | ✅ |

---

## Spec Sync to Main Specs

| Domain | Action | Details |
|--------|--------|---------|
| `model-selector-inline` | **Created** | Full spec at `openspec/specs/model-selector-inline/spec.md` — Inline Model Selector Badge, Model Selection Popover, Validated-Provider Gating, Keyboard Accessibility, Responsive Layout (with viewport-clamped narrow-viewport scenario), Persisted Selection |
| `chat-session` | **Updated** | `Backend-Mediated Multi-Provider Chat` updated (provider derived from model); `Active Model as Single Source of Truth` added (2 scenarios) |

---

## Engram Observation IDs (Traceability)

| Artifact | Engram ID | Topic Key |
|----------|-----------|-----------|
| Proposal | #3400 | `sdd/reorganizar-vista-chat-selector-modelos/proposal` |
| Spec | #3401 | `sdd/reorganizar-vista-chat-selector-modelos/spec` |
| Design | #3403 | `sdd/reorganizar-vista-chat-selector-modelos/design` |
| Tasks | #3404 | `sdd/reorganizar-vista-chat-selector-modelos/tasks` |
| Apply Progress | #3405 | `sdd/reorganizar-vista-chat-selector-modelos/apply-progress` |
| Verify Report | #3406 | `sdd/reorganizar-vista-chat-selector-modelos/verify-report` |
| Archive Report | (this) | `sdd/reorganizar-vista-chat-selector-modelos/archive-report` |

---

## Archive Contents

```
openspec/changes/archive/2026-06-18-reorganizar-vista-chat-selector-modelos/
├── state.yaml          ✅ (status: archived, verdict: PASS)
├── proposal.md         ✅
├── spec.md             ✅
├── specs/              ✅ (domain deltas)
├── design.md           ✅
├── tasks.md            ✅ (12/12 tasks complete)
├── apply-progress.md   ✅
├── verify-report.md    ✅ (final: 405 tests, PASS, position + clamping verified)
└── explore.md          ✅
```

---

## Source of Truth Updated

- `openspec/specs/model-selector-inline/spec.md` — new spec created
- `openspec/specs/chat-session/spec.md` — updated with provider-derivation + active-model as source of truth

---

## Work Unit Commits

- `fe7c6bc` — feat(chat): add model-provider map and ChevronDown icon atom
- `9e82f75` — feat(chat): add inline ModelSelector molecule with popover and keyboard nav
- `5bda2ab` — feat(chat): wire inline ModelSelector into ChatPage and derive provider from model

---

## Warnings

1. **Keyboard-open index restoration** (ModelSelector.tsx L170-175): The `keyboardOpenIndex` ref flow for arrow-key opening is not fully exercised by tests. Low risk — the highlighted-index restoration after keyboard-open is a cosmetic/detail behavior.

## Suggestions

1. Add test for the upward popover vertical positioning path (`fitsAbove` case).
2. Add Playwright E2E viewport tests for cross-device layout QA.
3. Consider addressing Vite chunk size warning (748KB).

---

## SDD Cycle Complete

Change `reorganizar-vista-chat-selector-modelos` has been fully planned (proposal → spec → design), implemented (tasks → apply), verified (verify-report: PASS), and archived. All specs synced to main. Two adjustment cycles were completed: (1) upward popover default, (2) left-of-send-button positioning with horizontal viewport clamping. Audit trail preserved in `openspec/changes/archive/2026-06-18-reorganizar-vista-chat-selector-modelos/` and Engram observations #3400–#3406.
