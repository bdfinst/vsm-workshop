import {
  initSimulation,
  generateWorkItems,
  processTick,
  calculateResults,
} from './simulationEngine'

/**
 * ComparisonEngine handles scenario comparison logic
 * Separates concerns: baseline run, scenario run, and comparison calculation
 */
export class ComparisonEngine {
  constructor(workItemCount) {
    this.workItemCount = workItemCount
    this.maxTicks = 10000
  }

  /**
   * Run baseline simulation with current VSM configuration
   * @param {Array} steps - Baseline process steps
   * @param {Array} connections - Baseline connections
   * @returns {Object} Simulation results
   */
  runBaseline(steps, connections) {
    return this._runSimulationToCompletion(steps, connections)
  }

  /**
   * Run scenario simulation with modified configuration
   * @param {Array} steps - Scenario process steps
   * @param {Array} connections - Scenario connections
   * @returns {Object} Simulation results
   */
  runScenario(steps, connections) {
    return this._runSimulationToCompletion(steps, connections)
  }

  /**
   * Calculate improvement metrics between baseline and scenario
   * @param {Object} baselineResults - Baseline simulation results
   * @param {Object} scenarioResults - Scenario simulation results
   * @returns {Object} Improvement percentages
   */
  calculateImprovements(baselineResults, scenarioResults) {
    const leadTimeImprovement = this._calculatePercentageChange(
      baselineResults.avgLeadTime,
      scenarioResults.avgLeadTime,
      'decrease'
    )

    const throughputImprovement = this._calculatePercentageChange(
      baselineResults.throughput,
      scenarioResults.throughput,
      'increase'
    )

    return {
      leadTime: leadTimeImprovement,
      throughput: throughputImprovement,
    }
  }

  /**
   * Run a simulation to completion
   * @private
   * @param {Array} steps - Process steps
   * @param {Array} connections - Step connections
   * @returns {Object} Simulation results
   */
  _runSimulationToCompletion(steps, connections) {
    const initialState = initSimulation(steps, connections, {
      workItemCount: this.workItemCount,
    })
    initialState.workItems = generateWorkItems(
      this.workItemCount,
      steps[0]?.id
    )
    initialState.isRunning = true

    let state = initialState
    let ticks = 0

    while (
      state.completedCount < this.workItemCount &&
      ticks < this.maxTicks
    ) {
      state = processTick(state, steps, connections)
      ticks++
    }

    return calculateResults(state, steps)
  }

  /**
   * Calculate percentage change between two values
   * @private
   * @param {number} baseline - Baseline value
   * @param {number} scenario - Scenario value
   * @param {string} direction - 'increase' or 'decrease' for positive improvement
   * @returns {number} Percentage change
   */
  _calculatePercentageChange(baseline, scenario, direction) {
    if (baseline === 0) return 0

    const change = scenario - baseline
    const percentageChange = (change / baseline) * 100

    return direction === 'decrease' ? -percentageChange : percentageChange
  }
}
