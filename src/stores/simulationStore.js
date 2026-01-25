import { create } from 'zustand'

export const useSimulationStore = create((set, get) => ({
  // Control state
  isRunning: false,
  isPaused: false,
  speed: 1.0,

  // Work items
  workItemCount: 10,
  workItems: [],

  // Live metrics
  completedCount: 0,
  elapsedTime: 0,
  queueSizes: {},
  queueHistory: [],

  // Bottlenecks
  detectedBottlenecks: [],

  // Results
  results: null,

  // What-if scenarios
  scenarios: [],
  activeScenarioId: null,
  comparisonResults: null,

  // Actions
  setRunning: (isRunning) => {
    set({
      isRunning,
      isPaused: isRunning ? false : get().isPaused,
    })
  },

  setPaused: (isPaused) => {
    set({
      isPaused,
      isRunning: isPaused ? false : get().isRunning,
    })
  },

  setSpeed: (speed) => {
    const clampedSpeed = Math.min(4.0, Math.max(0.25, speed))
    set({ speed: clampedSpeed })
  },

  setWorkItemCount: (count) => {
    set({ workItemCount: Math.max(0, count) })
  },

  updateWorkItems: (workItems) => {
    set({ workItems })
  },

  incrementCompletedCount: () => {
    set((state) => ({ completedCount: state.completedCount + 1 }))
  },

  updateElapsedTime: (elapsedTime) => {
    set({ elapsedTime })
  },

  updateQueueSizes: (queueSizes) => {
    set({ queueSizes })
  },

  addQueueHistoryEntry: (entry) => {
    set((state) => ({
      queueHistory: [...state.queueHistory, entry],
    }))
  },

  setDetectedBottlenecks: (bottlenecks) => {
    set({ detectedBottlenecks: bottlenecks })
  },

  setResults: (results) => {
    set({ results })
  },

  reset: () => {
    const { workItemCount } = get()
    set({
      isRunning: false,
      isPaused: false,
      workItems: [],
      completedCount: 0,
      elapsedTime: 0,
      queueSizes: {},
      queueHistory: [],
      detectedBottlenecks: [],
      results: null,
      workItemCount, // Preserve this setting
    })
  },

  // Scenario management
  addScenario: (scenario) => {
    set((state) => ({
      scenarios: [...state.scenarios, scenario],
    }))
  },

  removeScenario: (scenarioId) => {
    set((state) => ({
      scenarios: state.scenarios.filter((s) => s.id !== scenarioId),
      activeScenarioId:
        state.activeScenarioId === scenarioId ? null : state.activeScenarioId,
    }))
  },

  updateScenario: (scenarioId, updates) => {
    set((state) => ({
      scenarios: state.scenarios.map((s) =>
        s.id === scenarioId ? { ...s, ...updates } : s
      ),
    }))
  },

  setActiveScenario: (scenarioId) => {
    set({ activeScenarioId: scenarioId })
  },

  setComparisonResults: (comparisonResults) => {
    set({ comparisonResults })
  },

  clearComparison: () => {
    set({
      comparisonResults: null,
      activeScenarioId: null,
    })
  },
}))
