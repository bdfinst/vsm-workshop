/**
 * VSM IO Store - Svelte 5 Runes
 * Handles import/export and template loading
 */
import { EXAMPLE_MAP } from '../data/exampleMaps.js'
import {
  serializeVsm,
  deserializeVsm,
} from '../infrastructure/VsmJsonRepository.js'
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
  }
}

// Export singleton instance
export const vsmIOStore = createVsmIOStore()
