/**
 * SimulationService - Orchestrates simulation workflows
 *
 * Coordinates simulation execution and scenario comparisons.
 * Manages interaction between stores, engines, and UI.
 *
 * See: .claude/guides/architecture.md#simulation-engine-flow
 * See: .claude/services/README.md
 */

import { useVsmStore } from '../stores/vsmStore'
import { useSimulationStore } from '../stores/simulationStore'
import {
  initSimulation,
  generateWorkItems,
} from '../utils/simulation/simulationEngine'
// Factory function pattern - see .claude/examples/factory-functions.md
import { createSimulationRunner } from '../utils/simulation/SimulationRunner'
import { createComparisonEngine } from '../utils/simulation/ComparisonEngine'

/**
 * Run simulation for scenario and calculate improvements
 *
 * Orchestrates complete simulation workflow:
 * 1. Run baseline (current state) simulation
 * 2. Run scenario (proposed changes) simulation
 * 3. Calculate improvement metrics
 *
 * @param {Object} vsmState - Current VSM state
 * @param {Object} scenario - Scenario to compare
 * @param {number} workItemCount - Number of work items
 * @returns {Object} Comparison results with baseline, scenario, and improvements
 */
const runSimulationForScenario = (vsmState, scenario, workItemCount) => {
  const engine = createComparisonEngine(workItemCount)

  const baselineResults = engine.runBaseline(
    vsmState.steps,
    vsmState.connections
  )

  const scenarioResults = engine.runScenario(
    scenario.steps,
    scenario.connections
  )

  const improvements = engine.calculateImprovements(
    baselineResults,
    scenarioResults
  )

  return {
    baseline: baselineResults,
    scenario: scenarioResults,
    improvements,
  }
}

/**
 * SimulationService - Domain service that coordinates between VSM and Simulation domains
 * Decouples application logic from direct store orchestration
 */
export const createSimulationService = (runner = createSimulationRunner()) => {
  /**
   * Start a new simulation run
   */
  const startSimulation = () => {
    const vsmState = useVsmStore.getState()
    const simState = useSimulationStore.getState()

    const { steps, connections } = vsmState
    const { workItemCount } = simState

    if (steps.length === 0) return

    const initialState = initSimulation(steps, connections, { workItemCount })
    const firstStepId = steps[0]?.id
    const items = generateWorkItems(workItemCount, firstStepId)

    simState.updateWorkItems(items)
    simState.updateQueueSizes(initialState.queueSizesByStepId)
    simState.updateElapsedTime(0)
    simState.setDetectedBottlenecks([])
    simState.setResults(null)
    simState.setRunning(true)

    runner.start(initialState, steps, connections, {
      onTick: (newState) => {
        const simState = useSimulationStore.getState()
        simState.updateWorkItems(newState.workItems)
        simState.updateElapsedTime(newState.elapsedTime)
        simState.updateQueueSizes(newState.queueSizesByStepId)
        simState.setDetectedBottlenecks(newState.detectedBottlenecks)

        newState.queueHistory.forEach((entry) => {
          simState.addQueueHistoryEntry(entry)
        })
      },
      onComplete: (finalResults) => {
        const simState = useSimulationStore.getState()
        simState.setRunning(false)
        simState.setResults(finalResults)
      },
    })
  }

  /**
   * Pause the running simulation
   */
  const pauseSimulation = () => {
    const simState = useSimulationStore.getState()
    simState.setPaused(true)
    runner.pause()
  }

  /**
   * Resume a paused simulation
   */
  const resumeSimulation = () => {
    const simState = useSimulationStore.getState()
    simState.setPaused(false)
    simState.setRunning(true)
    runner.resume()
  }

  /**
   * Stop and reset the simulation
   */
  const resetSimulation = () => {
    runner.stop()
    const simState = useSimulationStore.getState()
    simState.reset()
  }

  /**
   * Create a new scenario from current VSM state
   */
  const createScenario = () => {
    const vsmState = useVsmStore.getState()
    const simState = useSimulationStore.getState()

    const scenario = {
      id: crypto.randomUUID(),
      name: `Scenario ${simState.scenarios.length + 1}`,
      steps: vsmState.steps.map((s) => ({ ...s })),
      connections: vsmState.connections.map((c) => ({ ...c })),
      results: null,
    }

    simState.addScenario(scenario)
    return scenario
  }

  /**
   * Run comparison between baseline and scenario
   */
  const runComparison = (scenarioId) => {
    const vsmState = useVsmStore.getState()
    const simState = useSimulationStore.getState()

    const scenario = simState.scenarios.find((s) => s.id === scenarioId)
    if (!scenario) return

    const results = runSimulationForScenario(
      vsmState,
      scenario,
      simState.workItemCount
    )

    simState.setComparisonResults(results)
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
