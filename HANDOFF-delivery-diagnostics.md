# Handoff: Delivery-Diagnostics Suite + Mobile UX

> **Purpose:** a durable handoff so a fresh Claude Code session can resume with full
> context. Read top-to-bottom, then continue from **"Open PRs / next steps."**
> Companion to the earlier `HANDOFF-vsm-review.md` (the original feature-review that
> kicked all of this off). Last updated **2026-06-10**.

## TL;DR

The Total Perspective Vortex has grown from a generic value-stream *modeler* into a value-stream
*diagnoser*. The entire **CD Readiness Diagnosis roadmap** (P1a–P3 from
`HANDOFF-vsm-review.md`) is now shipped to `master`, plus a current-state **importer**,
an optional **Azure DevOps** source, and a **mobile/tablet UX** overhaul. Three PRs are
still open (see below).

## What shipped to `master` (merged)

| Feature | Roadmap | PR | Key files |
|---|---|---|---|
| CD Readiness Scorecard (13 items: 9 practices + 4 signals) | P1b | #3 | `src/utils/calculations/cdReadiness.js`, `src/data/minimumCdPractices.js`, `src/components/metrics/CdReadinessScorecard.svelte` |
| Wait-time waterfall | P1a | #12 | `src/utils/calculations/waitTime.js`, `WaitTimeWaterfall.svelte` |
| DORA reconciliation | P1c | #12 | `src/utils/calculations/doraReconciliation.js`, `DoraPanel.svelte` |
| Kaizen-burst annotations | P1 | #12 | `src/utils/annotations.js`, `src/data/wasteTypes.js`, `AnnotationsPanel.svelte` |
| Constraint → countermeasure recommendations | P2 | #12 | `src/utils/calculations/recommendations.js`, `RecommendationsPanel.svelte` |
| WIP & batch levers (Little's Law) | P2 | #12 | `src/utils/calculations/littlesLaw.js`, `WipLeversPanel.svelte` |
| Monte-Carlo lead time | P3 | #12 | `src/utils/simulation/monteCarlo.js`, `MonteCarloPanel.svelte` |
| Current-state vs future-state | P3 | #12 | `src/utils/calculations/futureState.js`, `FutureStatePanel.svelte` |
| Current-state importer (event log → VSM) | P3 | #13 | `src/utils/import/deriveVsm.js`, `src/utils/import/eventAdapters.js`, `ImportEventLog.svelte` |

`master` is green: ~484 unit tests + acceptance, build, lint. The flagship P1b was built
through the full `dev-team` pipeline (`/specs` → `/plan` with 5 review personas → TDD
build → review). The follow-ons were each test-first feature PRs.

## Open PRs (as of 2026-06-10)

- **#14 — Optional Azure DevOps import source.** Pure `azureDevOpsUpdatesToEvents` mapper
  (fixture-tested) + thin injectable `fetchAzureDevOpsEvents` (WIQL → Work Item Updates
  API). Opt-in only; PAT never persisted. Reuses `deriveVsmFromEvents`. 11 tests. Needs
  network egress to `dev.azure.com` to run live (blocked in the build sandbox; tested via
  mock). Ready to merge.
- **#15 — Mobile/tablet UX.** Sidebar→drawer, editor→bottom sheet, scrollable panel
  column, diagram given a fixed viewport share, always-visible `CanvasTotalsBar`, pinch +
  min/max zoom. **Not screenshot-verified** (no browser in sandbox — see "Environment").
  e2e in `tests/e2e/responsive.spec.js`. Worth eyeballing on a device before merge.
- **#16 — Playwright SessionStart hook.** `.claude/install-playwright.sh` + settings entry
  so a web session auto-installs Chromium, enabling screenshot/e2e self-validation. Needs
  the network change below.

## Architecture you must know before extending

### 1. Per-map persisted state is threaded through FIVE sites
Several features add a new field to the map (`readinessOverrides`, `dora`, `annotations`,
`baseline`). Each new persisted field MUST be wired through all of these or it silently
drops on reload/import:
1. `src/stores/vsmDataStore.svelte.js` — `initialState`, a `$state`, a getter, `persist()`
   payload, and reset/restore in `createNewMap` / `loadMap` / `clearMap`.
2. `src/utils/validation/vsmValidator.js` — `sanitizeVSMData` (use `… : undefined` for the
   "absent" case so the existing exact-shape `toEqual` tests keep passing).
3. `src/infrastructure/VsmJsonRepository.js` — `serializeVsm` + `deserializeVsm` (file
   export/import round-trip).
4. `src/stores/vsmIOStore.svelte.js` — `exportToJson` payload.
5. `features/step-definitions/helpers/testStores.js` — the cucumber test double mirrors the
   real store; keep it in sync or acceptance tests drift.
This is the single biggest source of merge conflicts and bugs — see the integration notes.

### 2. The diagnosis engines are pure and reuse `metrics.js`
`cdReadiness`, `recommendations`, `waitTime`, `doraReconciliation`, `littlesLaw`,
`futureState` are all pure functions that consume `calculateMetrics` / step data — no
duplicated calculation. Recommendations consume `cdReadiness` output + `metrics.bottleneckIds`.
Keep new diagnostics this way (pure + reuse) and unit-test them directly.

### 3. The importer is adapter-based
`deriveVsmFromEvents(events, {stageOrder})` is the one engine. Every source (CSV/JSON file,
Azure DevOps, future Jira/GitHub/CI) is a thin adapter that normalizes to a flat
`WorkItemEvent[]` (`{workItemId, stage, enteredAt, exitedAt?}`) — NO new derivation logic in
adapters. Contract + roadmap: `docs/specs/real-tooling-import.md`.

### 4. Acceptance tests are store-level, not DOM-level
Cucumber step defs operate on the test-double stores in
`features/step-definitions/helpers/testStores.js` (plain JS, no Svelte runes). Presentation
logic that needs testing is extracted into pure helpers (e.g. `readinessScorecard.js`,
`canvasTotals.js`) and asserted there. Svelte components are verified by build + e2e.

### 5. Layout shell (after #15)
`src/App.svelte` is the responsive shell: header (with hamburger), drawer sidebar,
scrollable `<main>` containing the fixed-height canvas region (with `CanvasTotalsBar`
overlay) followed by the stacked diagnostic panels, and the editor as a bottom sheet / side
panel. All diagnostic panels are mounted here as collapsible `<details>`.

## Quality gate (run before every PR)
```
npm test            # vitest unit + integration
npm run test:acceptance   # cucumber (store-level)
npm run build       # vite
npm run lint        # eslint (no ES6 classes; functional style)
```
ESLint parser rejects `||=` / some newer syntax — avoid logical-assignment operators.
Coverage tooling (`@vitest/coverage-v8`) is NOT installed; don't rely on `--coverage`.

## Environment / sandbox constraints (important)
- **No browser** in the build sandbox: `npx playwright install` is blocked by the network
  policy and there's no system Chromium → I cannot screenshot-verify UI here. #16 + a
  network-allow of `cdn.playwright.dev` fixes this for future sessions.
- **`dev.azure.com` blocked** → the Azure DevOps live fetch can't be smoke-tested here
  (it's mock-tested). Allow it (env → Network access) to run live.
- **Branch deletion is blocked**: `git push --delete` returns HTTP 403 and the GitHub MCP
  has no delete-ref tool. Stale merged branches must be deleted from the GitHub Branches UI
  (or enable "Automatically delete head branches" in repo settings).
- **node_modules is ephemeral** — gets wiped between sessions; `npm install` as needed.
- Commits are authored `noreply@anthropic.com` but show **"Unverified"** (no GPG signing
  key available); not fixable from here.

## Open / next steps
1. **Merge the open PRs** (#14, #15, #16) once reviewed. For #15, glance at a real
   phone/tablet first; the diagram height fractions (`60vh` / `lg:70vh`) and which totals
   show in `CanvasTotalsBar` are easy one-line tweaks.
2. **Enable browser self-validation**: allow `cdn.playwright.dev` in the environment's
   Network access, merge #16, then a fresh session can run `npm run test:e2e` and capture
   screenshots (start with the #15 responsive layout).
3. **Live import adapters (PR-B/C/D)** — Jira, GitHub, CI — behind the same `WorkItemEvent`
   contract as Azure DevOps. Each is a thin fetch + mapper, fixture-tested, no derivation
   changes. See `docs/specs/real-tooling-import.md` § sequencing.
4. **Azure DevOps polish** (if #14 merges): a tuned default WIQL scoped to a board/area path
   + date window, and optionally the Analytics OData source for large boards.
5. **Delete stale branches** from the GitHub UI (the deletion limitation above).

## Key file map
```
src/utils/calculations/   cdReadiness, recommendations, waitTime, doraReconciliation,
                          littlesLaw, futureState, metrics   (pure diagnosis engines)
src/utils/simulation/     monteCarlo.js                       (seeded Monte-Carlo)
src/utils/import/         deriveVsm.js, eventAdapters.js, azureDevOpsAdapter.js(#14)
src/utils/ui/             readinessScorecard.js, canvasTotals.js(#15)
src/data/                 minimumCdPractices, wasteTypes, thresholds, stepTypes
src/components/metrics/   *Panel.svelte, CdReadinessScorecard, WaitTimeWaterfall, …
src/components/io/        ImportEventLog.svelte
src/components/canvas/    Canvas.svelte, CanvasTotalsBar.svelte(#15)
src/stores/               vsmDataStore (persist sites!), vsmIOStore, vsmUIStore
docs/specs/               cd-readiness-scorecard.md, real-tooling-import.md
plans/                    cd-readiness-scorecard.md   (the P1b plan)
features/                 *.feature + step-definitions/  (cucumber; test double in helpers/)
.claude/                  settings.json + install-*.sh SessionStart hooks
```
