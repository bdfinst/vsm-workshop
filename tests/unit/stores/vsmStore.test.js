import { describe, it, expect, beforeEach } from 'vitest'

// Import the new Svelte stores
import { vsmDataStore } from '../../../src/stores/vsmDataStore.svelte.js'
import { vsmUIStore } from '../../../src/stores/vsmUIStore.svelte.js'
import { vsmIOStore } from '../../../src/stores/vsmIOStore.svelte.js'

// Helper to get current state from underlying stores
const getState = () => ({
  id: vsmDataStore.id,
  name: vsmDataStore.name,
  description: vsmDataStore.description,
  steps: vsmDataStore.steps,
  connections: vsmDataStore.connections,
  createdAt: vsmDataStore.createdAt,
  updatedAt: vsmDataStore.updatedAt,
  selectedStepId: vsmUIStore.selectedStepId,
  isEditing: vsmUIStore.isEditing,
  selectedConnectionId: vsmUIStore.selectedConnectionId,
  isEditingConnection: vsmUIStore.isEditingConnection,
})

describe('vsmStore (Svelte)', () => {
  beforeEach(() => {
    // Reset store state before each test
    vsmDataStore.clearMap()
    vsmUIStore.clearUIState()
  })

  describe('Map lifecycle', () => {
    it('creates a new empty map with metadata', () => {
      vsmDataStore.createNewMap('My New Map')

      const state = getState()
      expect(state.name).toBe('My New Map')
      expect(state.id).not.toBeNull()
      expect(state.steps).toHaveLength(0)
      expect(state.connections).toHaveLength(0)
      expect(state.createdAt).not.toBeNull()
      expect(state.updatedAt).not.toBeNull()
    })

    it('resets map when creating new map', () => {
      // Create map with data
      vsmDataStore.createNewMap('First Map')
      vsmDataStore.addStep('Step 1')
      expect(getState().steps).toHaveLength(1)

      // Create new map
      vsmDataStore.createNewMap('Second Map')

      const state = getState()
      expect(state.name).toBe('Second Map')
      expect(state.steps).toHaveLength(0)
      expect(state.connections).toHaveLength(0)
    })
  })

  describe('Step management', () => {
    beforeEach(() => {
      vsmDataStore.createNewMap('Test Map')
    })

    describe('Adding steps', () => {
      it('creates step with default values', () => {
        const step = vsmDataStore.addStep('Development')

        expect(step.name).toBe('Development')
        expect(step.id).toBeDefined()
        expect(step.processTime).toBe(60)
        expect(step.leadTime).toBe(240)
        expect(step.percentCompleteAccurate).toBe(100)
        expect(getState().steps).toHaveLength(1)
      })

      it('positions steps right-to-left for backwards mapping', () => {
        vsmDataStore.addStep('Step 1')
        vsmDataStore.addStep('Step 2')

        const steps = getState().steps
        expect(steps[0].position.x).toBe(650)
        expect(steps[1].position.x).toBe(400)
        expect(steps[0].position.y).toBe(150)
        expect(steps[1].position.y).toBe(150)
      })

      it('allows overriding default step values', () => {
        const step = vsmDataStore.addStep('Testing', {
          processTime: 30,
          leadTime: 90,
          percentCompleteAccurate: 95,
        })

        expect(step.processTime).toBe(30)
        expect(step.leadTime).toBe(90)
        expect(step.percentCompleteAccurate).toBe(95)
      })
    })

    describe('Editing steps', () => {
      beforeEach(() => {
        vsmDataStore.addStep('Development')
      })

      it('updates multiple step properties', () => {
        const stepId = getState().steps[0].id
        vsmDataStore.updateStep(stepId, {
          name: 'Code Review',
          processTime: 30,
          leadTime: 120,
        })

        const step = getState().steps[0]
        expect(step.name).toBe('Code Review')
        expect(step.processTime).toBe(30)
        expect(step.leadTime).toBe(120)
      })

      it('performs partial updates without changing other fields', () => {
        const stepId = getState().steps[0].id
        vsmDataStore.updateStep(stepId, { name: 'Updated Name' })

        const step = getState().steps[0]
        expect(step.name).toBe('Updated Name')
        expect(step.processTime).toBe(60) // unchanged
        expect(step.leadTime).toBe(240) // unchanged
      })
    })

    describe('Deleting steps', () => {
      beforeEach(() => {
        vsmDataStore.addStep('Step 1')
        vsmDataStore.addStep('Step 2')
        vsmDataStore.addStep('Step 3')
      })

      it('removes specified step', () => {
        const stepId = getState().steps[1].id
        vsmDataStore.deleteStep(stepId)

        const steps = getState().steps
        expect(steps).toHaveLength(2)
        expect(steps.find((s) => s.id === stepId)).toBeUndefined()
      })

      it('cascades deletion to connected connections', () => {
        const steps = getState().steps
        vsmDataStore.addConnection(steps[0].id, steps[1].id)
        vsmDataStore.addConnection(steps[1].id, steps[2].id)
        expect(getState().connections).toHaveLength(2)

        vsmDataStore.deleteStep(steps[1].id)

        expect(getState().connections).toHaveLength(0)
      })
    })
  })

  describe('Connection management', () => {
    beforeEach(() => {
      vsmDataStore.createNewMap('Test Map')
      vsmDataStore.addStep('Step 1')
      vsmDataStore.addStep('Step 2')
    })

    describe('Creating connections', () => {
      it('creates forward connection between steps', () => {
        const steps = getState().steps
        const result = vsmDataStore.addConnection(steps[0].id, steps[1].id)

        expect(result).not.toBeNull()
        expect(getState().connections).toHaveLength(1)
        expect(getState().connections[0].type).toBe('forward')
      })

      it('creates rework connection with rate', () => {
        const steps = getState().steps
        vsmDataStore.addConnection(steps[1].id, steps[0].id, 'rework', 20)

        const connections = getState().connections
        expect(connections).toHaveLength(1)
        expect(connections[0].type).toBe('rework')
        expect(connections[0].reworkRate).toBe(20)
      })

      it('prevents duplicate connections', () => {
        const steps = getState().steps
        vsmDataStore.addConnection(steps[0].id, steps[1].id)
        const duplicate = vsmDataStore.addConnection(steps[0].id, steps[1].id)

        expect(duplicate).toBeNull()
        expect(getState().connections).toHaveLength(1)
      })
    })

    describe('Editing connections', () => {
      it('changes connection type and properties', () => {
        const steps = getState().steps
        vsmDataStore.addConnection(steps[0].id, steps[1].id)

        const connId = getState().connections[0].id
        vsmDataStore.updateConnection(connId, { type: 'rework', reworkRate: 15 })

        const updated = getState().connections[0]
        expect(updated.type).toBe('rework')
        expect(updated.reworkRate).toBe(15)
      })
    })

    describe('Deleting connections', () => {
      it('removes connection from map', () => {
        const steps = getState().steps
        vsmDataStore.addConnection(steps[0].id, steps[1].id)

        const connId = getState().connections[0].id
        vsmDataStore.deleteConnection(connId)

        expect(getState().connections).toHaveLength(0)
      })
    })
  })

  describe('Export', () => {
    beforeEach(() => {
      vsmDataStore.createNewMap('Export Test')
      vsmDataStore.addStep('Development')
      vsmDataStore.addStep('Testing')
    })

    it('produces valid JSON string', () => {
      const json = vsmIOStore.exportToJson()
      const parsed = JSON.parse(json)

      expect(parsed.name).toBe('Export Test')
      expect(parsed.steps).toHaveLength(2)
      expect(parsed.id).toBeDefined()
    })

    it('supports round-trip import/export', () => {
      const json = vsmIOStore.exportToJson()
      vsmDataStore.clearMap()

      const result = vsmIOStore.importFromJson(json)

      expect(result).toBe(true)
      expect(getState().name).toBe('Export Test')
      expect(getState().steps).toHaveLength(2)
    })
  })
})
