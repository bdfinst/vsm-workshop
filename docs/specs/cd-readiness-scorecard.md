# Spec: CD Readiness Scorecard (P1b)

> Phase-0 deliverable for the dev-team pipeline. Produced via `/dev-team:specs` from
> `HANDOFF-vsm-review.md` (top-pick next action). Gherkin scenarios are authored later,
> per slice, in `/plan` — `features/visualization/cd-readiness-scorecard.feature` is a
> draft kept as supporting material only.

## Decision Record

- **Manual deploy = option B (approved):** add an `automated` boolean to the step model
  (default `true`, backward-compatible); the step editor sets it; it persists.
- **Scorecard scope = "9 + signals" (approved):** the scorecard scores the **9 MinimumCD core
  practices** *and* surfaces **4 VSM-derived readiness signals** as their own rows — **13 items
  total**, grouped into two sections. This matches the handoff's mapping table 1:1 (the most
  actionable problem-finder) at the cost of a richer panel.

## Intent Description

Today the Norn is a strong generic value-stream *modeler* but it does not *diagnose a
software-delivery process*. The CD Readiness Scorecard closes that gap. It is the first slice of
the "CD Readiness Diagnosis" capability and embodies the MinimumCD Phase-0 "Assess" idea that a
team should map its value stream **and** self-assess its practices **together** to find its
constraints (per beyond.minimumcd.org).

The scorecard scores **13 readiness items** for the currently open map — the **9 MinimumCD core
practices** plus **4 VSM-derived flow readiness signals** — and **pre-fills likely gaps
automatically from data the VSM already stores per step** so a facilitator is not handed a blank
checklist. Each auto-detected gap is **pinned to the offending step** with a plain-language
explanation of the threshold it violated, and the facilitator can **confirm** the inferred status,
**override** it, or **reset** back to the inferred value. Items with no inferable signal default to
a "needs review" status for manual assessment.

The framing is deliberately **iterative, not phase-gated**: findings point at specific
practices/constraints (the site states migration phases run simultaneously); the scorecard never
tells a team which single phase it is "in." This is the highest-leverage "find the problem"
feature for the least new data model, because the inference reuses metrics the app already
computes (flow efficiency, first-pass yield, bottleneck IDs, rework impact) plus per-step fields
(lead time, process time, %C&A, queue size, step type, and the new `automated` flag).

## Architecture Specification

**New components**

- `src/utils/calculations/cdReadiness.js` — pure inference engine (no Svelte, no side effects).
  Primary export `calculateCdReadiness(steps, connections, overrides)` → an array of **13** item
  results: `{ id, label, kind, status, signal, stepId, explanation, source }` where
  `kind ∈ {practice, signal}`, `status ∈ {met, gap, needs-review}`, and
  `source ∈ {inferred, confirmed, overridden}`. Inference reuses `calculateFlowEfficiency`,
  `identifyBottlenecks`, and rework data from `metrics.js` rather than recomputing them.
- `src/data/minimumCdPractices.js` — canonical reference data: the 9 core practices and the 4
  signals, each with `id`, display `label`, `kind`, the phase a gap typically maps to, and a
  deep-link slug to beyond.minimumcd.org. Reference data only.
- `src/components/metrics/CdReadinessScorecard.svelte` — presentation panel in the visualization
  area, mirroring `MetricsDashboard.svelte` conventions, with its **own** `practiceStatusColors`
  map keyed on `met`/`gap`/`needs-review` (a distinct domain from the dashboard's
  `good`/`warning`/`critical`; only the Tailwind tokens overlap). Status is conveyed by **text
  label/badge plus icon, not color alone** (a11y). Rows grouped under "MinimumCD Core Practices"
  and "Flow Readiness Signals" headings; gaps sorted first within each group.

