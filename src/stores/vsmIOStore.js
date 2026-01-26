import { create } from 'zustand'
import { EXAMPLE_MAP } from '../data/exampleMaps.js'
import {
  serializeVsm,
  deserializeVsm,
} from '../infrastructure/VsmJsonRepository.js'
import { useVsmDataStore } from './vsmDataStore.js'
import { useVsmUIStore } from './vsmUIStore.js'

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

export const useVsmIOStore = create(() => ({
  // Load example map
  loadExample: () => {
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

    useVsmDataStore.getState().loadMap({
      id: crypto.randomUUID(),
      name: EXAMPLE_MAP.name,
      description: EXAMPLE_MAP.description,
      steps: newSteps,
      connections: newConnections,
      createdAt: now,
      updatedAt: now,
    })

    useVsmUIStore.getState().clearUIState()
  },

  // Load template
  loadTemplate: (template) => {
    const now = new Date().toISOString()
    const newSteps = template.steps.map((step) => {
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

    useVsmDataStore.getState().loadMap({
      id: crypto.randomUUID(),
      name: template.name,
      description: template.description,
      steps: newSteps,
      connections: newConnections,
      createdAt: now,
      updatedAt: now,
    })

    useVsmUIStore.getState().clearUIState()
  },

  // Export to JSON
  exportToJson: () => {
    const { id, name, description, steps, connections, createdAt, updatedAt } =
      useVsmDataStore.getState()
    return serializeVsm({
      id,
      name,
      description,
      steps,
      connections,
      createdAt,
      updatedAt,
    })
  },

  // Import from JSON
  importFromJson: (jsonString) => {
    try {
      const data = deserializeVsm(jsonString)
      useVsmDataStore.getState().loadMap(data)
      useVsmUIStore.getState().clearUIState()
      return true
    } catch (e) {
      console.error('Failed to import JSON:', e)
      return false
    }
  },
}))
