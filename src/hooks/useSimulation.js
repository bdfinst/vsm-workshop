import { useSimulationControls } from './useSimulationControls'
import { useScenarioManager } from './useScenarioManager'
import { useSimulationState } from './useSimulationState'

/**
 * Main simulation hook - manages simulation lifecycle
 *
 * Composition hook that combines:
 * - useSimulationControls: Control state (isRunning, speed, start/pause/stop)
 * - useSimulationState: Runtime state (workItems, queues, results)
 * - useScenarioManager: Scenario comparison management
 *
 * This is the primary hook for simulation functionality.
 * Use in simulation-related components.
 *
 * @returns {Object} Combined simulation controls, state, and scenario management
 * @returns {boolean} returns.isRunning - Whether simulation is active
 * @returns {boolean} returns.isPaused - Whether simulation is paused
 * @returns {number} returns.speed - Simulation speed multiplier
 * @returns {Function} returns.start - Start simulation with config
 * @returns {Function} returns.pause - Pause/unpause simulation
 * @returns {Function} returns.stop - Stop simulation
 * @returns {Function} returns.reset - Reset all simulation state
 * @returns {Array} returns.workItems - Current work items in simulation
 * @returns {Object} returns.results - Simulation results after completion
 * @returns {Array} returns.scenarios - Saved scenarios for comparison
 *
 * @example
 * function SimulationPanel() {
 *   const {
 *     isRunning,
 *     start,
 *     pause,
 *     stop,
 *     results
 *   } = useSimulation()
 *
 *   const handleStart = () => {
 *     start({
 *       workItemCount: 10,
 *       maxTicks: 1000
 *     })
 *   }
 *
 *   return (
 *     <div>
 *       <button onClick={handleStart} disabled={isRunning}>
 *         Start
 *       </button>
 *       <button onClick={pause} disabled={!isRunning}>
 *         {isPaused ? 'Resume' : 'Pause'}
 *       </button>
 *       {results && <SimulationResults data={results} />}
 *     </div>
 *   )
 * }
 *
 * @see {@link ./useSimulationControls.js}
 * @see {@link ./useSimulationState.js}
 * @see {@link ./useScenarioManager.js}
 */
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
