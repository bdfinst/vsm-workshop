/**
 * Simulation Control Store - Svelte 5 Runes
 * Manages simulation control state (isRunning, isPaused, speed)
 * Not persisted (ephemeral state)
 */

/**
 * Create the simulation control store
 * @returns {Object} Simulation control store with reactive state and actions
 */
function createSimulationControlStore() {
  // Control state
  let isRunning = $state(false)
  let isPaused = $state(false)
  let speed = $state(1.0)

  return {
    // Reactive getters
    get isRunning() {
      return isRunning
    },
    get isPaused() {
      return isPaused
    },
    get speed() {
      return speed
    },

    // Actions
    setRunning(running) {
      isRunning = running
      if (running) {
        isPaused = false
      }
    },

    setPaused(paused) {
      isPaused = paused
      if (paused) {
        isRunning = false
      }
    },

    setSpeed(newSpeed) {
      // Clamp speed between 0.25 and 4.0
      speed = Math.min(4.0, Math.max(0.25, newSpeed))
    },

    setResumed() {
      isRunning = true
      isPaused = false
    },

    reset() {
      isRunning = false
      isPaused = false
      // Keep speed setting
    },
  }
}

// Export singleton instance
export const simControlStore = createSimulationControlStore()
