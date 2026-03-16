/**
 * SimulationOrchestrator
 * Manages simulation lifecycle: start, pause, resume, reset, cleanup.
 * Delegates initialization to SimulationStateInitializer.
 */

/**
 * Create a simulation orchestrator
 * @param {Object} runner - Simulation runner (animation loop)
 * @param {Object} storeApi - Store API for reads/writes
 * @param {Object} initializer - SimulationStateInitializer instance
 * @returns {Object} Orchestrator methods
 */
export const createSimulationOrchestrator = (runner, storeApi, initializer) => {
  const HISTORY_FLUSH_INTERVAL = 5

  /**
   * Start a new simulation run
   */
  const startSimulation = () => {
    if (storeApi.getIsRunning()) return

    const steps = storeApi.getSteps()
    const connections = storeApi.getConnections()

    if (steps.length === 0) return

    storeApi.setRunning(true)

    const initialState = initializer.initialize(steps, connections)

    let tickCount = 0
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
    cleanup,
  }
}
