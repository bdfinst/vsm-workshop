import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createStep } from '../models/StepFactory.js'
import { createConnection } from '../models/ConnectionFactory.js'
import { calculateAllMetrics } from '../utils/calculations/metrics.js'

export const useVsmDataStore = create(
  persist(
    (set, get) => ({
      // VSM Data
      id: null,
      name: '',
      description: '',
      steps: [],
      connections: [],
      createdAt: null,
      updatedAt: null,

      // Map-level Actions
      createNewMap: (name) => {
        const now = new Date().toISOString()
        set({
          id: crypto.randomUUID(),
          name,
          description: '',
          steps: [],
          connections: [],
          createdAt: now,
          updatedAt: now,
        })
      },

      updateMapName: (name) => {
        set({
          name,
          updatedAt: new Date().toISOString(),
        })
      },

      updateMapDescription: (description) => {
        set({
          description,
          updatedAt: new Date().toISOString(),
        })
      },

      loadMap: (mapData) => {
        set({
          ...mapData,
        })
      },

      clearMap: () => {
        set({
          id: null,
          name: '',
          description: '',
          steps: [],
          connections: [],
          createdAt: null,
          updatedAt: null,
        })
      },

      // Step CRUD
      addStep: (name = 'New Step', overrides = {}) => {
        const { steps } = get()
        const newStep = createStep(name, overrides)
        set({
          steps: [...steps, newStep],
          updatedAt: new Date().toISOString(),
        })
        return newStep
      },

      updateStep: (stepId, updates) => {
        const { steps } = get()
        set({
          steps: steps.map((step) =>
            step.id === stepId ? { ...step, ...updates } : step
          ),
          updatedAt: new Date().toISOString(),
        })
      },

      deleteStep: (stepId) => {
        const { steps, connections } = get()
        set({
          steps: steps.filter((step) => step.id !== stepId),
          connections: connections.filter(
            (conn) => conn.source !== stepId && conn.target !== stepId
          ),
          updatedAt: new Date().toISOString(),
        })
      },

      updateStepPosition: (stepId, position) => {
        const { steps } = get()
        set({
          steps: steps.map((step) =>
            step.id === stepId ? { ...step, position } : step
          ),
        })
      },

      // Connection CRUD
      addConnection: (source, target, type = 'forward', reworkRate = 0) => {
        const { connections } = get()
        const existingConnection = connections.find(
          (c) => c.source === source && c.target === target
        )
        if (existingConnection) return null

        const newConnection = createConnection(source, target, type, reworkRate)
        set({
          connections: [...connections, newConnection],
          updatedAt: new Date().toISOString(),
        })
        return newConnection
      },

      updateConnection: (connectionId, updates) => {
        const { connections } = get()
        set({
          connections: connections.map((conn) =>
            conn.id === connectionId ? { ...conn, ...updates } : conn
          ),
          updatedAt: new Date().toISOString(),
        })
      },

      deleteConnection: (connectionId) => {
        const { connections } = get()
        set({
          connections: connections.filter((conn) => conn.id !== connectionId),
          updatedAt: new Date().toISOString(),
        })
      },
    }),
    {
      name: 'vsm-data-storage',
    }
  )
)

/**
 * Selector for pre-calculated metrics
 * Decouples metric calculation logic from components
 * @param {Object} state - Zustand state
 * @returns {Object} Calculated metrics
 */
export const selectMetrics = (state) =>
  calculateAllMetrics(state.steps, state.connections)
