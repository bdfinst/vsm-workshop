/**
 * Scenario Store - Svelte 5 Runes
 * Manages what-if scenarios and comparison results
 * Not persisted (ephemeral state)
 */

/**
 * @typedef {import('../types/index.js').Scenario} Scenario
 */

/**
 * Create the scenario store
 * @returns {Object} Scenario store with reactive state and actions
 */
function createScenarioStore() {
  // Scenarios list
  let scenarios = $state([])

  // Active scenario for editing/running
  let activeScenarioId = $state(null)

  // Comparison results between baseline and scenarios
  let comparisonResults = $state(null)

  return {
    // Reactive getters
    get scenarios() {
      return [...scenarios]
    },
    get activeScenarioId() {
      return activeScenarioId
    },
    get comparisonResults() {
      return comparisonResults
    },

    // Derived getters
    get activeScenario() {
      return scenarios.find((s) => s.id === activeScenarioId) || null
    },

    // Actions
    addScenario(scenario) {
      scenarios = [...scenarios, scenario]
    },

    removeScenario(scenarioId) {
      scenarios = scenarios.filter((s) => s.id !== scenarioId)
      if (activeScenarioId === scenarioId) {
        activeScenarioId = null
      }
    },

    renameScenario(scenarioId, name) {
      const trimmed = typeof name === 'string' ? name.trim() : ''
      if (!trimmed) return
      scenarios = scenarios.map((s) =>
        s.id === scenarioId ? { ...s, name: trimmed } : s
      )
    },

    updateScenario(scenarioId, updates) {
      scenarios = scenarios.map((s) =>
        s.id === scenarioId ? { ...s, ...updates } : s
      )
    },

    setActiveScenario(scenarioId) {
      activeScenarioId = scenarioId
    },

    setComparisonResults(results) {
      comparisonResults = results
    },

    clearComparison() {
      comparisonResults = null
      activeScenarioId = null
    },

    reset() {
      scenarios = []
      activeScenarioId = null
      comparisonResults = null
    },
  }
}

// Export singleton instance
export const scenarioStore = createScenarioStore()
