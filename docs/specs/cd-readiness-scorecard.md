# Spec: CD Readiness Scorecard (P1b)

> Phase-0 deliverable for the dev-team pipeline. Produced via `/dev-team:specs` from
> `HANDOFF-vsm-review.md` (top-pick next action). Gherkin scenarios are authored later,
> per slice, in `/plan` — `features/visualization/cd-readiness-scorecard.feature` is a
> draft kept as supporting material only.

## Intent Description

Today the VSM Workshop is a strong generic value-stream *modeler* but it does not *diagnose a
software-delivery process*. The CD Readiness Scorecard closes that gap. It is the first slice of
the "CD Readiness Diagnosis" capability and embodies the MinimumCD Phase-0 "Assess" idea that a
team should map its value stream **and** self-assess its practices **together** to find its
constraints (per beyond.minimumcd.org).

The scorecard scores the **9 MinimumCD core practices** for the currently open map and, crucially,
**pre-fills likely gaps automatically from data the VSM already stores per step** — so a
facilitator is not handed a blank checklist. Each auto-detected gap is **pinned to the offending
step** with a plain-language explanation of the threshold it violated, and the facilitator can
**confirm** the inferred status or **override** it. Practices that have no inferable signal in VSM
data default to a "needs review" status for manual assessment.

The framing is deliberately **iterative, not phase-gated**: findings point at specific
practices/constraints (the site states migration phases run simultaneously); the scorecard never
tells a team which single phase it is "in." This is the highest-leverage "find the problem"
feature for the least new data model, because the inference reuses metrics the app already
computes (flow efficiency, first-pass yield, bottleneck IDs, rework impact) plus per-step fields
(lead time, process time, %C&A, queue size, step type).

## Architecture Specification

**New components**

- `src/utils/calculations/cdReadiness.js` — pure inference engine (no Svelte, no side effects).
  Primary export `calculateCdReadiness(steps, connections, overrides)` → an array of 9 practice
  results: `{ practice, status, signal, stepId, explanation, source }` where
  `status ∈ {met, gap, needs-review}` and `source ∈ {inferred, confirmed, overridden}`.
  Inference reuses `calculateFlowEfficiency`, `identifyBottlenecks`, and rework data from
  `metrics.js` rather than recomputing them.
- `src/data/minimumCdPractices.js` — the canonical list of the 9 practices and their
  display metadata (name, the phase a gap typically maps to, deep-link slug to
  beyond.minimumcd.org). Reference data only.
- `src/components/metrics/CdReadinessScorecard.svelte` — presentation panel in the visualization
  area, mirroring `MetricsDashboard.svelte` conventions (status color map, `data-testid`,
  `data-status`, Tailwind, `$props`/`$derived`, no classes).

**New threshold constants** (added to `src/data/thresholds.js`, not hard-coded):

- `WORK_ITEM_MAX_LEAD_TIME_MINUTES = 960` (2 work days @ 480 min/day).
- `TEST_STEP_MAX_PROCESS_TIME_MINUTES = 10`.
- Flow-efficiency and bottleneck thresholds are **reused** from existing constants
  (`FLOW_EFFICIENCY_GOOD_THRESHOLD`, `BOTTLENECK_QUEUE_THRESHOLD`); %C&A gap reuses
  `FIRST_PASS_YIELD_*` semantics.

**Integration points / data flow**

- Read-only consumer of `vsmDataStore` (`steps`, `connections`). The scorecard derivation is
  exposed the same way metrics are: a `$derived` value (`vsmDataStore.cdReadiness` mirroring the
  existing `cachedMetrics`/`get metrics()` pattern at `vsmDataStore.svelte.js:51-92`), OR derived
  locally in the component. Decision deferred to `/plan`.
- **User confirm/override state is new persisted data.** Stored per map (keyed by practice id) and
  passed into `calculateCdReadiness` as `overrides`. It must survive save/load like other map data
  and participate in undo/redo only if that falls out naturally — exact persistence shape is a
  `/plan` decision, but it must NOT mutate step objects.
- Step-pinning reuses existing step IDs; "pinned to step" surfaces via the existing selection/
  highlight mechanism used by bottleneck flagging where practical.

**Inference rules (the engine contract)**

