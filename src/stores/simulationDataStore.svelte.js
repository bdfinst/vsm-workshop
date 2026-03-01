/**
 * Simulation Data Store - Svelte 5 Runes
 * Stores work items, queues, metrics, and bottleneck detection
 * Not persisted (ephemeral state)
 */

/**
 * @typedef {import('../types/index.js').WorkItem} WorkItem
 * @typedef {import('../types/index.js').SimulationResults} SimulationResults
 */

/**
 * Create the simulation data store
 * @returns {Object} Simulation data store with reactive state and actions
 */
function createSimulationDataStore() {
  // Work items configuration
  let workItemCount = $state(10)

  // Live simulation data
  let workItems = $state([])
  let completedCount = $state(0)
  let elapsedTime = $state(0)
  let queueSizesByStepId = $state({})
  let queueHistory = $state([])

  // Bottleneck detection
  let detectedBottlenecks = $state([])

  // Final results
  let results = $state(null)

  return {
    // Reactive getters
    get workItemCount() {
      return workItemCount
    },
    get workItems() {
      return workItems
    },
    get completedCount() {
      return completedCount
    },
    get elapsedTime() {
      return elapsedTime
    },
    get queueSizesByStepId() {
      return queueSizesByStepId
    },
    get queueHistory() {
      return queueHistory
    },
    get detectedBottlenecks() {
      return detectedBottlenecks
    },
    get results() {
      return results
    },

    // Actions
    setWorkItemCount(count) {
      workItemCount = Math.max(0, count)
    },

    updateWorkItems(items) {
      workItems = items
    },

    incrementCompletedCount() {
      completedCount = completedCount + 1
    },

    setCompletedCount(count) {
      completedCount = count
    },

    updateElapsedTime(time) {
      elapsedTime = time
    },

    updateQueueSizes(sizes) {
      queueSizesByStepId = sizes
    },

    addQueueHistoryEntry(entry) {
      queueHistory = [...queueHistory, entry]
    },

    addQueueHistoryBatch(entries) {
      if (entries.length === 0) return
      queueHistory = queueHistory.concat(entries)
    },

    setDetectedBottlenecks(bottlenecks) {
      detectedBottlenecks = bottlenecks
    },

    setResults(newResults) {
      results = newResults
    },

    reset() {
      // Preserve workItemCount setting
      workItems = []
      completedCount = 0
      elapsedTime = 0
      queueSizesByStepId = {}
      queueHistory = []
      detectedBottlenecks = []
      results = null
    },
  }
}

// Export singleton instance
export const simDataStore = createSimulationDataStore()
