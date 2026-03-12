/**
 * Test-compatible stores for Cucumber acceptance tests
 * These are plain JavaScript implementations that match the Svelte store APIs
 * but don't use Svelte 5 runes (which require compilation)
 */

import { createStep } from '../../../src/models/StepFactory.js'
import { createConnection } from '../../../src/models/ConnectionFactory.js'
import { calculateMetrics } from '../../../src/utils/calculations/metrics.js'
import { EXAMPLE_MAP } from '../../../src/data/exampleMaps.js'
// MAP_TEMPLATES is available if needed for template loading tests

// ==========================================
// VSM Data Store
// ==========================================
function createTestVsmDataStore() {
  let id = null
  let name = ''
  let description = ''
  let steps = []
  let connections = []
  let createdAt = null
  let updatedAt = null

  return {
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
    get metrics() {
      return calculateMetrics(steps, connections)
    },

    createNewMap(mapName) {
      const now = new Date().toISOString()
      id = crypto.randomUUID()
      name = mapName
      description = ''
      steps = []
      connections = []
      createdAt = now
      updatedAt = now
    },

    updateMapName(newName) {
      name = newName
      updatedAt = new Date().toISOString()
    },

    updateMapDescription(newDescription) {
      description = newDescription
      updatedAt = new Date().toISOString()
    },

    loadMap(mapData) {
      id = mapData.id
      name = mapData.name
      description = mapData.description || ''
      steps = mapData.steps || []
      connections = mapData.connections || []
      createdAt = mapData.createdAt
      updatedAt = mapData.updatedAt
    },

    clearMap() {
      id = null
      name = ''
      description = ''
      steps = []
      connections = []
      createdAt = null
      updatedAt = null
    },

    addStep(stepName = 'New Step', overrides = {}) {
      const position = overrides.position || {
        x: 50 + steps.length * 250,
        y: 150,
      }
      const newStep = createStep(stepName, { ...overrides, position })
      steps = [...steps, newStep]
      updatedAt = new Date().toISOString()
      return newStep
    },

    updateStep(stepId, updates) {
      steps = steps.map((step) =>
        step.id === stepId ? { ...step, ...updates } : step
      )
      updatedAt = new Date().toISOString()
    },

    deleteStep(stepId) {
      steps = steps.filter((step) => step.id !== stepId)
      connections = connections.filter(
        (conn) => conn.source !== stepId && conn.target !== stepId
      )
      updatedAt = new Date().toISOString()
    },

    updateStepPosition(stepId, position) {
      steps = steps.map((step) =>
        step.id === stepId ? { ...step, position } : step
      )
    },

    addConnection(source, target, type = 'forward', reworkRate = 0) {
      const existingConnection = connections.find(
        (c) => c.source === source && c.target === target
      )
      if (existingConnection) return null

      const newConnection = createConnection(source, target, type, reworkRate)
      connections = [...connections, newConnection]
      updatedAt = new Date().toISOString()
      return newConnection
    },

    updateConnection(connectionId, updates) {
      connections = connections.map((conn) =>
        conn.id === connectionId ? { ...conn, ...updates } : conn
      )
      updatedAt = new Date().toISOString()
    },

    deleteConnection(connectionId) {
      connections = connections.filter((conn) => conn.id !== connectionId)
      updatedAt = new Date().toISOString()
    },

    getStepById(stepId) {
      return steps.find((step) => step.id === stepId) || null
    },

    getConnectionById(connectionId) {
      return connections.find((conn) => conn.id === connectionId) || null
    },
  }
}

// ==========================================
// VSM UI Store
// ==========================================
function createTestVsmUIStore() {
  let selectedStepId = null
  let isEditing = false
  let selectedConnectionId = null
  let isEditingConnection = false

  return {
    get selectedStepId() {
      return selectedStepId
    },
    get isEditing() {
      return isEditing
    },
    get selectedConnectionId() {
      return selectedConnectionId
    },
    get isEditingConnection() {
      return isEditingConnection
    },

    selectStep(stepId) {
      selectedStepId = stepId
      selectedConnectionId = null
      isEditingConnection = false
    },

    clearSelection() {
      selectedStepId = null
      isEditing = false
    },

    setEditing(editing) {
      isEditing = editing
    },

    selectConnection(connectionId) {
      selectedConnectionId = connectionId
      isEditingConnection = true
      selectedStepId = null
      isEditing = false
    },

    setEditingConnection(editing) {
      isEditingConnection = editing
    },

    clearConnectionSelection() {
      selectedConnectionId = null
      isEditingConnection = false
    },

    clearUIState() {
      selectedStepId = null
      isEditing = false
      selectedConnectionId = null
      isEditingConnection = false
    },
  }
}

