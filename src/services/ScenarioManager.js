/**
 * ScenarioManager
 * Manages what-if scenario creation and comparison.
 */

import { createComparisonEngine } from '../utils/simulation/ComparisonEngine.js'

const SCENARIO_NAME_PREFIX = 'Scenario'

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
 * Create a scenario manager
 * @param {Object} storeApi - Store API for reads/writes
 * @returns {Object} Scenario manager methods
 */
export const createScenarioManager = (storeApi) => {
  /**
   * Create a new scenario from current VSM state
   */
  const createScenario = () => {
    const steps = storeApi.getSteps()
    const connections = storeApi.getConnections()
    const scenarios = storeApi.getScenarios()

    const scenario = {
      id: crypto.randomUUID(),
      name: `${SCENARIO_NAME_PREFIX} ${scenarios.length + 1}`,
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

  return { createScenario, runComparison }
}