**Step model change (decision B):** add an `automated` boolean to the step data model
(default `true`) plus an `isAutomated(step)` accessor that treats a missing field as `true`
(backward-compatible load). Additive and backward-compatible: existing maps load as automated.
The step editor exposes the flag; save/load and import/export carry it (steps are spread whole).

**New threshold constants** (added to `src/data/thresholds.js`, not hard-coded):

- `WORK_ITEM_MAX_LEAD_TIME_MINUTES = 960` (2 work days @ 480 min/day).
- `TEST_STEP_MAX_PROCESS_TIME_MINUTES = 10`.
- Flow-efficiency, %C&A, and bottleneck thresholds are **reused** from existing constants
  (`FLOW_EFFICIENCY_GOOD_THRESHOLD = 25`, `FIRST_PASS_YIELD_WARNING_THRESHOLD = 60`,
  `BOTTLENECK_QUEUE_THRESHOLD`).

**The 13 readiness items and their inference**

*Flow readiness signals (`kind: signal`) — provable both ways → `met` or `gap`:*

| Item | `gap` when | `met` when | Pin |
|---|---|---|---|
| Work Decomposition | any step `leadTime > 960` | otherwise | worst step |
| Testing Fundamentals | any `testing` step `processTime > 10` | otherwise | worst step |
| Work In Progress Limits | any step in `identifyBottlenecks()` | otherwise | bottleneck step |
| Small Batches | flow efficiency `< 25%` | otherwise | — |

*Core practices with a negative VSM signal (`kind: practice`) → `gap` or `needs-review`:*

| Item | `gap` when | else |
|---|---|---|
| Continuous Integration | rework loop present OR any step `%C&A < 60` | needs-review |
| Definition of Deployable | rework loop present OR any step `%C&A < 60` | needs-review |
| Single Path to Production | any `deployment` step `automated == false`, OR ≥2 deployment steps | `met` if exactly one automated deployment step, else needs-review |
| Rollback | no `deployment` step in the map | needs-review |

*Core practices with no VSM signal (`kind: practice`) → always `needs-review`:* Trunk-Based
Development, Deterministic Pipeline, Immutable Artifacts, Production-Like Environments,
Application Configuration.

> CI and Definition of Deployable share the same evidence (rework / low %C&A) but are distinct
> scored practices — both flag when that evidence is present.

**Integration points / data flow**

- Read-only consumer of `vsmDataStore` (`steps`, `connections`) plus a new persisted
  `readinessOverrides` map. Exposed as a `$derived` getter `vsmDataStore.cdReadiness` mirroring the
  existing `cachedMetrics`/`get metrics()` pattern (`vsmDataStore.svelte.js:52,92`).
- **Confirm/override/reset is new persisted per-map state** (`readinessOverrides`, keyed by item
  id). It must be threaded through **every** map-state site: the `persist()` payload, `loadMap`,
  `createNewMap`, `clearMap`, and `restoreSnapshot`, and default to `{}` for legacy maps. It must
  **NOT** mutate step objects.
- Step-pinning surfaces the offending step by name in the row (richer canvas highlight deferred).

**Constraints**

- Functional style only — factory/pure functions, no ES6 classes (`.claude/rules/javascript-svelte.md`).
- No new runtime dependencies; reuse `metrics.js` rather than duplicating calculations.
- Strict ATDD: feature file → review → implementation. No implementation code until the plan and
  its per-slice scenarios are reviewed/approved.
- Accessibility (`.claude/rules/ui-patterns.md`): status not by color alone; all controls labelled
  and keyboard-reachable; `data-testid` on rows, statuses, and controls.
- Affects ≤6 components — within single-spec scope.

## Acceptance Criteria

1. **Lists 13 items.** A non-empty map renders all 13 readiness items (9 core practices + 4
   signals), grouped into "MinimumCD Core Practices" and "Flow Readiness Signals", each with a
   status of `met`, `gap`, or `needs-review`.
2. **Empty map.** With zero steps, the scorecard shows an "add steps before assessing readiness"
   placeholder and scores nothing.
