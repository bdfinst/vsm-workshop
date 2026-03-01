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
 * Remaps template connections to use new step IDs
 * @param {Array} templateConnections - Original connections with numeric indices
 * @param {Array} newSteps - Steps with newly generated UUIDs
 * @returns {Array} Connections with remapped IDs
 */
function remapTemplateConnections(templateConnections, newSteps) {
  return templateConnections.map((conn) => ({
    id: `${newSteps[conn.source].id}-${newSteps[conn.target].id}`,
    source: newSteps[conn.source].id,
    target: newSteps[conn.target].id,
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

      // Create step ID mapping for connections
      const stepIdMap = {}
      EXAMPLE_MAP.steps.forEach((oldStep, index) => {
        stepIdMap[oldStep.id] = newSteps[index].id
      })

      const newConnections = EXAMPLE_MAP.connections.map((conn) => ({
        ...conn,
        id: `${stepIdMap[conn.source]}-${stepIdMap[conn.target]}`,
        source: stepIdMap[conn.source],
        target: stepIdMap[conn.target],
      }))

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

      const newConnections =
        template.connections && template.connections.length > 0
          ? remapTemplateConnections(template.connections, newSteps)
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
