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
import { calculateCdReadiness } from '../utils/calculations/cdReadiness.js'
import { createAnnotation } from '../utils/annotations.js'
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
    readinessOverrides: {},
    annotations: [],
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
  // User confirm/override decisions for the CD readiness scorecard, keyed by item id
  let readinessOverrides = $state(persisted.readinessOverrides || {})
  // Kaizen-burst improvement annotations for this map
  let annotations = $state(persisted.annotations || [])

  // Cached metrics — only recomputed when steps or connections change
  let cachedMetrics = $derived(calculateMetrics(steps, connections))

  // CD readiness scorecard — recomputed when steps, connections, or overrides change
  let cachedCdReadiness = $derived(
    calculateCdReadiness(steps, connections, readinessOverrides)
  )

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
      readinessOverrides,
      annotations,
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

    // Derived CD readiness scorecard (13 items)
    get cdReadiness() {
      return cachedCdReadiness
    },

    // User confirm/override decisions for the readiness scorecard
    get readinessOverrides() {
      return readinessOverrides
    },

    // Kaizen-burst improvement annotations
    get annotations() {
      return [...annotations]
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
      readinessOverrides = {}
      annotations = []
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
      readinessOverrides = safe.readinessOverrides || {}
      annotations = safe.annotations || []
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
      readinessOverrides = {}
      annotations = []
      persist()
    },

    // Kaizen-burst annotation CRUD (per-map improvement backlog)
    addAnnotation(targetType, targetId, wasteType, note = '') {
      const annotation = createAnnotation(targetType, targetId, wasteType, note)
      annotations = [...annotations, annotation]
      updatedAt = new Date().toISOString()
      persist()
      return annotation
    },

    updateAnnotation(annotationId, updates) {
      annotations = annotations.map((a) => (a.id === annotationId ? { ...a, ...updates } : a))
      updatedAt = new Date().toISOString()
      persist()
    },

    removeAnnotation(annotationId) {
      annotations = annotations.filter((a) => a.id !== annotationId)
      updatedAt = new Date().toISOString()
      persist()
    },

    // CD readiness confirm/override/reset (per-map, never mutates steps)
    setReadinessOverride(itemId, status) {
      readinessOverrides = { ...readinessOverrides, [itemId]: status }
      persist()
    },

    confirmReadiness(itemId) {
      readinessOverrides = { ...readinessOverrides, [itemId]: 'confirmed' }
      persist()
    },

    resetReadiness(itemId) {
      const next = { ...readinessOverrides }
      delete next[itemId]
      readinessOverrides = next
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
      const removedConnectionIds = connections
        .filter((conn) => conn.source === stepId || conn.target === stepId)
        .map((conn) => conn.id)
      steps = steps.filter((step) => step.id !== stepId)
      connections = connections.filter(
        (conn) => conn.source !== stepId && conn.target !== stepId
      )
      // Prune annotations targeting the removed step or its connections
      annotations = annotations.filter(
        (a) =>
          !(a.targetType === 'step' && a.targetId === stepId) &&
          !(a.targetType === 'connection' && removedConnectionIds.includes(a.targetId))
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
      annotations = annotations.filter(
        (a) => !(a.targetType === 'connection' && a.targetId === connectionId)
      )
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
