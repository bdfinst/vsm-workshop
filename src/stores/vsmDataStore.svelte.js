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
import { sanitizeVSMData, validateVSMData } from '../utils/validation/vsmValidator.js'
import { autoPositionStep } from '../utils/ui/autoPositionStep.js'
import { vsmLocalStorageRepo } from '../infrastructure/VsmLocalStorageRepository.js'

/**
 * @typedef {import('../types/index.js').Step} Step
 * @typedef {import('../types/index.js').Connection} Connection
 * @typedef {import('../types/index.js').ValueStreamMap} ValueStreamMap
 */

/**
 * Create the VSM data store
 * @param {Object} [repository] - Persistence repository (default: vsmLocalStorageRepo)
 * @returns {Object} VSM data store with reactive state and actions
 */
function createVsmDataStore(repository = vsmLocalStorageRepo) {
  const initialState = {
    id: null,
    name: '',
    description: '',
    steps: [],
    connections: [],
    createdAt: null,
    updatedAt: null,
  }

  // Load persisted state; sanitize on read and validate to catch corrupted localStorage
  const rawPersisted = repository.load(initialState, sanitizeVSMData)
  const persistedValidation = validateVSMData(rawPersisted)
  const persisted = persistedValidation.valid ? rawPersisted : initialState

  // Reactive state using Svelte 5 $state rune
  let id = $state(persisted.id)
  let name = $state(persisted.name)
  let description = $state(persisted.description)
  let steps = $state(persisted.steps)
  let connections = $state(persisted.connections)
  let createdAt = $state(persisted.createdAt)
  let updatedAt = $state(persisted.updatedAt)

  // Cached metrics — only recomputed when steps or connections change
  let cachedMetrics = $derived(calculateMetrics(steps, connections))

  // Persist current state via repository
  function persist() {
    repository.save({
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
      return [...steps]
    },
    get connections() {
      return [...connections]
    },
    get createdAt() {
      return createdAt
    },
    get updatedAt() {
      return updatedAt
    },

    // Derived metrics — cached via $derived, only recomputed when steps/connections change
    get metrics() {
      return cachedMetrics
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
      const safe = sanitizeVSMData(mapData)
      const validation = validateVSMData(safe)
      if (!validation.valid) {
        console.warn('loadMap: data failed validation, loading with safe defaults', validation.errors)
      }
      id = safe.id
      name = safe.name
      description = safe.description
      steps = safe.steps
      connections = safe.connections
      createdAt = safe.createdAt
      updatedAt = safe.updatedAt
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
      const position = overrides.position || autoPositionStep(steps.length)
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

    /**
     * Restore a snapshot of steps and connections (used by undo/redo).
     * Bulk-assigns state fields and persists.
     * @param {{ steps: Array, connections: Array }} snapshot
     */
    restoreSnapshot(snapshot) {
      steps = snapshot.steps.map((s) => ({ ...s }))
      connections = snapshot.connections.map((c) => ({ ...c }))
      updatedAt = new Date().toISOString()
      persist()
    },

    // Get step by ID helper — returns shallow copy to prevent untracked mutations
    getStepById(stepId) {
      const step = steps.find((s) => s.id === stepId)
      return step ? { ...step } : null
    },

    // Get connection by ID helper — returns shallow copy to prevent untracked mutations
    getConnectionById(connectionId) {
      const conn = connections.find((c) => c.id === connectionId)
      return conn ? { ...conn } : null
    },
  }
}

// Export singleton instance
export const vsmDataStore = createVsmDataStore()

// Selector for metrics (for compatibility)
export const selectMetrics = () => vsmDataStore.metrics
