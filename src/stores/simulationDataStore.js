import { create } from 'zustand'

/**
 * Store for simulation data (work items, queues, metrics, bottlenecks)
 */
export const useSimulationDataStore = create((set, get) => ({
  // Work items
  workItemCount: 10,
  workItems: [],

  // Live metrics
  completedCount: 0,
  elapsedTime: 0,
  queueSizesByStepId: {},
  queueHistory: [],

  // Bottlenecks
  detectedBottlenecks: [],

  // Results
  results: null,

  // Actions
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

  updateQueueSizes: (queueSizesByStepId) => {
    set({ queueSizesByStepId })
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
      workItems: [],
      completedCount: 0,
      elapsedTime: 0,
      queueSizesByStepId: {},
      queueHistory: [],
      detectedBottlenecks: [],
      results: null,
      workItemCount, // Preserve this setting
    })
  },
}))
