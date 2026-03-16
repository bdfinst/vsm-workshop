/**
 * SimulationService - Svelte version
 * Thin composition layer that wires together the three sub-services.
 * Public API is unchanged for all consumers.
 */

import { vsmDataStore } from '../stores/vsmDataStore.svelte.js'
import { simControlStore } from '../stores/simulationControlStore.svelte.js'
import { simDataStore } from '../stores/simulationDataStore.svelte.js'
import { scenarioStore } from '../stores/scenarioStore.svelte.js'
import { createSimulationRunner } from '../utils/simulation/SimulationRunner.js'
import { createSimulationStateInitializer } from './SimulationStateInitializer.js'
import { createSimulationOrchestrator } from './SimulationOrchestrator.js'
import { createScenarioManager } from './ScenarioManager.js'

/**
 * Build a default storeApi that delegates to the singleton stores.
 * This keeps backwards compatibility while allowing tests to inject mocks.
 * @returns {Object} Store API with read and write methods
 */
const defaultStoreApi = () => ({
  // Reads
  getSteps: () => vsmDataStore.steps,
  getConnections: () => vsmDataStore.connections,
  getWorkItemCount: () => simDataStore.workItemCount,
  getIsRunning: () => simControlStore.isRunning,
  getScenarios: () => scenarioStore.scenarios,

  // Writes
  setRunning: (v) => simControlStore.setRunning(v),
  setPaused: (v) => simControlStore.setPaused(v),
  resetControl: () => simControlStore.reset(),
  updateWorkItems: (v) => simDataStore.updateWorkItems(v),
  updateQueueSizes: (v) => simDataStore.updateQueueSizes(v),
  updateElapsedTime: (v) => simDataStore.updateElapsedTime(v),
  setDetectedBottlenecks: (v) => simDataStore.setDetectedBottlenecks(v),
  addQueueHistoryBatch: (v) => simDataStore.addQueueHistoryBatch(v),
  setResults: (v) => simDataStore.setResults(v),
  resetData: () => simDataStore.reset(),
  addScenario: (v) => scenarioStore.addScenario(v),
  setComparisonResults: (v) => scenarioStore.setComparisonResults(v),
})

/**
 * Create a simulation service instance by composing sub-services
 * @param {Object} [runner] - Simulation runner (default: createSimulationRunner())
 * @param {Object} [storeApi] - Store API for reads/writes (default: delegates to singletons)
 * @returns {Object} Simulation service methods
 */
export const createSimulationService = (
  runner = createSimulationRunner(),
  storeApi = defaultStoreApi()
) => {
  const initializer = createSimulationStateInitializer(storeApi)
  const orchestrator = createSimulationOrchestrator(runner, storeApi, initializer)
  const scenarioManager = createScenarioManager(storeApi)

  return {
    startSimulation: orchestrator.startSimulation,
    pauseSimulation: orchestrator.pauseSimulation,
    resumeSimulation: orchestrator.resumeSimulation,
    resetSimulation: orchestrator.resetSimulation,
    createScenario: scenarioManager.createScenario,
    runComparison: scenarioManager.runComparison,
    cleanup: orchestrator.cleanup,
  }
}

// Eager singleton - initialized once at module load
// Wrapped in try/catch so initialization failures surface immediately rather
// than propagating silently to the first call site
let serviceInstance
try {
  serviceInstance = createSimulationService()
} catch (err) {
  console.error('SimulationService failed to initialize:', err)
  // Provide a no-op fallback so callers don't receive undefined
  serviceInstance = {
    startSimulation: () => {},
    pauseSimulation: () => {},
    resumeSimulation: () => {},
    resetSimulation: () => {},
    createScenario: () => null,
    runComparison: () => {},
    cleanup: () => {},
  }
}

export function getSimulationService() {
  return serviceInstance
}

// HMR cleanup: stop animation loop when module is hot-replaced
if (import.meta.hot) {
  import.meta.hot.dispose(() => serviceInstance.cleanup())
}