| VSM signal (already computable) | Practice scored | Status when triggered |
|---|---|---|
| any step `leadTime > 960` | Work Decomposition* | gap, pinned to that step |
| `testing`-type step `processTime > 10` | Testing Fundamentals* | gap, pinned to that step |
| ≥1 manual/≥2 deploy steps | Single Path to Production | gap |
| rework loop present OR step `%C&A` below FPY warning | CI + Definition of Deployable | gap, pinned to worst step |
| step in `identifyBottlenecks()` | Work In Progress Limits* | gap, pinned to that step |
| flow efficiency `< 25%` (wait-dominated) | Small Batches* | gap |
| no `deployment`-type step in map | Rollback | gap |
| no inferable signal (e.g. Trunk-Based Development, Immutable Artifacts, Deterministic Pipeline, Production-Like Environments, Application Configuration) | that practice | needs-review |

\* Names marked are readiness signals from the handoff mapping table; final display labels are a
`/plan` detail but must be used consistently across engine, component, and tests.

**Constraints**

- Functional style only — factory/pure functions, no ES6 classes (`.claude/rules/javascript-svelte.md`).
- No new runtime dependencies; reuse `metrics.js` rather than duplicating calculations
  (guard against semantic duplication).
- Strict ATDD: feature file → review → implementation. No implementation code until the drafted
  feature file is reviewed/approved.
- Affects ≤5 components — within single-spec scope.

## Acceptance Criteria

1. **Lists 9 practices.** For a non-empty map, the scorecard renders exactly the 9 MinimumCD core
   practices, each with a status of `met`, `gap`, or `needs-review`. (pass/fail: count = 9)
2. **Empty map.** With zero steps, the scorecard shows a "add steps before assessing readiness"
   placeholder and scores nothing.
3. **Work Decomposition inference.** A step with `leadTime > 960` min produces a `gap` on Work
   Decomposition, pinned to that step, with an explanation referencing the 2-day threshold.
4. **Testing Fundamentals inference.** A `testing`-type step with `processTime > 10` min produces
   a `gap` on Testing Fundamentals pinned to that step (sub-10-min test message).
5. **Single Path to Production inference.** Multiple/manual deployment steps produce a `gap` with a
   "one automated path to production" explanation.
6. **Definition of Deployable inference.** A rework loop or a step with low `%C&A` produces a `gap`
   pinned to the worst step.
7. **WIP inference.** A step flagged by existing bottleneck detection produces a WIP-limits `gap`
   pinned to that step.
8. **Small Batches inference.** Flow efficiency `< 25%` produces a `gap` with a wait-dominated-flow
   explanation.
9. **Rollback inference.** A map with no deployment step produces a Rollback `gap`.
10. **Healthy stream passes.** A step whose metrics are within all thresholds yields `met` (no
    false-positive gap) for the corresponding practice.
11. **Needs-review default.** Practices with no inferable signal (e.g. Trunk-Based Development,
    Immutable Artifacts) show `needs-review`, never a fabricated `met`/`gap`.
12. **Confirm.** Confirming an inferred gap keeps status `gap` and marks it `confirmed` (source).
13. **Override.** Overriding a practice to `met` sets status `met`, marks it `overridden`, and the
    override survives a recompute of the map metrics.
14. **Persistence.** Confirm/override decisions persist across save/load of the map and never
    mutate step objects.
15. **Summary roll-up.** The scorecard shows a count of practices `met` vs. practices with `gap`s.
16. **Quality gates.** `npm test && npm run build && npm run lint` all pass; engine is a pure
    function with ≥90% coverage per the calculations coverage goal; no ES6 classes introduced.
17. **Iterative framing.** No copy in the panel assigns the team to a single migration phase;
    findings reference practices/constraints only.

## Consistency Gate

- [x] Intent is unambiguous — two developers would interpret it the same way.
- [x] Every behavior/goal in the intent maps to at least one acceptance criterion.
  (9-practice scoring→AC1; auto-inference→AC3-9; pin-to-step→AC3,4,6,7; confirm/override→AC12-13;
  persistence→AC14; needs-review→AC11; iterative framing→AC17; summary→AC15.)
- [x] Architecture constrains without over-engineering — one pure engine + one reference-data
  module + one panel; reuses existing metrics, thresholds, store, and highlight mechanisms.
- [x] Terminology consistent across artifacts — practice names, `met`/`gap`/`needs-review`
  statuses, `inferred`/`confirmed`/`overridden` sources used identically throughout.
- [x] No contradictions between artifacts.

**Verdict: PASS** — open issue intentionally deferred to `/plan`: exact persistence shape of
confirm/override state and whether scorecard derivation lives on `vsmDataStore` or in-component.
These are implementation decisions, not spec conflicts.
