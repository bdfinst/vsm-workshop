# Invert SimulationService Store Dependencies

## Context

`src/services/SimulationService.svelte.js` directly imports and mutates 4
singleton stores (`vsmDataStore`, `simControlStore`, `simDataStore`,
`scenarioStore`). This makes the service hard to test in isolation and tightly
couples it to the store singletons.

## Task

Refactor `createSimulationService` to accept store action interfaces as
parameters instead of importing singletons directly.

```js
// Before
import { vsmDataStore } from '../stores/vsmDataStore.svelte.js'

export const createSimulationService = (runner = createSimulationRunner()) => {
  const startSimulation = () => {
    const steps = vsmDataStore.steps   // direct import
    ...
  }
}

// After
export const createSimulationService = (
  runner = createSimulationRunner(),
  storeApi = defaultStoreApi()         // injected
) => {
  const startSimulation = () => {
    const steps = storeApi.getSteps()  // injected
    ...
  }
}

// Wired singleton (in the same file or App.svelte)
const defaultStoreApi = () => ({
  getSteps: () => vsmDataStore.steps,
  getConnections: () => vsmDataStore.connections,
  getWorkItemCount: () => simDataStore.workItemCount,
  setRunning: (v) => simControlStore.setRunning(v),
  ...
})
```

## Constraints

- No ES6 classes
- The exported `getSimulationService()` singleton must continue to work
  without changes to existing call sites
- Write unit tests for `createSimulationService` that pass a mock `storeApi`
  — these tests must not require Svelte rune context
- Quality gates: `npm run test && npm run build && npm run lint`

## Files to touch

- `src/services/SimulationService.svelte.js`
- `tests/unit/services/SimulationService.test.js` (new)
