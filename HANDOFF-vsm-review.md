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

Gathered via web search; the site itself was **not directly fetchable from the cloud
sandbox** (see "Network access note" below).

- **[MinimumCD](https://minimumcd.org/) core practices:** Continuous Integration (integrate to
  trunk ≥ 1×/dev/day with automated tests), Trunk-Based Development, Single Path to Production,
  Deterministic Pipeline, Definition of Deployable, Immutable Artifacts, Production-Like
  Environments, Rollback. ([CD Practices](https://beyond.minimumcd.org/docs/reference/practices/))
- **[Beyond MinimumCD migration phases](https://beyond.minimumcd.org/docs/migrate-to-cd/):**
  Assess → Foundations → Pipeline → Optimize → Deliver on Demand.
- **[Phase 0: Assess](https://beyond.minimumcd.org/docs/migrate-to-cd/assess/):** the pivotal
  reference. Teams **map the value stream AND baseline DORA metrics** (deployment frequency,
  lead time for changes, change failure rate, MTTR) **together**, plus a **current-state
  checklist self-assessing against MinimumCD practices**, in order to **find the constraint**
  limiting flow.
- **[Work in Small Batches](https://minimumcd.org/practices/smallbatches/):** central thesis —
  small batches, WIP limits, queue length, and handoffs-as-hidden-queues are the primary levers.
  (~85% of a work item's life is typically spent in queue.)

**Sources:** minimumcd.org · beyond.minimumcd.org/ · /docs/migrate-to-cd/assess/ ·
/docs/reference/practices/ · /docs/migrate-to-cd/pipeline/single-path-to-production/ ·
minimumcd.org/practices/smallbatches/

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

## Gap analysis + prioritized recommendations

**Core gap:** Phase 0 Assess says map the stream **and** baseline DORA **and** self-assess
practices, together, to find the constraint. The app does the mapping half well and the
diagnosis half not at all. Every P1 below closes that loop.

### P1 — Turn the map into a diagnosis (small build, big payoff)

1. **DORA / flow-metrics baseline panel.** Capture deployment frequency, lead time for changes,
   change failure rate, MTTR per map. Killer move: **reconcile VSM-derived lead time vs. the
   team's *actual* lead time for changes** — the discrepancy reveals hidden queues. (Phase 0.)
2. **"Where is the time going?" wait-time breakdown.** Decompose flow efficiency into a per-step
   **value-add vs. wait-time waterfall**, and flag **handoffs as hidden queues**. Data already
   stored per step. Most literal "find the problem" feature. (Small Batches.)
3. **CD-practice self-assessment attached to the map.** Scorecard for the 8 MinimumCD practices;
   **pin each gap to the step it afflicts** (e.g., manual "Production Deploy" → "Single Path to
   Production: not met"). (Phase 0 checklist.)
4. **Kaizen-burst problem annotations.** Drop problem/observation markers on steps/edges, tag by
   waste type or MinimumCD-practice gap, roll up into an **improvement backlog**.

### P2 — Make analysis prescriptive

5. **Constraint-based improvement recommendations.** Map the detected constraint to
   MinimumCD-aligned countermeasures with deep links (high rework → CI + Definition of
   Deployable; large queue before manual QA/deploy → automate path, shrink batch).
6. **Batch size & WIP as primary levers (Little's Law).** WIP limits per step; compute
   WIP = throughput × lead time; simulator lever "halve batch size → projected LT change."

### P3 — Trustworthy inputs & realistic model

7. **Import current-state from real tooling (Jira/GitHub/CI)** — derive durations/queues/WIP
   from actual timestamps; guessed maps hide the real waste.
8. **Variability / Monte Carlo in the simulation** — queues from variability + high utilization,
   not just rework (queueing theory).
9. **Formal Current-State vs. Future-State framing** — evolve the scenario feature into the
   classic two-state VSM model with a documented improvement plan + projected deltas.

### Suggested sequencing

- **P1** first (reuses stored data; converts the map into a problem-finder).
- **P2** next (builds on existing bottleneck + simulation engine).
- **P3** later (larger; raises accuracy/realism).

## Network access note (why direct fetch failed)

`beyond.minimumcd.org` returned `HTTP 403` with header **`x-deny-reason: host_not_allowed`** —
that's **this cloud environment's egress proxy**, not the website. The env is on the **Trusted**
network policy, which only allows package registries / GitHub / cloud SDKs. WebSearch worked
because it routes through a separate channel.

**To enable direct fetching in a future cloud session:** edit the environment (cloud icon) →
**Network access** → **Custom** → add `beyond.minimumcd.org` and `*.minimumcd.org` to
**Allowed domains** → keep "Also include default list of common package managers" checked → save
→ start a new session. (Alternatively, teleport the session to a local terminal, which uses your
machine's network and needs no allowlist.)

## Where we left off / next steps

- Review + recommendations delivered to the user (above is the full content).
- User chose to **persist this handoff** so work can resume in a fresh session.
- **Open offer / next action:** draft the ATDD `.feature` file for the top pick. Recommended
  starting point: **#2 wait-time / flow-efficiency breakdown** or **#3 CD-practice
  self-assessment** — both reuse data the app already stores and fit the test-first workflow
  (feature file → review → implementation, per `.claude/rules/atdd-workflow.md`).
- If resuming with network access enabled, **fetch the beyond.minimumcd.org pages directly** to
  refine the recommendations against the real page text before writing feature files.
