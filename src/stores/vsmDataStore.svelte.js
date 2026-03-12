// @ts-nocheck
/**
 * VSM Data Store - Svelte 5 Runes
 * Stores steps, connections, and map metadata
 * Persisted to localStorage
 * @file This file uses Svelte 5 runes ($state, etc.)
 */
import { createStep } from '../models/StepFactory.js'
import { createConnection } from '../models/ConnectionFactory.js'
import { calculateMetrics } from '../utils/calculations/metrics.js'
import {
  getPersistedValue,
  persistValue,
} from '../utils/persistedState.svelte.js'
import { CANVAS_START_X, CANVAS_STEP_SPACING, CANVAS_Y } from '../data/thresholds.js'
import { sanitizeVSMData } from '../utils/validation/vsmValidator.js'

const STORAGE_KEY = 'vsm-data-storage'

/**
 * @typedef {import('../types/index.js').Step} Step
 * @typedef {import('../types/index.js').Connection} Connection
 * @typedef {import('../types/index.js').ValueStreamMap} ValueStreamMap
 */

/**
 * Create the VSM data store
 * @returns {Object} VSM data store with reactive state and actions
 */
function createVsmDataStore() {
  const initialState = {
    id: null,
    name: '',
    description: '',
    steps: [],
    connections: [],
    createdAt: null,
    updatedAt: null,
  }

  // Load persisted state or use initial
  const persisted = getPersistedValue(STORAGE_KEY, initialState, sanitizeVSMData)

  // Reactive state using Svelte 5 $state rune
  let id = $state(persisted.id)
  let name = $state(persisted.name)
  let description = $state(persisted.description)
  let steps = $state(persisted.steps)
  let connections = $state(persisted.connections)
  let createdAt = $state(persisted.createdAt)
  let updatedAt = $state(persisted.updatedAt)

  // Persist on changes
  function persist() {
    persistValue(STORAGE_KEY, {
      id,
      name,
      description,
      steps,
      connections,
      createdAt,
      updatedAt,
    })
  }

  return {
    // Reactive getters
    get id() {
      return id
    },
    get name() {
      return name
    },
    get description() {
      return description
    },
    get steps() {
      return steps
    },
    get connections() {
      return connections
    },
    get createdAt() {
      return createdAt
    },
    get updatedAt() {
      return updatedAt
    },

    // Derived metrics
    get metrics() {
      return calculateMetrics(steps, connections)
    },

    // Map-level Actions
    createNewMap(mapName) {
      const now = new Date().toISOString()
      id = crypto.randomUUID()
      name = mapName
      description = ''
      steps = []
      connections = []
      createdAt = now
      updatedAt = now
      persist()
    },

    updateMapName(newName) {
      name = newName
      updatedAt = new Date().toISOString()
      persist()
    },

    updateMapDescription(newDescription) {
      description = newDescription
      updatedAt = new Date().toISOString()
      persist()
    },

    loadMap(mapData) {
      id = mapData.id
      name = mapData.name
      description = mapData.description || ''
      steps = mapData.steps || []
      connections = mapData.connections || []
      createdAt = mapData.createdAt
      updatedAt = mapData.updatedAt
      persist()
    },

    clearMap() {
      id = null
      name = ''
      description = ''
      steps = []
      connections = []
      createdAt = null
      updatedAt = null
      persist()
    },

    // Step CRUD
    addStep(stepName = 'New Step', overrides = {}) {
      // Auto-position steps horizontally if position not provided
      const position = overrides.position || {
        x: CANVAS_START_X + steps.length * CANVAS_STEP_SPACING,
        y: CANVAS_Y,
      }
      const newStep = createStep(stepName, { ...overrides, position })
      steps = [...steps, newStep]
      updatedAt = new Date().toISOString()
      persist()
      return newStep
    },

    updateStep(stepId, updates) {
      steps = steps.map((step) =>
        step.id === stepId ? { ...step, ...updates } : step
      )
      updatedAt = new Date().toISOString()
      persist()
    },

    deleteStep(stepId) {
      steps = steps.filter((step) => step.id !== stepId)
      connections = connections.filter(
        (conn) => conn.source !== stepId && conn.target !== stepId
      )
      updatedAt = new Date().toISOString()
      persist()
    },

    updateStepPosition(stepId, position) {
      steps = steps.map((step) =>
        step.id === stepId ? { ...step, position } : step
      )
      // Don't update updatedAt for position-only changes (drag operations)
      persist()
    },

    // Connection CRUD
    addConnection(source, target, type = 'forward', reworkRate = 0) {
      const existingConnection = connections.find(
        (c) => c.source === source && c.target === target
      )
      if (existingConnection) return null

      const newConnection = createConnection(source, target, type, reworkRate)
      connections = [...connections, newConnection]
      updatedAt = new Date().toISOString()
      persist()
      return newConnection
    },

    updateConnection(connectionId, updates) {
      connections = connections.map((conn) =>
        conn.id === connectionId ? { ...conn, ...updates } : conn
      )
      updatedAt = new Date().toISOString()
      persist()
    },

    deleteConnection(connectionId) {
      connections = connections.filter((conn) => conn.id !== connectionId)
      updatedAt = new Date().toISOString()
      persist()
    },

    // Get step by ID helper
    getStepById(stepId) {
      return steps.find((step) => step.id === stepId) || null
    },

    // Get connection by ID helper
    getConnectionById(connectionId) {
      return connections.find((conn) => conn.id === connectionId) || null
    },
  }
}

// Export singleton instance
export const vsmDataStore = createVsmDataStore()

// Selector for metrics (for compatibility)
export const selectMetrics = () => vsmDataStore.metrics
