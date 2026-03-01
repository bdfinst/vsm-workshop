import { processTick, calculateResults } from './simulationEngine'

/**
 * Independent animation loop manager for VSM simulation
 * Decoupled from UI lifecycle for better testability and control
 */
export const createSimulationRunner = () => {
  let animationFrameId = null
  let stateRef = null
  let steps = null
  let connections = null
  let callbacks = {
    onTick: null,
    onComplete: null,
  }
  let isRunning = false
  let isPaused = false

  /**
   * Animation loop function
   */
  const animate = () => {
    if (!isRunning || isPaused) {
      return
    }

    const currentState = {
      ...stateRef,
      queueHistory: [],
    }

    const newState = processTick(currentState, steps, connections)

    // Notify tick callback
    if (callbacks.onTick) {
      callbacks.onTick(newState)
    }

    // Check if simulation is complete
    if (newState.completedCount >= newState.workItemCount) {
      isRunning = false
      const finalResults = calculateResults(newState, steps)

      if (callbacks.onComplete) {
        callbacks.onComplete(finalResults)
      }
      return
    }

    // Update state ref for next frame
    stateRef = newState

    animationFrameId = requestAnimationFrame(animate)
  }

  /**
   * Start the animation loop
   * @param {Object} initialState - Initial simulation state
   * @param {Array} newSteps - VSM steps
   * @param {Array} newConnections - VSM connections
   * @param {Object} newCallbacks - { onTick, onComplete }
   */
  const start = (initialState, newSteps, newConnections, newCallbacks) => {
    // Cancel any existing animation loop before starting a new one
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    stateRef = initialState
    steps = newSteps
    connections = newConnections
    callbacks = newCallbacks
    isRunning = true
    isPaused = false

    animate()
  }

  /**
   * Pause the animation loop
   */
  const pause = () => {
    isPaused = true
  }

  /**
   * Resume the animation loop
   */
  const resume = () => {
    // Cancel any pending frame to prevent duplicate loops
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    isPaused = false
    animate()
  }

  /**
   * Stop and cleanup the animation loop
   */
  const stop = () => {
    isRunning = false
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  return {
    start,
    pause,
    resume,
    stop,
  }
}
