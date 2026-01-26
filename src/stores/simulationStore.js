/**
 * Compatibility wrapper for legacy simulation store
 *
 * This file has been refactored to address the large API surface issue.
 * The original 25+ properties have been properly separated into focused stores:
 * - useSimulationControlStore: UI control state (isRunning, isPaused, speed)
 * - useSimulationDataStore: Simulation domain state (workItems, queues, results)
 * - useScenarioStore: Scenario management
 *
 * This wrapper is maintained for backward compatibility only.
 * @deprecated Use the separated stores directly in new code.
 */

import { useSimulationControlStore } from './simulationControlStore'
import { useSimulationDataStore } from './simulationDataStore'
import { useScenarioStore } from './scenarioStore'

/**
 * @deprecated Use the separated stores instead
 * Legacy wrapper that delegates to properly separated stores
 */
export const useSimulationStore = () => {
  const controlStore = useSimulationControlStore()
  const dataStore = useSimulationDataStore()
  const scenarioStore = useScenarioStore()

  return {
    // Control state (from controlStore)
    isRunning: controlStore.isRunning,
    isPaused: controlStore.isPaused,
    speed: controlStore.speed,
    setRunning: controlStore.setRunning,
    setPaused: controlStore.setPaused,
    setSpeed: controlStore.setSpeed,

    // Simulation data (from dataStore)
    workItemCount: dataStore.workItemCount,
    workItems: dataStore.workItems,
    completedCount: dataStore.completedCount,
    elapsedTime: dataStore.elapsedTime,
    queueSizesByStepId: dataStore.queueSizesByStepId,
    queueHistory: dataStore.queueHistory,
    detectedBottlenecks: dataStore.detectedBottlenecks,
    results: dataStore.results,
    setWorkItemCount: dataStore.setWorkItemCount,
    // updateWorkItems and updateQueueSizes removed - internal simulation state should only be modified through domain operations like processTick()
    incrementCompletedCount: dataStore.incrementCompletedCount,
    updateElapsedTime: dataStore.updateElapsedTime,
    addQueueHistoryEntry: dataStore.addQueueHistoryEntry,
    setDetectedBottlenecks: dataStore.setDetectedBottlenecks,
    setResults: dataStore.setResults,
    reset: () => {
      controlStore.reset()
      dataStore.reset()
    },

    // Scenarios (from scenarioStore)
    scenarios: scenarioStore.scenarios,
    activeScenarioId: scenarioStore.activeScenarioId,
    comparisonResults: scenarioStore.comparisonResults,
    addScenario: scenarioStore.addScenario,
    removeScenario: scenarioStore.removeScenario,
    updateScenario: scenarioStore.updateScenario,
    setActiveScenario: scenarioStore.setActiveScenario,
    setComparisonResults: scenarioStore.setComparisonResults,
    clearComparison: scenarioStore.clearComparison,
  }
}

// Re-export the separated stores for new code
export { useSimulationControlStore } from './simulationControlStore'
export { useSimulationDataStore } from './simulationDataStore'
export { useScenarioStore } from './scenarioStore'
