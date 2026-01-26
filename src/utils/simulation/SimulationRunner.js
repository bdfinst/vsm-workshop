import {
  processTick,
  calculateResults,
} from './simulationEngine'

/**
 * Independent animation loop manager for VSM simulation
 * Decoupled from React lifecycle for better testability and control
 */
export class SimulationRunner {
  constructor() {
    this.animationFrameId = null
    this.stateRef = null
    this.callbacks = {
      onTick: null,
      onComplete: null,
    }
  }

  /**
   * Start the animation loop
   * @param {Object} initialState - Initial simulation state
   * @param {Array} steps - VSM steps
   * @param {Array} connections - VSM connections
   * @param {Object} callbacks - { onTick, onComplete }
   */
  start(initialState, steps, connections, callbacks) {
    this.stateRef = initialState
    this.steps = steps
    this.connections = connections
    this.callbacks = callbacks
    this.isRunning = true
    this.isPaused = false

    this.animate()
  }

  /**
   * Pause the animation loop
   */
  pause() {
    this.isPaused = true
  }

  /**
   * Resume the animation loop
   */
  resume() {
    this.isPaused = false
    this.animate()
  }

  /**
   * Stop and cleanup the animation loop
   */
  stop() {
    this.isRunning = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  /**
   * Animation loop function
   */
  animate = () => {
    if (!this.isRunning || this.isPaused) {
      return
    }

    const currentState = {
      ...this.stateRef,
      queueHistory: [],
    }

    const newState = processTick(currentState, this.steps, this.connections)

    // Notify tick callback
    if (this.callbacks.onTick) {
      this.callbacks.onTick(newState)
    }

    // Check if simulation is complete
    if (newState.completedCount >= newState.workItemCount) {
      this.isRunning = false
      const finalResults = calculateResults(newState, this.steps)

      if (this.callbacks.onComplete) {
        this.callbacks.onComplete(finalResults)
      }
      return
    }

    // Update state ref for next frame
    this.stateRef = newState

    this.animationFrameId = requestAnimationFrame(this.animate)
  }
}
