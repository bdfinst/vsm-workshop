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
 * Create a simulation service instance
 * Works with Svelte 5 stores
 */
export const createSimulationService = (runner = createSimulationRunner()) => {
  /**
   * Start a new simulation run
   */
  const startSimulation = () => {
    // Re-entrancy guard: don't start if already running
    if (simControlStore.isRunning) return

    const steps = vsmDataStore.steps
    const connections = vsmDataStore.connections
    const workItemCount = simDataStore.workItemCount

    if (steps.length === 0) return

    const initialState = initSimulation(steps, connections, { workItemCount })
    const firstStepId = steps[0]?.id
    const items = generateWorkItems(workItemCount, firstStepId)

    simDataStore.updateWorkItems(items)
    simDataStore.updateQueueSizes(initialState.queueSizesByStepId)
    simDataStore.updateElapsedTime(0)
    simDataStore.setDetectedBottlenecks([])
    simDataStore.setResults(null)
    simControlStore.setRunning(true)

    runner.start(initialState, steps, connections, {
      onTick: (newState) => {
        simDataStore.updateWorkItems(newState.workItems)
        simDataStore.updateElapsedTime(newState.elapsedTime)
        simDataStore.updateQueueSizes(newState.queueSizesByStepId)
        simDataStore.setDetectedBottlenecks(newState.detectedBottlenecks)

        simDataStore.addQueueHistoryBatch(newState.queueHistory)
      },
      onComplete: (finalResults) => {
        simControlStore.setRunning(false)
        simDataStore.setResults(finalResults)
      },
    })
  }

  /**
   * Pause the running simulation
   */
  const pauseSimulation = () => {
    simControlStore.setPaused(true)
    runner.pause()
  }

  /**
   * Resume a paused simulation
   */
  const resumeSimulation = () => {
    simControlStore.setPaused(false)
    simControlStore.setRunning(true)
    runner.resume()
  }

  /**
   * Stop and reset the simulation
   */
  const resetSimulation = () => {
    runner.stop()
    simControlStore.reset()
    simDataStore.reset()
  }

  /**
   * Create a new scenario from current VSM state
   */
  const createScenario = () => {
    const steps = vsmDataStore.steps
    const connections = vsmDataStore.connections
    const scenarios = scenarioStore.scenarios

    const scenario = {
      id: crypto.randomUUID(),
      name: `Scenario ${scenarios.length + 1}`,
      steps: steps.map((s) => ({ ...s })),
      connections: connections.map((c) => ({ ...c })),
      results: null,
    }

    scenarioStore.addScenario(scenario)
    return scenario
  }

  /**
   * Run comparison between baseline and scenario
   */
  const runComparison = (scenarioId) => {
    const steps = vsmDataStore.steps
    const connections = vsmDataStore.connections
    const workItemCount = simDataStore.workItemCount
    const scenarios = scenarioStore.scenarios

    const scenario = scenarios.find((s) => s.id === scenarioId)
    if (!scenario) return

    const results = runSimulationForScenario(
      { steps, connections },
      scenario,
      workItemCount
    )

    scenarioStore.setComparisonResults(results)
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
const serviceInstance = createSimulationService()

export function getSimulationService() {
  return serviceInstance
}
