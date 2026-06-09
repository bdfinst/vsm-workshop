# Handoff: VSM Workshop — Delivery-Problem-Finding Feature Review

> **Purpose of this file:** A durable handoff so a fresh Claude Code session can resume
> this work with full context. Read this top-to-bottom, then continue from
> **"Where we left off / next steps"** at the bottom.

## The task

Review the VSM Workshop's current capabilities and suggest **missing features that would
help teams find problems in their software delivery process**, using
[beyond.minimumcd.org](https://beyond.minimumcd.org/) (the MinimumCD Practice Guide) as the
reference frame for improvements.

## Reference framework (MinimumCD / Beyond MinimumCD)

**Updated 2026-06-09: pages fetched DIRECTLY from beyond.minimumcd.org** (network now works in
this environment — see "Network access note"). The grounded content corrects the earlier
search-based notes in three ways:

- **9 core CD practices, not 8.** The site's
  [CD Practices](https://beyond.minimumcd.org/docs/reference/practices/) list is: Continuous
  Integration (integrate to trunk ≥ daily with automated tests), Trunk-Based Development, Single
  Path to Production, Deterministic Pipeline, Definition of Deployable, Immutable Artifacts,
  Production-Like Environments, Rollback, **and Application Configuration** ("separate what varies
  between environments from what does not").
- **The migration model is explicitly iterative, NOT sequential.** Phases are Assess →
  Foundations → Pipeline → Optimize → Deliver on Demand, but
  [the overview](https://beyond.minimumcd.org/docs/migrate-to-cd/) states teams "typically work
  across multiple phases simultaneously." → A diagnosis should point at *practices/constraints*,
  not lock a team into a single phase.
- **Phase 2 Pipeline explicitly names manual approval chains, handoff delays, and manual
  validation gates as *waste*** ("Human approval processes are noticeably absent from success
  criteria"). → Direct textual backing for flagging handoffs / manual steps in the VSM.

**Objective thresholds the site gives (these map onto data the app already stores per step):**

| Site threshold | Source phase |
|---|---|
| Work items completable within **2 days** (work decomposition) | Phase 1 Foundations |
| Test suites run in **< 10 minutes** | Phase 1 Foundations |
| Single-command build; daily trunk integration | Phase 1 Foundations |
| Rollback executes **within minutes** | Phase 2 Pipeline |
| WIP limits act as "flow governors"; small batches | Phase 3 Optimize |

- **[Phase 0: Assess](https://beyond.minimumcd.org/docs/migrate-to-cd/assess/):** the pivotal
  reference. Four activities done **together**: (1) value stream mapping, (2) baseline DORA
  metrics (deployment frequency, lead time for changes, change failure rate, MTTR), (3) identify
  constraints, (4) current-state checklist self-assessing against MinimumCD practices. Readiness
  to advance = team can articulate its value stream, its lead time / deploy freq / CFR numbers,
  its **top three constraints**, and its missing practices. "Teams that skip assessment often
  invest in the wrong improvements."
- **Phase 3 Optimize:** DORA metrics are both **diagnostic and confirmatory**; WIP limits and
  small batches are the flow levers. "Having a pipeline isn't enough."

**Sources (fetched directly 2026-06-09):** /docs/reference/practices/ · /docs/migrate-to-cd/ ·
/docs/migrate-to-cd/assess/ · /docs/migrate-to-cd/foundations/ · /docs/migrate-to-cd/pipeline/ ·
/docs/migrate-to-cd/optimize/ (deliver-on-demand subpage 404'd; covered via the overview page)

## Current capabilities (inventory)

The app is a solid **generic VSM modeler** (Svelte 5 runes + @xyflow/svelte canvas).

- **Build:** steps (name, type, PT, LT, %C&A, queue, batch, people, description), forward +
  rework connections, 19 step templates + 2 map templates, undo/redo (20), auto-layout,
  import/export (JSON/PNG/PDF), localStorage persistence, validation (LT ≥ PT).
- **Static metrics** (`src/utils/calculations/metrics.js`): total lead time, total process
  time, flow efficiency (good ≥30% / warn ≥25%), first-pass yield (product of %C&A; good ≥85%),
  step count, total queue size, activity ratio, rework impact (effective LT + multiplier),
  bottleneck flags (queue threshold).
- **Simulation** (`src/utils/simulation/`): tick-based work-item flow, probabilistic rework
  from %C&A, queue tracking, throughput / avg lead time, bottleneck detection, **what-if
  scenario comparison** (baseline vs. modified VSM).
- **34 Cucumber feature files** across builder / visualization / simulation / data.

**Assessment:** as a drawing-and-calculating tool it's strong. The gap is that it **models a
value stream but does not yet *diagnose a software-delivery* process** — which is exactly what
Beyond MinimumCD is built around. Notably unimplemented: improvement recommendations,
Theory-of-Constraints analysis, real-data import, DORA metrics.

## Gap analysis + prioritized recommendations (regenerated from direct site content)

**Core gap (unchanged but better grounded):** Phase 0 Assess is **one combined activity** — map
the stream **and** baseline DORA **and** self-assess practices, together, to find the constraint.
The app does the mapping half well and the diagnosis half not at all.

**Key new leverage from the grounded read:** the site's objective thresholds (≤2-day work items,
<10-min tests, single automated deploy path, minutes-to-rollback, WIP limits) map directly onto
data the app **already stores per step**. That means the practice self-assessment can be
**auto-inferred from the VSM** rather than entered by hand — the strongest "find the problem"
story for the least new data model. This is the central regenerated insight.

### VSM-finding → MinimumCD-content mapping (the engine behind every recommendation)

| VSM finding (already computable) | MinimumCD signal | Phase | Countermeasure (deep-link) |
|---|---|---|---|
| Step lead time > 2 days | Work Decomposition gap | Foundations | Story slicing |
| Test step process time > 10 min | Testing Fundamentals | Foundations | Test architecture |
| Manual / multiple deploy steps | Single Path to Production not met | Pipeline | Automate the path |
| Rework loops / low %C&A | CI + Definition of Deployable gap | Foundations/Pipeline | Automated deployable criteria |
| Large queue before a step (bottleneck) | WIP not constrained ("flow governors") | Optimize | WIP limits |
| Flow efficiency < 25%, wait-dominated | Queue-dominated flow = waste | Assess/Optimize | Small batches |
| No rollback step / manual recovery | Rollback gap (recovery in minutes) | Pipeline | Automated rollback |

### P1 — "CD Readiness Diagnosis" panel (one combined Phase-0 feature)

1. **P1b — Auto-inferred practice scorecard (TOP PICK, build first).** Score the 9 MinimumCD
   practices, **pre-filling likely gaps from VSM data** via the thresholds above, each pinned to
   the offending step, user can confirm/override. Reuses stored step data; embodies "map +
   self-assess together"; most visible output for least new model.
2. **P1a — Wait-time waterfall.** Per-step value-add vs. wait, flagging handoffs / manual steps as
   hidden queues. Now backed by Phase 2's explicit "manual gates are waste" text.
3. **P1c — DORA reconciliation.** Capture deploy freq, lead time for changes, CFR, MTTR per map;
   killer check = **VSM-derived lead time vs. actual lead time for changes** (the gap is the
   hidden queue). Only genuinely new data surface in P1.
4. **Kaizen-burst problem annotations.** Drop markers on steps/edges, tag by waste type or
   practice gap, roll up into an improvement backlog.

### P2 — Make analysis prescriptive

5. **Constraint → countermeasure recommendations.** Drive the mapping table above off the detected
   bottleneck as deep-linked prescriptive advice. **Iterative framing — point at practices, never
   phase-gate** (the site says phases run simultaneously).
6. **Batch size & WIP as primary levers (Little's Law).** WIP limits per step; WIP = throughput ×
   lead time; simulator lever "halve batch size → projected LT change."

### P3 — Trustworthy inputs & realistic model

7. **Import current-state from real tooling (Jira/GitHub/CI)** — derive durations/queues/WIP from
   actual timestamps; guessed maps hide the real waste.
8. **Variability / Monte Carlo in the simulation** — queues from variability + high utilization,
   not just rework.
9. **Formal Current-State vs. Future-State framing** — evolve the scenario feature into the
   classic two-state VSM model with projected deltas.

### Suggested sequencing

- **P1** first as a single "CD Readiness Diagnosis" panel (reuses stored data; converts the map
  into a problem-finder). Start with **P1b auto-inferred scorecard**.
- **P2** next (builds on existing bottleneck + simulation engine).
- **P3** later (larger; raises accuracy/realism).

## Network access note

**Resolved as of 2026-06-09:** `beyond.minimumcd.org` is now directly fetchable from this
environment (WebFetch succeeded for the practices page and all four phase pages;
only the `deliver-on-demand/` subpage 404'd, covered instead via the migrate-to-cd overview).
The recommendations above are now grounded in the real page text rather than search snippets.

(Historical: it previously returned `HTTP 403` / `x-deny-reason: host_not_allowed` from the
env's egress proxy under the **Trusted** network policy. If it regresses, edit the environment →
**Network access** → **Custom** → add `beyond.minimumcd.org` + `*.minimumcd.org` to allowed
domains, keep default package-manager list checked, save, start a new session.)

## Where we left off / next steps

- **Done 2026-06-09:** re-fetched beyond.minimumcd.org directly and **regenerated the gap analysis
  + recommendations** against the real content (corrections: 9 practices not 8; phases are
  iterative not sequential; Phase 2 explicitly calls manual gates/handoffs waste). Added the
  **VSM-finding → MinimumCD-content mapping table** that is the engine behind every recommendation,
  and reframed P1 as a single combined "CD Readiness Diagnosis" panel.
- **Top pick / next action:** draft the ATDD `.feature` file for **P1b — auto-inferred practice
  scorecard** (pre-fill the 9-practice gaps from VSM step data via the threshold table, pin each
  gap to its step, user confirms/overrides). Reuses stored data, embodies Phase-0 "map +
  self-assess together," fits the test-first workflow (`.claude/rules/atdd-workflow.md`:
  feature file → review → implementation).
- Per ATDD rules, the feature file must be **presented for explicit review/approval before any
  implementation code**.

## Next-session kickoff (dev-team plugin)

The `dev-team@bfinster` plugin (v6.7.0) is installed and auto-installs every session via the
`.claude/install-dev-team.sh` SessionStart hook (added to `.claude/settings.json`). **Plugin
skills/agents activate on session start**, so they are available in a fresh session, not the one
that installed them.

To kick off **P1b — CD Readiness Scorecard** next session, drive it with the plugin:

1. `product-manager` agent + `specs` skill — shape acceptance criteria from the P1b description
   and the VSM-finding → MinimumCD mapping table above.
2. `new-feature` (project skill) to create
   `features/visualization/cd-readiness-scorecard.feature`, then `feature-file-validation` skill
   to lint the Gherkin. **Stop for review/approval before code.**
3. `architect` agent + `plan`/`explore` skills — design the inference engine (threshold table →
   practice gap → offending step) and locate the metrics/dashboard/StepNode files.
4. `test-driven-development` + `cd-test-architecture` skills, `software-engineer` agent —
   implement test-first.
5. `svelte-review` + `js-fp-review` + `spec-compliance-review` + `code-review` — quality pass
   (these correctly target Svelte 5 + functional style; the project's local skills are stale on
   "React/PropTypes").

**Known config note:** `.claude/settings.json` `enabledPlugins` still references the OLD name
`agentic-dev-team@agentic-dev-team`; the live plugin is `dev-team@bfinster` (marketplace internal
name `bfinster`). The SessionStart hook installs the correct one regardless, but the stale
declarative entry may emit a "plugin not found" warning and could be cleaned up to
`"dev-team@bfinster": true`.
