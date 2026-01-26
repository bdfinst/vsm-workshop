import { useSimulationControls } from './useSimulationControls'
import { useScenarioManager } from './useScenarioManager'
import { useSimulationState } from './useSimulationState'

export function useSimulation() {
  const controls = useSimulationControls()
  const scenarios = useScenarioManager()
  const state = useSimulationState()

  return {
    // Control state and actions
    ...controls,

    // Simulation state
    ...state,

    // Scenario management
    ...scenarios,
  }
}
