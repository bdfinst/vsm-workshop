/**
 * SimulationStateInitializer
 * Handles one-time setup for a simulation run: initializes engine state,
 * generates work items, and seeds the store.
 */

import {
  initSimulation,
  generateWorkItems,
} from '../utils/simulation/simulationEngine.js'

/**
 * Create a simulation state initializer
 * @param {Object} storeApi - Store API for reads/writes
 * @returns {Object} Initializer with initialize method
 */
export const createSimulationStateInitializer = (storeApi) => {
  /**
   * Initialize simulation state in stores and return engine initial state
   * @param {Array} steps - VSM steps
   * @param {Array} connections - VSM connections
   * @returns {Object} Initial simulation engine state
   */
  const initialize = (steps, connections) => {
    const workItemCount = storeApi.getWorkItemCount()
    const initialState = initSimulation(steps, connections, { workItemCount })
    const firstStepId = steps[0]?.id
    const items = generateWorkItems(workItemCount, firstStepId)

    storeApi.updateWorkItems(items)
    storeApi.updateQueueSizes(initialState.queueSizesByStepId)
    storeApi.updateElapsedTime(0)
    storeApi.setDetectedBottlenecks([])
    storeApi.setResults(null)

    return initialState
  }

  return { initialize }
}
