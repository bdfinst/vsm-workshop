# Handoff: Guided Mapping and Time-Ladder UX

Resume `/dev-team:build ./plans/guided-mapping-ux.md`. Read this, then continue at **Next steps**.

## State (2026-10-02, updated)

- **Slice 7 built and reviewed; PR #21 open** (`feat/gm-7-steps`, includes review-fix and naming/structure/test commits). Merge it, then branch from `master` for Slice 8 (Time stage: 8.1 DurationInput, 8.2 Time stage).
- Post-PR review fixes (naming, structure, test smells) are pushed to the same branch; PR gate needs a fresh `/code-review` only for `gh pr create`.
- Steps rail status (`stepsReason` in `STAGE_REASONS`) deferred to Slice 10. Gates at last run: 1373 unit, 121 guided e2e, build and lint clean.

### Original state

- Local `master` == `origin/master` (`f22a26f`). PR #20 (`guided-mapping-v2`) is merged. Nothing unpushed.
- Plan: 18 slices in 13 waves. **Slices 1–6 built, reviewed, re-reviewed, fixes applied.** Slice 7 (Steps stage) is next. The plan's `## Build Progress` checkboxes are the resume record.
- Stack: Svelte 5, JS, factory functions (no classes), Vitest + Playwright. Prettier: single quotes, no semicolons.
- Gates: `npm test && npm run build && npm run lint`. At last run: 73 files / 1269 tests pass, lint clean, `build` and `build:standalone` succeed.

## Decisions in force

- Plan Gherkin is the source of truth, but tests assert behaviors, not incidental strings.
- A loaded file that overwrites the existing revision keeps the file's revision.
- `init()` must not overwrite edits being saved.
- Code-First Small Batches with inline review checkpoints. Agents: `software-engineer` for builds and fixes, `correctness-review` and `spec-compliance-review` for slice reviews.
- Visual baselines are regenerated only in the pinned Docker image: `npm run test:e2e:baseline`.
- Azure DevOps remotes use SSH, never HTTPS.
- `master` is protected: changes go through a PR with the `quality-gate` check.

## Architecture notes

- `valueStreamStore`: guarded edits with undo. `activeVersionId` is outside the undo snapshot.
- `workspaceStore`: single writer, serialized save queue, revision tracking, `unreadable` (with `readFailed`), `replaceWorkspace(workspace, { changes })`.
- `guidedLifecycle`: `start`, `startEmpty`, `startFromImport`, `retry`, `exitBlockedReason`. `GuidedRoot` shows a loading placeholder until `start()` resolves.
- Standalone build: `vite.standalone.config.js` → `dist-standalone/vsm-workshop.html`. Fixture in `tests/e2e/guided/standalone.fixture.js`. `pretest:acceptance` builds both.
- Legacy Cucumber features (`npm run test:bdd`) came from origin: 175 scenarios, 119 pass, 56 undefined (not checked against origin), 0 fail.

## Known open items

- 6 visual tests in `tests/e2e/visual.spec.js` (lines 14, 25, 43, 58, 78, 110) failed locally after the Norn rebrand and font change. Regenerate baselines in the Docker image and commit them. Check whether CI is green on `master` first.
- Focus is lost after a failed "Try again" on `UnreadableScreen` (not fixed).
- Slice 2 spike gaps: Safari restart, `beforeunload` and origin-sharing cells are "not run". Close before Slice 16.
- Repowise index is stale (indexed at `a728e4e`); `repowise update` refreshes it.
- Untracked runtime files in `.claude/` (`code-intelligence-turn-state.json*`, `init-state.json`) are deliberately not committed.

## Next steps

1. Confirm CI on `master` is green; if the visual job fails, regenerate baselines in the pinned image and PR them.
2. Branch from `master`; start **Slice 7** (Steps 7.1 step list/Intake lock/handoff/starter chips, 7.2 insert and reorder, 7.3 outside toggle/kind switch/delete with confirm and undo). Scenarios first, tests next, then code.
3. Run the slice review, fix findings, tick the plan checkboxes, open one PR per slice.
