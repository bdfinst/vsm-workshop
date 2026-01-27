# Services

Service layer for business logic and orchestration.

## Purpose

Services encapsulate business logic that:
- Coordinates multiple operations
- Orchestrates between stores and utilities
- Implements complex workflows
- Handles side effects (API calls, file I/O)

## Files

- **SimulationService.js** - Simulation orchestration and lifecycle management

## Service vs. Utility

### Use Services When:
- Coordinating multiple stores or utilities
- Managing complex workflows with multiple steps
- Handling side effects (network, file system)
- Orchestrating business processes

### Use Utilities When:
- Pure calculations (no side effects)
- Single-purpose transformations
- Stateless operations
- Reusable helper functions

## Pattern

Services use factory functions (no classes):

```javascript
/**
 * Create simulation service
 * Factory function pattern - see .claude/examples/factory-functions.md
 */
export const createSimulationService = () => {
  // Private state
  let currentSimulation = null

  // Public methods
  const startSimulation = (vsm, config) => {
    // 1. Validate input
    // 2. Create simulation engine
    // 3. Update stores
    // 4. Start execution
  }

  const stopSimulation = () => {
    // Clean up and save results
  }

  return {
    startSimulation,
    stopSimulation
  }
}
```

## Usage

```javascript
import { createSimulationService } from './services/SimulationService'

// In a component or hook
const simulationService = createSimulationService()

function handleStartSimulation() {
  simulationService.startSimulation(vsm, {
    workItemCount: 10,
    maxTicks: 1000
  })
}
```

## Service Responsibilities

### 1. Orchestration

Services coordinate between layers:

```javascript
const startSimulation = (vsm, config) => {
  // 1. Validate
  const { valid, errors } = validateVSM(vsm)
  if (!valid) throw new Error(errors)

  // 2. Create engine
  const engine = createSimulationEngine(vsm, config)

  // 3. Update stores
  simulationStore.getState().reset()
  simulationStore.getState().start(config)

  // 4. Execute
  return engine
}
```

### 2. Complex Workflows

Services handle multi-step processes:

```javascript
const runScenarioComparison = async (scenarios) => {
  // 1. Validate all scenarios
  // 2. Run simulations in sequence
  // 3. Collect results
  // 4. Calculate comparisons
  // 5. Update UI stores
}
```

### 3. Side Effects

Services manage I/O and external interactions:

```javascript
const exportSimulationResults = async (results) => {
  // 1. Format data
  // 2. Write to file
  // 3. Show notification
  // 4. Log analytics
}
```

## Testing Services

Services can have side effects, so use appropriate mocking:

```javascript
import { vi, describe, it, expect } from 'vitest'
import { createSimulationService } from './SimulationService'

// Mock stores
vi.mock('../stores/simulationStore')

describe('SimulationService', () => {
  it('starts simulation with valid config', () => {
    const service = createSimulationService()
    const result = service.startSimulation(mockVSM, mockConfig)

    expect(result).toBeDefined()
    expect(simulationStore.getState).toHaveBeenCalled()
  })
})
```

## Best Practices

1. **Keep services focused** - One service per domain area
2. **Use dependency injection** - Pass dependencies as parameters
3. **Handle errors gracefully** - Catch and transform errors
4. **Document side effects** - JSDoc should note any I/O
5. **Make testable** - Design for easy mocking

## See Also

- [Factory Function Examples](../../.claude/examples/factory-functions.md)
- [Architecture Guide](../../.claude/guides/architecture.md)
- [Testing Patterns](../../.claude/examples/testing-patterns.md)
