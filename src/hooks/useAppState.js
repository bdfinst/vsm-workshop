import { useVsmStore } from '../stores/vsmStore'
import { useSimulation } from './useSimulation'

/**
 * Aggregates application state from multiple stores
 * Provides a facade to isolate App component from store implementation details
 * @returns {Object} Aggregated application state
 */
export function useAppState() {
  const {
    id,
    selectedStepId,
    isEditing,
    setEditing,
    clearSelection,
    selectedConnectionId,
    isEditingConnection,
    clearConnectionSelection,
  } = useVsmStore()

  const { results, scenarios, comparisonResults } = useSimulation()

  return {
    // VSM state
    hasVsm: Boolean(id),
    selectedStepId,
    isEditing,
    setEditing,
    clearSelection,
    selectedConnectionId,
    isEditingConnection,
    clearConnectionSelection,

    // Simulation state
    simulationResults: results,
    simulationScenarios: scenarios,
    comparisonResults,
  }
}
