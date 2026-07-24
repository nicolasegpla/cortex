# Tasks: interactive-help-support-entry

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~95 (tests: ~65, component: ~12, scss doc-comment: ~3, imports: ~5) |
| 800-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr-default |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Convert support footer into accessible `<button>`; add 5 RED tests + 4 existing regression | PR 1 | `pnpm test ConfigPage` | `pnpm test` (full cortex-frontend suite) | `git revert <commit>` — isolated to 3 files in `ConfigPage.*`, no API/data impact |

## Phase 1: RED — Failing Tests First (Strict TDD)

- [x] 1.1 In `cortex-frontend/src/presentation/pages/ConfigPage.test.tsx`, add test 1 — `screen.getByRole('button', { name: 'Abrir ayuda y soporte' })` resolves in super_admin render (RED — element is currently a `<div>`).
- [x] 1.2 Add test 2 — `container.querySelector('.config-page__nav-footer[aria-hidden="true"]')` → `expect(...).not.toBeInTheDocument()` (RED — footer currently carries `aria-hidden="true"`).
- [x] 1.3 Add test 3 — query button, assert `toHaveAttribute('aria-expanded', 'false')`; `await user.click(...)`; assert `toHaveAttribute('aria-expanded', 'true')` (RED — no `aria-expanded` attribute yet).
- [x] 1.4 Add test 4 — focus button, `await user.type(button, '{Enter}')` → `'true'`; re-render fresh tree, `await user.type(button, ' ')` → `'true'` (RED).
- [x] 1.5 Add test 5 — `container.querySelector('.config-page__nav-footer.config-page__nav-item')` exists; footer remains last child of `aside.config-page__nav` (RED until class swap lands).
- [x] 1.6 Run `pnpm --filter cortex-frontend test ConfigPage` — confirm tests 1-5 FAIL and the 4 existing `it(...)` blocks still pass.

## Phase 2: GREEN — Minimal Edit (3 files)

- [x] 2.1 `cortex-frontend/src/presentation/pages/ConfigPage.tsx`: add `const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);` adjacent to existing `isCreateUserModalOpen` state.
- [x] 2.2 Replace the footer `<div aria-hidden="true" ...>...</div>` (currently L81-84) with `<button type="button" className="config-page__nav-footer config-page__nav-item" aria-label="Abrir ayuda y soporte" aria-expanded={isFeedbackOpen} onClick={() => setIsFeedbackOpen(true)}>...</button>`; preserve inner `<span>` text "Ayuda y soporte".
- [x] 2.3 `cortex-frontend/src/presentation/pages/ConfigPage.scss`: above the `.config-page__nav-footer` block, add a doc-comment stating class composition with `config-page__nav-item` is intentional and that `--active`/`--placeholder` modifiers are forbidden on the footer (preserves `:hover` rule guarded by `:not(.config-page__nav-item--placeholder)`).
- [x] 2.4 Run `pnpm --filter cortex-frontend test ConfigPage` — confirm all 9 tests GREEN (5 new + 4 existing).

## Phase 3: Verification

- [x] 3.1 Run `pnpm --filter cortex-frontend test` — full cortex-frontend suite: zero unrelated failures (regression test 6 from design).
- [x] 3.2 Run `pnpm --filter cortex-frontend lint` (or `eslint src/presentation/pages/ConfigPage.tsx`) — no new warnings; `aria-expanded` + `onClick` consume the state so no `react-hooks/exhaustive-deps` disable should be needed.
- [x] 3.3 Run `pnpm --filter cortex-frontend typecheck` (or `tsc -b`) — confirm `isFeedbackOpen: boolean` typechecks with no implicit-any drift.
- [x] 3.4 `git diff --stat` — confirm total changed lines ≤ 120 across the 3 files (well under the 800-line review budget).

## Remediation (post verify FAIL — 2026-07-23)

- [x] R.1 Reproduced historical RED honestly: stashed only `ConfigPage.tsx` (tests stayed modified), ran `pnpm --filter cortex-frontend test ConfigPage` → 5 new tests FAILED / 4 pre-existing passed (exit 1, output: `/tmp/opencode/interactive-help-red-run.txt`), restored via `git stash pop`, re-ran → 9/9 GREEN (output: `/tmp/opencode/interactive-help-green-run.txt`). Pre-change safety-net baseline = the 4 pre-existing tests passing in the RED run.
- [x] R.2 Added Tab-traversal test (`reaches the support entry via Tab traversal and activates it with Enter`): `userEvent.setup()` + capped `user.tab()` loop → `expect(button).toHaveFocus()` → `user.keyboard('{Enter}')` → `aria-expanded` flips to `"true"`. Focused suite: 10/10.
- [x] R.3 Added runtime focusability proof (`expect(...).toHaveFocus()` after `.focus()` in the Enter/Space test). Visual pseudo-state styles (hover, `:focus-visible` outline, preserved `border-top`) verified by static SCSS inspection only — jsdom cannot compute pseudo-state styles and no browser/E2E harness exists in this project. Accepted limitation, documented in apply-progress.