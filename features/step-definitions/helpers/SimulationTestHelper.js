import { simControlStore, simDataStore, scenarioStore } from './testStores.js'
import * as simEngine from '../../../src/utils/simulation/simulationEngine.js'

export const createSimulationTestHelper = (vsmHelper) => {
  const controlStore = simControlStore
  const dataStore = simDataStore
  const engine = simEngine

  return {
    get state() {
      return {
        // Control state
        isRunning: controlStore.isRunning,
        isPaused: controlStore.isPaused,
        speed: controlStore.speed,

        // Data state
        workItemCount: dataStore.workItemCount,
        workItems: dataStore.workItems,
        completedCount: dataStore.completedCount,
        elapsedTime: dataStore.elapsedTime,
        queueSizesByStepId: dataStore.queueSizesByStepId,
        queueHistory: dataStore.queueHistory,
        detectedBottlenecks: dataStore.detectedBottlenecks,
        results: dataStore.results,

        // Scenario state
        scenarios: scenarioStore.scenarios,
        activeScenarioId: scenarioStore.activeScenarioId,
        comparisonResults: scenarioStore.comparisonResults,

        // Actions
        setRunning: (running) => controlStore.setRunning(running),
        setPaused: (paused) => controlStore.setPaused(paused),
        setSpeed: (speed) => controlStore.setSpeed(speed),
        setWorkItemCount: (count) => dataStore.setWorkItemCount(count),
        updateWorkItems: (items) => dataStore.updateWorkItems(items),
        incrementCompletedCount: () => dataStore.incrementCompletedCount(),
        updateElapsedTime: (time) => dataStore.updateElapsedTime(time),
        updateQueueSizes: (sizes) => dataStore.updateQueueSizes(sizes),
        addQueueHistoryEntry: (entry) => dataStore.addQueueHistoryEntry(entry),
        setDetectedBottlenecks: (bottlenecks) =>
          dataStore.setDetectedBottlenecks(bottlenecks),
        setResults: (results) => dataStore.setResults(results),
        reset: () => {
          controlStore.reset()
          dataStore.reset()
        },
        addScenario: (scenario) => scenarioStore.addScenario(scenario),
        removeScenario: (id) => scenarioStore.removeScenario(id),
        setActiveScenario: (id) => scenarioStore.setActiveScenario(id),
        setComparisonResults: (results) =>
          scenarioStore.setComparisonResults(results),
      }
    },

    initSimulation() {
      const steps = vsmHelper.dataStore.steps
      const connections = vsmHelper.dataStore.connections
      const config = { workItemCount: dataStore.workItemCount }
      const initialState = engine.initSimulation(steps, connections, config)

      dataStore.updateWorkItems(initialState.workItems || [])
      dataStore.updateQueueSizes(initialState.queueSizesByStepId || {})
      if (initialState.elapsedTime !== undefined) {
        dataStore.updateElapsedTime(initialState.elapsedTime)
      }
    },

    generateWorkItems(count) {
      const firstStep = vsmHelper.dataStore.steps[0]
      return engine.generateWorkItems(count, firstStep?.id)
    },

    processTick() {
      const currentState = {
        workItems: dataStore.workItems,
        workItemCount: dataStore.workItemCount,
        queueSizesByStepId: dataStore.queueSizesByStepId,
        completedCount: dataStore.completedCount,
        elapsedTime: dataStore.elapsedTime,
        queueHistory: dataStore.queueHistory,
        speed: controlStore.speed,
        isPaused: controlStore.isPaused,
      }
      const steps = vsmHelper.dataStore.steps
      const connections = vsmHelper.dataStore.connections

      const newState = engine.processTick(currentState, steps, connections)

      dataStore.updateWorkItems(newState.workItems || [])
      dataStore.updateQueueSizes(newState.queueSizesByStepId || {})
      if (newState.completedCount !== undefined) {
        dataStore.setCompletedCount(newState.completedCount)
      }
      if (newState.elapsedTime !== undefined) {
        dataStore.updateElapsedTime(newState.elapsedTime)
      }
    },

    detectBottlenecks() {
      const steps = vsmHelper.dataStore.steps
      const queueSizes = dataStore.queueSizesByStepId
      const bottlenecks = engine.detectBottlenecks(steps, queueSizes)
      dataStore.setDetectedBottlenecks(bottlenecks)
    },

    runSimulationToCompletion(maxTicks = 10000) {
      const currentState = {
        workItems: dataStore.workItems,
        workItemCount: dataStore.workItemCount,
        queueSizesByStepId: dataStore.queueSizesByStepId,
        completedCount: dataStore.completedCount,
        elapsedTime: dataStore.elapsedTime,
        queueHistory: dataStore.queueHistory,
        speed: controlStore.speed,
        isPaused: false,
      }
      const steps = vsmHelper.dataStore.steps
      const connections = vsmHelper.dataStore.connections

      const finalState = engine.runSimulationToCompletion(
        currentState,
        steps,
        connections,
        maxTicks
      )

      if (finalState.completedCount < currentState.workItemCount) {
        console.warn(
          `Simulation hit maxTicks limit (${maxTicks}). Only ${finalState.completedCount}/${currentState.workItemCount} items completed. ` +
            `Consider increasing maxTicks or checking for simulation deadlock.`
        )
      }

      dataStore.updateWorkItems(finalState.workItems || [])
      dataStore.updateQueueSizes(finalState.queueSizesByStepId || {})
      if (finalState.completedCount !== undefined) {
        dataStore.setCompletedCount(finalState.completedCount)
      }
      if (finalState.elapsedTime !== undefined) {
        dataStore.updateElapsedTime(finalState.elapsedTime)
      }
      if (finalState.detectedBottlenecks !== undefined) {
        dataStore.setDetectedBottlenecks(finalState.detectedBottlenecks)
      }
      if (finalState.queueHistory !== undefined) {
        dataStore.setQueueHistory(finalState.queueHistory)
      }
      if (finalState.results !== undefined) {
        dataStore.setResults(finalState.results)
      }
    },

    resetSimulation() {
      controlStore.reset()
      dataStore.reset()
    },

    createScenario() {
      const steps = vsmHelper.dataStore.steps
      const connections = vsmHelper.dataStore.connections
      const scenario = {
        id: crypto.randomUUID(),
        name: `Scenario ${scenarioStore.scenarios.length + 1}`,
        steps: steps.map((s) => ({ ...s })),
        connections: connections.map((c) => ({ ...c })),
        saved: false,
      }
      scenarioStore.addScenario(scenario)
      return scenario
    },

    clearAll() {
      controlStore.reset()
      dataStore.reset()
      scenarioStore.reset()
    },
  }
}
