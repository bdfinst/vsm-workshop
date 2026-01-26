import { create } from 'zustand'

/**
 * Store for simulation control state (isRunning, isPaused, speed)
 */
export const useSimulationControlStore = create((set, get) => ({
  // Control state
  isRunning: false,
  isPaused: false,
  speed: 1.0,

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

  reset: () => {
    set({
      isRunning: false,
      isPaused: false,
    })
  },
}))
