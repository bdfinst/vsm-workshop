# Simulation Utilities

Tick-based discrete event simulation for VSM work flow.

## Architecture

The simulation engine processes work items through VSM steps in discrete time slices (ticks).

**Core concept:** Each tick represents 1 minute of elapsed time.

## Files

- **simulationEngine.js** - Core tick processing logic
- **SimulationRunner.js** - Runner factory for managing simulation lifecycle
- **ComparisonEngine.js** - Comparison simulation for scenario analysis

## How It Works

1. **Initialization:** Create work items, place in first step's queue
2. **Tick processing:**
   - Process each step in order
   - Move completed work to next step
   - Apply quality checks (%C&A)
   - Route failures to rework loops
3. **Completion:** Calculate metrics, identify bottlenecks

## Usage

```javascript
import { createSimulationEngine } from './simulationEngine'

const engine = createSimulationEngine(steps, {
  workItemCount: 10,
  maxTicks: 1000
})

engine.start()
while (!engine.isComplete()) {
  engine.tick()
}

const results = engine.getResults()
```

## Key Concepts

### Tick-Based Simulation
Each tick = 1 minute of simulated time. Work items progress through steps based on:
- Process time (how long work takes)
- Queue wait times
- Batch processing rules

### Work Item Flow
1. Items start in first step's queue
2. When step has capacity, item begins processing
3. After process time elapses, quality check (%C&A) applied
4. Item either moves forward or loops back to rework
5. Continues until item reaches final step

### Metrics Collected
- **Cycle time** - Total time per work item
- **Throughput** - Items completed per day
- **WIP** - Work in progress at any moment
- **Queue sizes** - Items waiting at each step
- **Bottlenecks** - Steps with largest queues

## See Also

- [Architecture Guide](../../.claude/guides/architecture.md#simulation-engine-flow)
- [Simulation Skill](../../.claude/skills/run-simulation.md)
- [VSM Domain Rules](../../.claude/rules/vsm-domain.md)
