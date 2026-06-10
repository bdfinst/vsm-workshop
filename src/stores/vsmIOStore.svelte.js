/**
 * VSM IO Store - Svelte 5 Runes
 * Handles import/export and template loading
 */
import { EXAMPLE_MAP } from '../data/exampleMaps.js'
import {
  serializeVsm,
  deserializeVsm,
} from '../infrastructure/VsmJsonRepository.js'
import { deriveVsmFromEvents } from '../utils/import/deriveVsm.js'
import { parseEventsFromCsv, parseEventsFromJson } from '../utils/import/eventAdapters.js'
import { fetchAzureDevOpsEvents } from '../utils/import/azureDevOpsAdapter.js'
import { vsmDataStore } from './vsmDataStore.svelte.js'
import { vsmUIStore } from './vsmUIStore.svelte.js'

/**
 * Remaps connections using an ID map { oldId -> newId }
 * @param {Array} connections - Connections to remap
 * @param {Object} idMap - Map of old IDs to new IDs
 * @returns {Array} Connections with remapped source/target IDs
 */
function remapConnectionIds(connections, idMap) {
  return connections.map((conn) => ({
    ...conn,
    id: `${idMap[conn.source]}-${idMap[conn.target]}`,
    source: idMap[conn.source],
    target: idMap[conn.target],
    type: conn.type || 'forward',
    reworkRate: conn.reworkRate || 0,
  }))
}

/**
 * Build a VSM from events and load it as the working map.
 * Shared by every import source (file event log, Azure DevOps, …).
 * @returns {boolean} True if a non-empty map was loaded
 */
function loadMapFromEvents(events, { name, stageOrder, description } = {}) {
  const { steps, connections } = deriveVsmFromEvents(events, { stageOrder })
  if (steps.length === 0) return false
  const now = new Date().toISOString()
  vsmDataStore.loadMap({
    id: crypto.randomUUID(),
    name: name || 'Imported current state',
    description: description || 'Derived from a real-tooling event log',
    steps,
    connections,
    createdAt: now,
    updatedAt: now,
  })
  vsmUIStore.clearUIState()
  return true
}

/**
 * Create the VSM IO store
 * @returns {Object} VSM IO store with import/export operations
 */
function createVsmIOStore() {
  return {
    /**
     * Load example map
     */
    loadExample() {
      const now = new Date().toISOString()
      const newSteps = EXAMPLE_MAP.steps.map((step) => ({
        ...step,
        id: crypto.randomUUID(),
      }))

      // Build old->new step ID map for connection remapping
      const stepIdMap = EXAMPLE_MAP.steps.reduce((acc, oldStep, index) => ({
        ...acc,
        [oldStep.id]: newSteps[index].id,
      }), {})

      const newConnections = remapConnectionIds(EXAMPLE_MAP.connections, stepIdMap)

      vsmDataStore.loadMap({
        id: crypto.randomUUID(),
        name: EXAMPLE_MAP.name,
        description: EXAMPLE_MAP.description,
        steps: newSteps,
        connections: newConnections,
        createdAt: now,
        updatedAt: now,
      })

      vsmUIStore.clearUIState()
    },

    /**
     * Load a template
     * @param {Object} template - Template to load
     */
    loadTemplate(template) {
      const now = new Date().toISOString()
      const newSteps = template.steps.map((step) => {
        // eslint-disable-next-line no-unused-vars
        const { position, ...domainData } = step
        return {
          ...domainData,
          id: crypto.randomUUID(),
        }
      })

      const indexIdMap = newSteps.reduce((acc, step, i) => ({ ...acc, [i]: step.id }), {})
      const newConnections =
        template.connections && template.connections.length > 0
          ? remapConnectionIds(template.connections, indexIdMap)
          : []

      vsmDataStore.loadMap({
        id: crypto.randomUUID(),
        name: template.name,
        description: template.description,
        steps: newSteps,
        connections: newConnections,
        createdAt: now,
        updatedAt: now,
      })

      vsmUIStore.clearUIState()
    },

    /**
     * Export current VSM to JSON string
     * @returns {string} JSON string
     */
    exportToJson() {
      return serializeVsm({
        id: vsmDataStore.id,
        name: vsmDataStore.name,
        description: vsmDataStore.description,
        steps: vsmDataStore.steps,
        connections: vsmDataStore.connections,
        createdAt: vsmDataStore.createdAt,
        updatedAt: vsmDataStore.updatedAt,
        readinessOverrides: vsmDataStore.readinessOverrides,
        dora: vsmDataStore.dora,
        annotations: vsmDataStore.annotations,
        baseline: vsmDataStore.baseline,
      })
    },

    /**
     * Import VSM from JSON string
     * @param {string} jsonString - JSON string to import
     * @returns {boolean} Success status
     */
    importFromJson(jsonString) {
      try {
        const data = deserializeVsm(jsonString)
        vsmDataStore.loadMap(data)
        vsmUIStore.clearUIState()
        return true
      } catch (e) {
        console.error('Failed to import JSON:', e)
        return false
      }
    },

    /**
     * Import a current-state map from a real-tooling event log (CSV or JSON).
     * Derives a VSM from the events and loads it as the working map.
     * @param {string} rawData - Raw CSV or JSON event log
     * @param {'csv'|'json'} format
     * @param {{name?: string, stageOrder?: string[]}} [options]
     * @returns {boolean} Success status
     */
    importEventLog(rawData, format, options = {}) {
      try {
        const events =
          format === 'csv' ? parseEventsFromCsv(rawData) : parseEventsFromJson(rawData)
        return loadMapFromEvents(events, options)
      } catch (e) {
        console.error('Failed to import event log:', e)
        return false
      }
    },

    /**
     * Optional live connection: import a current-state map from Azure DevOps.
     * Does nothing unless explicitly called with org/project/PAT — the PAT is
     * used only for this request and never persisted.
     * @param {Object} config - { organization, project, pat, wiql, stageOrder?, fetchImpl? }
     * @returns {Promise<boolean>} Success status
     */
    async importFromAzureDevOps(config = {}) {
      try {
        const events = await fetchAzureDevOpsEvents(config)
        return loadMapFromEvents(events, {
          name: config.name || `${config.project} (Azure DevOps)`,
          stageOrder: config.stageOrder,
          description: 'Imported from Azure DevOps work-item history',
        })
      } catch (e) {
        console.error('Failed to import from Azure DevOps:', e)
        return false
      }
    },
  }
}

// Export singleton instance
export const vsmIOStore = createVsmIOStore()