3. **Work Decomposition (signal).** A step `leadTime > 960` → `gap`, pinned to that step, 2-day
   explanation; a stream whose steps are all ≤ 960 → `met`.
4. **Testing Fundamentals (signal).** A `testing` step `processTime > 10` → `gap`, pinned, sub-10-
   min explanation; ≤ 10 → `met`.
5. **WIP Limits (signal).** A step flagged by `identifyBottlenecks()` → `gap`, pinned; no
   bottleneck → `met`.
6. **Small Batches (signal).** Flow efficiency `< 25%` → `gap`, wait-dominated explanation; ≥ 25%
   → `met`.
7. **Single Path to Production (practice).** A deployment step `automated == false` (or ≥2
   deployment steps) → `gap`, pinned to a manual deploy step when present; exactly one automated
   deployment step → `met`; a single automated deployment step does **not** flag.
8. **Continuous Integration (practice).** A rework loop or a step `%C&A < 60` → `gap`, pinned to
   the worst step; absent that evidence → `needs-review` (never fabricated `met`).
9. **Definition of Deployable (practice).** Same evidence as CI → `gap`, pinned; else
   `needs-review`. CI and Definition of Deployable both flag on the shared evidence.
10. **Rollback (practice).** A map with no deployment step → `gap`; otherwise `needs-review`.
11. **Needs-review defaults.** All five no-signal core practices (Trunk-Based Development,
    Deterministic Pipeline, Immutable Artifacts, Production-Like Environments, Application
    Configuration) show `needs-review`, never a fabricated `met`/`gap`.
12. **No false positives.** A stream within every threshold yields no `gap` on any signal.
13. **`automated` flag.** New steps default to `automated: true`; a step with no `automated`
    property loads as automated; the editor toggles it; it persists across save/load and
    import/export.
14. **Confirm.** Confirming an inferred gap keeps status `gap` and marks `source = confirmed`.
15. **Override.** Overriding an item to `met` sets `met`, marks `source = overridden`, and the
    override still holds after the map's metrics are recomputed (e.g. a step is added/edited).
16. **Reset.** Resetting an overridden/confirmed item returns it to its inferred status with
    `source = inferred`.
17. **Persistence + no mutation.** Confirm/override/reset decisions persist across save/load and
    never modify any step object's fields.
18. **Summary roll-up.** The scorecard shows counts of items `met` vs. `gap` vs. `needs-review`,
    and the counts update when an item is confirmed/overridden/reset.
19. **Accessibility.** Each item's status is announced by text (not color alone); confirm/override/
    reset controls are labelled (including the item name), keyboard-operable, and carry
    `data-testid`s.
20. **Iterative framing.** No copy assigns the team to a single migration phase; findings
    reference practices/constraints only.
21. **Quality gates.** `npm test && npm run build && npm run lint` pass; the engine is a pure
    function with ≥90% coverage; no ES6 classes introduced.

## Consistency Gate

- [x] Intent is unambiguous — two developers would interpret it the same way.
- [x] Every behavior/goal in the intent maps to ≥1 acceptance criterion. (13-item scoring→AC1;
  per-item inference→AC3-11; no-false-positive→AC12; automated flag→AC13; confirm/override/reset→
  AC14-16; persistence/no-mutation→AC17; summary→AC18; a11y→AC19; framing→AC20.)
- [x] Architecture constrains without over-engineering — one pure engine + one reference-data
  module + one panel + an additive step field; reuses existing metrics, thresholds, store, and
  conventions.
- [x] Terminology consistent — item `id`/`label`/`kind`, `met`/`gap`/`needs-review` statuses,
  `inferred`/`confirmed`/`overridden` sources used identically across artifacts.
- [x] No contradictions between artifacts — the earlier "9 practices vs. inference table" conflict
  is resolved by the 13-item (9 practice + 4 signal) model.

**Verdict: PASS.**
