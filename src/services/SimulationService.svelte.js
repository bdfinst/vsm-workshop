/**
 * SimulationService - Svelte version
 * Orchestrates simulation workflows for Svelte stores
 */

import { vsmDataStore } from '../stores/vsmDataStore.svelte.js'
import { simControlStore } from '../stores/simulationControlStore.svelte.js'
import { simDataStore } from '../stores/simulationDataStore.svelte.js'
import { scenarioStore } from '../stores/scenarioStore.svelte.js'
import {
  initSimulation,
  generateWorkItems,
} from '../utils/simulation/simulationEngine.js'
import { createSimulationRunner } from '../utils/simulation/SimulationRunner.js'
import { createComparisonEngine } from '../utils/simulation/ComparisonEngine.js'

/**
 * Run simulation for scenario and calculate improvements
 */
const runSimulationForScenario = (vsmState, scenario, workItemCount) => {
  const engine = createComparisonEngine(workItemCount)

  const baselineResults = engine.runBaseline(vsmState.steps, vsmState.connections)
  const scenarioResults = engine.runScenario(scenario.steps, scenario.connections)
  const improvements = engine.calculateImprovements(baselineResults, scenarioResults)

  return {
    baseline: baselineResults,
    scenario: scenarioResults,
    improvements,
  }
}

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
 * Create a simulation service instance
 * @param {Object} [runner] - Simulation runner (default: createSimulationRunner())
 * @param {Object} [storeApi] - Store API for reads/writes (default: delegates to singletons)
 * @returns {Object} Simulation service methods
 */
export const createSimulationService = (
  runner = createSimulationRunner(),
  storeApi = defaultStoreApi()
) => {
  /**
   * Start a new simulation run
   */
  const startSimulation = () => {
    // Re-entrancy guard: don't start if already running
    if (storeApi.getIsRunning()) return

    const steps = storeApi.getSteps()
    const connections = storeApi.getConnections()
    const workItemCount = storeApi.getWorkItemCount()

    if (steps.length === 0) return

    // Set running before yielding control to prevent re-entrancy
    storeApi.setRunning(true)

    const initialState = initSimulation(steps, connections, { workItemCount })
    const firstStepId = steps[0]?.id
    const items = generateWorkItems(workItemCount, firstStepId)

    storeApi.updateWorkItems(items)
    storeApi.updateQueueSizes(initialState.queueSizesByStepId)
    storeApi.updateElapsedTime(0)
    storeApi.setDetectedBottlenecks([])
    storeApi.setResults(null)

    // Throttle queue history writes to every 5 ticks (~12/s at 60fps)
    // to reduce reactivity churn in the store
    let tickCount = 0
    const HISTORY_FLUSH_INTERVAL = 5
    let pendingHistory = []

    runner.start(initialState, steps, connections, {
      onTick: (newState) => {
        storeApi.updateWorkItems(newState.workItems)
        storeApi.updateElapsedTime(newState.elapsedTime)
        storeApi.updateQueueSizes(newState.queueSizesByStepId)
        storeApi.setDetectedBottlenecks(newState.detectedBottlenecks)

        pendingHistory = pendingHistory.concat(newState.queueHistory)
        tickCount++
        if (tickCount % HISTORY_FLUSH_INTERVAL === 0) {
          storeApi.addQueueHistoryBatch(pendingHistory)
          pendingHistory = []
        }
      },
      onComplete: (finalResults) => {
        // Flush any remaining buffered history
        if (pendingHistory.length > 0) {
          storeApi.addQueueHistoryBatch(pendingHistory)
          pendingHistory = []
        }
        storeApi.setRunning(false)
        storeApi.setResults(finalResults)
      },
    })
  }

  /**
   * Pause the running simulation
   */
  const pauseSimulation = () => {
    storeApi.setPaused(true)
    runner.pause()
  }

  /**
   * Resume a paused simulation
   */
  const resumeSimulation = () => {
    storeApi.setPaused(false)
    storeApi.setRunning(true)
    runner.resume()
  }

  /**
   * Stop and reset the simulation
   */
  const resetSimulation = () => {
    runner.stop()
    storeApi.resetControl()
    storeApi.resetData()
  }

  /**
   * Create a new scenario from current VSM state
   */
  const createScenario = () => {
    const steps = storeApi.getSteps()
    const connections = storeApi.getConnections()
    const scenarios = storeApi.getScenarios()

    const scenario = {
      id: crypto.randomUUID(),
      name: `Scenario ${scenarios.length + 1}`,
      steps: steps.map((s) => ({ ...s })),
      connections: connections.map((c) => ({ ...c })),
      results: null,
    }

    storeApi.addScenario(scenario)
    return scenario
  }

  /**
   * Run comparison between baseline and scenario
   */
  const runComparison = (scenarioId) => {
    const steps = storeApi.getSteps()
    const connections = storeApi.getConnections()
    const workItemCount = storeApi.getWorkItemCount()
    const scenarios = storeApi.getScenarios()

    const scenario = scenarios.find((s) => s.id === scenarioId)
    if (!scenario) return

    const results = runSimulationForScenario(
      { steps, connections },
      scenario,
      workItemCount
    )

    storeApi.setComparisonResults(results)
  }

  /**
   * Cleanup resources
   */
  const cleanup = () => {
    runner.stop()
  }

  return {
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    resetSimulation,
    createScenario,
    runComparison,
    cleanup,
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
