# Design: Import Current-State from Real Tooling (P3)

> **Status: design only.** This PR contains no runtime code. Live Jira/GitHub/CI
> integration needs external systems and credentials that are not reachable in
> the build sandbox, so it cannot ship as working, tested code here. This document
> specifies the adapter interface and a file-based importer so the live adapters
> can be added later behind a stable contract.

## Intent

Today every VSM is hand-entered, so the durations, queue sizes, and WIP are
**guesses** — and guessed maps hide the real waste. The strongest "find the
problem" upgrade is to derive the current state from **actual timestamps** in the
tools teams already use (Jira/GitHub issues + PRs, CI pipelines). Importing real
data turns the map from a drawing into a measurement, and it makes the existing
diagnostics (CD readiness scorecard, wait-time waterfall, DORA reconciliation)
trustworthy.

This feature imports a **current-state value stream** from real tooling: it maps
recorded state-transition timestamps onto VSM steps, deriving process time, lead
time, queue size, and WIP from the data rather than from estimates.

## Architecture

### Pluggable import adapter (the stable contract)

```js
/**
 * @typedef {Object} WorkItemEvent
 * @property {string} workItemId   - Stable id of the issue/PR/build
 * @property {string} stage        - The workflow stage entered (maps to a VSM step)
 * @property {string} enteredAt    - ISO timestamp the item entered the stage
 * @property {string} [exitedAt]   - ISO timestamp the item left the stage
 * @property {boolean} [reentry]   - True when the item returned to an earlier stage (rework)
 */

/**
 * @typedef {Object} ImportAdapter
 * @property {string} id                                  - e.g. 'jira', 'github', 'ci', 'csv'
 * @property {string} label
 * @property {(raw: unknown) => WorkItemEvent[]} parse    - Normalize source data to events
 */
```

Every source (live or file) is just an adapter that produces a flat list of
**`WorkItemEvent`s**. The mapping from events → a VSM is source-agnostic, so the
hard/diagnostic logic is written and tested once.

### Source data → VSM derivation (pure, testable)

`deriveVsmFromEvents(events, { stageOrder })` → `{ steps, connections }`:

| VSM field | Derived from events |
|---|---|
| step `name` / order | distinct `stage` values, ordered by `stageOrder` (or first-seen) |
| step `processTime` | median active time in stage (`exitedAt − enteredAt`) where the item was being worked |
| step `leadTime` | median total time in stage including waiting (entry of stage → entry of next stage) |
| step `queueSize` | mean count of items concurrently waiting to enter the stage (Little's-Law-consistent) |
| step `percentCompleteAccurate` | `100 × (1 − reentryRate)` for the stage |
| `connection` forward | consecutive stages in `stageOrder` |
| `connection` rework | stage pairs where `reentry` events flow backward, `reworkRate` = share of items |

Medians (not means) resist the long-tail outliers typical of delivery data.
This module is **pure** and fully unit-testable with synthetic event fixtures —
no network required — which is the whole point of the adapter boundary.

### Concrete adapters

1. **`csvImportAdapter` / `jsonImportAdapter` (ships first, fully testable).**
   Accepts an exported event log (one row per work-item state transition:
   `workItemId, stage, enteredAt, exitedAt`). This is the working stand-in:
   teams can export from any tool and import a real current state today, with
   zero credentials. It exercises the entire derivation pipeline.
2. **`jiraImportAdapter` (later, needs API token + network).** Pulls issue
   changelogs; maps status transitions → `WorkItemEvent`s.
3. **`githubImportAdapter` (later).** Issues + PR review/merge timeline events.
4. **`ciImportAdapter` (later).** Pipeline run timestamps per stage.

The live adapters are **thin**: fetch + shape into `WorkItemEvent[]`. They add no
new derivation logic, so they need only integration tests against recorded
fixtures, and the diagnostic value lands with the file adapter first.

### Integration points

- New `src/utils/import/deriveVsm.js` (pure) + `src/utils/import/adapters/*`.
- `vsmIOStore` gains `importCurrentState(adapterId, rawData)` → builds a map via
  the adapter + `deriveVsmFromEvents`, then `loadMap(...)` (reusing the existing
  load/persist path — no new persistence surface).
- An "Import current state" entry in the IO UI, with a file picker for the
  CSV/JSON adapter and (later) connection settings for the live adapters.
- Imported maps set a provenance flag (`source: 'imported'`, `importedAt`) so the
  UI can distinguish measured maps from hand-drawn ones.

## Acceptance Criteria

1. `deriveVsmFromEvents` builds an ordered set of steps from a synthetic event log
   and derives processTime/leadTime/queueSize per step (median-based).
2. Reentry events produce a rework connection with a `reworkRate` equal to the
   share of items that returned, and reduce the stage's `%C&A`.
3. The CSV/JSON adapter round-trips a sample export into a VSM that loads via
   `loadMap` and is indistinguishable (shape-wise) from a hand-built map.
4. Importing replaces the working map through the existing `loadMap` path and is
   undoable / re-exportable like any map.
5. Live adapters (Jira/GitHub/CI) conform to `ImportAdapter` and are covered by
   fixture-based integration tests (no live calls in CI).
6. Malformed/partial source rows are skipped with a surfaced warning rather than
   corrupting the map.

## Why design-only here

The pure `deriveVsmFromEvents` engine and the CSV/JSON adapter **could** be built
and tested in this sandbox today and would deliver real value (criteria 1–4, 6).
They are split out only to keep this PR a reviewable contract; the live
network adapters (criterion 5) are the part that genuinely cannot be exercised
without external systems. Recommended next step: implement `deriveVsmFromEvents`
+ the file adapter as a normal feature PR, then add live adapters behind this
interface when credentials/network are available.

## Migration / sequencing

1. **PR-A (feasible now):** pure `deriveVsmFromEvents` + `csv`/`json` adapters +
   `importCurrentState` wiring + UI file picker. Full unit/acceptance coverage.
2. **PR-B:** Jira adapter (token-gated, fixture tests).
3. **PR-C:** GitHub adapter.
4. **PR-D:** CI adapter.

Each later PR is additive and changes no derivation logic.