// ==========================================
// VSM IO Store
// ==========================================
function createTestVsmIOStore(dataStore) {
  return {
    loadExample() {
      dataStore.loadMap(EXAMPLE_MAP)
    },

    loadTemplate(template) {
      const now = new Date().toISOString()
      const mapData = {
        id: crypto.randomUUID(),
        name: template.name,
        description: template.description || '',
        steps: [],
        connections: [],
        createdAt: now,
        updatedAt: now,
      }

      // Create steps from template
      const { steps: builtSteps, stepIdMap } = template.steps.reduce(
        (acc, stepTemplate, index) => {
          const step = createStep(stepTemplate.name, {
            type: stepTemplate.type || 'custom',
            description: stepTemplate.description || '',
            processTime: stepTemplate.processTime,
            leadTime: stepTemplate.leadTime,
            percentCompleteAccurate: stepTemplate.percentCompleteAccurate,
            queueSize: stepTemplate.queueSize,
            batchSize: stepTemplate.batchSize,
            position: { x: 50 + index * 250, y: 150 },
          })
          return {
            steps: [...acc.steps, step],
            stepIdMap: { ...acc.stepIdMap, [index]: step.id },
          }
        },
        { steps: [], stepIdMap: {} }
      )
      mapData.steps = builtSteps

      // Create connections from template
      const builtConnections = (template.connections || []).map((connTemplate) =>
        createConnection(
          stepIdMap[connTemplate.source],
          stepIdMap[connTemplate.target],
          connTemplate.type || 'forward',
          connTemplate.reworkRate || 0
        )
      )
      mapData.connections = builtConnections

      dataStore.loadMap(mapData)
    },

    exportToJson() {
      return JSON.stringify({
        id: dataStore.id,
        name: dataStore.name,
        description: dataStore.description,
        steps: dataStore.steps,
        connections: dataStore.connections,
        createdAt: dataStore.createdAt,
        updatedAt: dataStore.updatedAt,
      })
    },

    importFromJson(jsonString) {
      try {
        const data = JSON.parse(jsonString)
        dataStore.loadMap(data)
        return true
      } catch (e) {
        console.warn('Failed to import JSON:', e)
        return false
      }
    },
  }
}

// ==========================================
// Simulation Control Store
// ==========================================
function createTestSimControlStore() {
  let isRunning = false
  let isPaused = false
  let speed = 1.0

  return {
    get isRunning() {
      return isRunning
    },
    get isPaused() {
      return isPaused
    },
    get speed() {
      return speed
    },

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
      speed = Math.min(4.0, Math.max(0.25, newSpeed))
    },

    reset() {
      isRunning = false
      isPaused = false
    },
  }
}

// ==========================================
// Simulation Data Store
// ==========================================
function createTestSimDataStore() {
  let workItemCount = 10
  let workItems = []
  let completedCount = 0
  let elapsedTime = 0
  let queueSizesByStepId = {}
  let queueHistory = []
  let detectedBottlenecks = []
  let results = null

  return {
    get workItemCount() {
      return workItemCount
    },
    get workItems() {
      return workItems
    },
    get completedCount() {
      return completedCount
    },
    get elapsedTime() {
      return elapsedTime
    },
    get queueSizesByStepId() {
      return queueSizesByStepId
    },
    get queueHistory() {
      return queueHistory
    },
    get detectedBottlenecks() {
      return detectedBottlenecks
    },
    get results() {
      return results
    },

    setWorkItemCount(count) {
      workItemCount = Math.max(0, count)
    },

    updateWorkItems(items) {
      workItems = items
    },

    incrementCompletedCount() {
      completedCount = completedCount + 1
    },

    setCompletedCount(count) {
      completedCount = count
    },

    updateElapsedTime(time) {
      elapsedTime = time
    },

    updateQueueSizes(sizes) {
      queueSizesByStepId = sizes
    },

    addQueueHistoryEntry(entry) {
      queueHistory = [...queueHistory, entry]
    },

    setQueueHistory(history) {
      queueHistory = history
    },

    setDetectedBottlenecks(bottlenecks) {
      detectedBottlenecks = bottlenecks
    },

    setResults(newResults) {
      results = newResults
    },

    reset() {
      workItems = []
      completedCount = 0
      elapsedTime = 0
      queueSizesByStepId = {}
      queueHistory = []
      detectedBottlenecks = []
      results = null
    },
  }
}

// ==========================================
// Scenario Store
// ==========================================
function createTestScenarioStore() {
  let scenarios = []
  let activeScenarioId = null
  let comparisonResults = null

  return {
    get scenarios() {
      return scenarios
    },
    get activeScenarioId() {
      return activeScenarioId
    },
    get comparisonResults() {
      return comparisonResults
    },
    get activeScenario() {
      return scenarios.find((s) => s.id === activeScenarioId) || null
    },

    addScenario(scenario) {
      scenarios = [...scenarios, scenario]
    },

    removeScenario(scenarioId) {
      scenarios = scenarios.filter((s) => s.id !== scenarioId)
      if (activeScenarioId === scenarioId) {
        activeScenarioId = null
      }
    },

    updateScenario(scenarioId, updates) {
      scenarios = scenarios.map((s) =>
        s.id === scenarioId ? { ...s, ...updates } : s
      )
    },

    setActiveScenario(scenarioId) {
      activeScenarioId = scenarioId
    },

    setComparisonResults(results) {
      comparisonResults = results
    },

    clearComparison() {
      comparisonResults = null
      activeScenarioId = null
    },

    reset() {
      scenarios = []
      activeScenarioId = null
      comparisonResults = null
    },
  }
}

// ==========================================
// Create Singleton Instances
// ==========================================
export const vsmDataStore = createTestVsmDataStore()
export const vsmUIStore = createTestVsmUIStore()
export const vsmIOStore = createTestVsmIOStore(vsmDataStore)
export const simControlStore = createTestSimControlStore()
export const simDataStore = createTestSimDataStore()
export const scenarioStore = createTestScenarioStore()
