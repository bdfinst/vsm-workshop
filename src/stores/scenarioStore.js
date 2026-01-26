import { create } from 'zustand'

/**
 * Store for scenario management (what-if scenarios and comparisons)
 */
export const useScenarioStore = create((set) => ({
  // What-if scenarios
  scenarios: [],
  activeScenarioId: null,
  comparisonResults: null,

  // Actions
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

  reset: () => {
    set({
      scenarios: [],
      activeScenarioId: null,
      comparisonResults: null,
    })
  },
}))
