import {
  initSimulation,
  generateWorkItems,
  runSimulationToCompletion,
} from './simulationEngine'

/**
 * Calculate percentage change between two values
 * @param {number} baseline - Baseline value
 * @param {number} scenario - Scenario value
 * @param {string} direction - 'increase' or 'decrease' for positive improvement
 * @returns {number} Percentage change
 */
const calculatePercentageChange = (baseline, scenario, direction) => {
  if (baseline === 0) return 0

  const change = scenario - baseline
  const percentageChange = (change / baseline) * 100

  return direction === 'decrease' ? -percentageChange : percentageChange
}

/**
 * ComparisonEngine handles scenario comparison logic
 * Separates concerns: baseline run, scenario run, and comparison calculation
 */
export const createComparisonEngine = (workItemCount) => {
  /**
   * Run a simulation to completion with given parameters
   * @param {Array} steps - Process steps
   * @param {Array} connections - Step connections
   * @returns {Object} Simulation results
   */
  const runSimulation = (steps, connections) => {
    const initialState = initSimulation(steps, connections, { workItemCount })
    const stateWithItems = {
      ...initialState,
      workItems: generateWorkItems(workItemCount, steps[0]?.id),
    }
    const finalState = runSimulationToCompletion(stateWithItems, steps, connections)
    return finalState.results
  }

  /**
   * Run baseline simulation with current VSM configuration
   * @param {Array} steps - Baseline process steps
   * @param {Array} connections - Baseline connections
   * @returns {Object} Simulation results
   */
  const runBaseline = (steps, connections) => {
    return runSimulation(steps, connections)
  }

  /**
   * Run scenario simulation with modified configuration
   * @param {Array} steps - Scenario process steps
   * @param {Array} connections - Scenario connections
   * @returns {Object} Simulation results
   */
  const runScenario = (steps, connections) => {
    return runSimulation(steps, connections)
  }

  /**
   * Calculate improvement metrics between baseline and scenario
   * @param {Object} baselineResults - Baseline simulation results
   * @param {Object} scenarioResults - Scenario simulation results
   * @returns {Object} Improvement percentages
   */
  const calculateImprovements = (baselineResults, scenarioResults) => {
    const leadTimeImprovement = calculatePercentageChange(
      baselineResults.avgLeadTime,
      scenarioResults.avgLeadTime,
      'decrease'
    )

    const throughputImprovement = calculatePercentageChange(
      baselineResults.throughput,
      scenarioResults.throughput,
      'increase'
    )

    return {
      leadTime: leadTimeImprovement,
      throughput: throughputImprovement,
    }
  }

  return {
    runBaseline,
    runScenario,
    calculateImprovements,
  }
}
