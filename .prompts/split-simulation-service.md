# Split SimulationService God Object

## Context

`src/services/SimulationService.svelte.js` currently has 7 responsibilities:
lifecycle control, scenario management, comparison, store mutations, runner
delegation, state initialization, and work-item generation.

## Task

Split into three focused services:

1. **`SimulationOrchestrator`** — lifecycle only (start/pause/resume/reset).
   Delegates to runner; sets `simControlStore` and `simDataStore` state.
2. **`ScenarioManager`** — scenario CRUD and comparison. Creates scenarios
   from current VSM state; calls `ComparisonEngine`; writes to `scenarioStore`.
3. **`SimulationStateInitializer`** — one-time setup per run: calls
   `initSimulation`, `generateWorkItems`, seeds initial store state.

## Constraints

- No ES6 classes — use factory functions (`createSimulationOrchestrator`, etc.)
- Each factory must accept its store dependencies as parameters (dependency
  injection) rather than importing singletons directly. This also fixes the
  "directly imports and mutates 4 stores" warning (REVIEW.md line 80).
- Export a composed singleton in `SimulationService.svelte.js` that wires the
  three factories together for backwards compatibility with callers.
- Quality gates must pass: `npm run test && npm run build && npm run lint`
- Commit after each new service is extracted and tested.

## Files to touch

- `src/services/SimulationService.svelte.js` (split source)
- `src/services/SimulationOrchestrator.js` (new)
- `src/services/ScenarioManager.js` (new)
- `src/services/SimulationStateInitializer.js` (new)
- `tests/unit/services/SimulationOrchestrator.test.js` (new)
- `tests/unit/services/ScenarioManager.test.js` (new)
- `tests/unit/services/SimulationStateInitializer.test.js` (new)
