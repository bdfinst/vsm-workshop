import { describe, it, expect, beforeEach } from 'vitest'
import { useVsmStore } from '../../../src/stores/vsmStore'

describe('vsmStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useVsmStore.getState().clearMap()
  })

  describe('Map lifecycle', () => {
    it('creates a new empty map with metadata', () => {
      useVsmStore.getState().createNewMap('My New Map')

      const state = useVsmStore.getState()
      expect(state.name).toBe('My New Map')
      expect(state.id).not.toBeNull()
      expect(state.steps).toHaveLength(0)
      expect(state.connections).toHaveLength(0)
      expect(state.createdAt).not.toBeNull()
      expect(state.updatedAt).not.toBeNull()
    })

    it('resets map when creating new map', () => {
      // Create map with data
      useVsmStore.getState().createNewMap('First Map')
      useVsmStore.getState().addStep('Step 1')
      expect(useVsmStore.getState().steps).toHaveLength(1)

      // Create new map
      useVsmStore.getState().createNewMap('Second Map')

      const state = useVsmStore.getState()
      expect(state.name).toBe('Second Map')
      expect(state.steps).toHaveLength(0)
      expect(state.connections).toHaveLength(0)
    })

    it('clears selection when creating new map', () => {
      useVsmStore.getState().createNewMap('Test Map')
      useVsmStore.getState().addStep('Step 1')
      const stepId = useVsmStore.getState().steps[0].id
      useVsmStore.getState().selectStep(stepId)

      useVsmStore.getState().createNewMap('New Map')

      const state = useVsmStore.getState()
      expect(state.selectedStepId).toBeNull()
      expect(state.isEditing).toBe(false)
    })

    it('tracks timestamp updates when map changes', () => {
      useVsmStore.getState().createNewMap('Test Map')
      const initialTimestamp = useVsmStore.getState().updatedAt

      useVsmStore.getState().addStep('Step 1')

      expect(useVsmStore.getState().updatedAt).not.toBe(initialTimestamp)
    })
  })

  describe('Step management', () => {
    beforeEach(() => {
      useVsmStore.getState().createNewMap('Test Map')
    })

    describe('Adding steps', () => {
      it('creates step with default values', () => {
        const step = useVsmStore.getState().addStep('Development')

        expect(step.name).toBe('Development')
        expect(step.id).toBeDefined()
        expect(step.processTime).toBe(60)
        expect(step.leadTime).toBe(240)
        expect(step.percentCompleteAccurate).toBe(100)
        expect(useVsmStore.getState().steps).toHaveLength(1)
      })

      it('positions steps horizontally in sequence', () => {
        useVsmStore.getState().addStep('Step 1')
        useVsmStore.getState().addStep('Step 2')

        const steps = useVsmStore.getState().steps
        expect(steps[0].position.x).toBe(50)
        expect(steps[1].position.x).toBe(300)
        expect(steps[0].position.y).toBe(150)
        expect(steps[1].position.y).toBe(150)
      })

      it('allows overriding default step values', () => {
        const step = useVsmStore.getState().addStep('Testing', {
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
        useVsmStore.getState().addStep('Development')
      })

      it('updates multiple step properties', () => {
        const stepId = useVsmStore.getState().steps[0].id
        useVsmStore.getState().updateStep(stepId, {
          name: 'Code Review',
          processTime: 30,
          leadTime: 120,
        })

        const step = useVsmStore.getState().steps[0]
        expect(step.name).toBe('Code Review')
        expect(step.processTime).toBe(30)
        expect(step.leadTime).toBe(120)
      })

      it('performs partial updates without changing other fields', () => {
        const stepId = useVsmStore.getState().steps[0].id
        useVsmStore.getState().updateStep(stepId, { name: 'Updated Name' })

        const step = useVsmStore.getState().steps[0]
        expect(step.name).toBe('Updated Name')
        expect(step.processTime).toBe(60) // unchanged
        expect(step.leadTime).toBe(240) // unchanged
      })

      it('isolates updates to specific step', () => {
        useVsmStore.getState().addStep('Testing')
        const firstStepId = useVsmStore.getState().steps[0].id

        useVsmStore.getState().updateStep(firstStepId, { name: 'Modified' })

        expect(useVsmStore.getState().steps[1].name).toBe('Testing')
      })

      it('updates timestamp when step changes', () => {
        const stepId = useVsmStore.getState().steps[0].id
        const initialTimestamp = useVsmStore.getState().updatedAt

        useVsmStore.getState().updateStep(stepId, { name: 'Updated' })

        expect(useVsmStore.getState().updatedAt).not.toBe(initialTimestamp)
      })
    })

    describe('Deleting steps', () => {
      beforeEach(() => {
        useVsmStore.getState().addStep('Step 1')
        useVsmStore.getState().addStep('Step 2')
        useVsmStore.getState().addStep('Step 3')
      })

      it('removes specified step', () => {
        const stepId = useVsmStore.getState().steps[1].id
        useVsmStore.getState().deleteStep(stepId)

        const steps = useVsmStore.getState().steps
        expect(steps).toHaveLength(2)
        expect(steps.find((s) => s.id === stepId)).toBeUndefined()
      })

      it('cascades deletion to connected connections', () => {
        const steps = useVsmStore.getState().steps
        useVsmStore.getState().addConnection(steps[0].id, steps[1].id)
        useVsmStore.getState().addConnection(steps[1].id, steps[2].id)
        expect(useVsmStore.getState().connections).toHaveLength(2)

        useVsmStore.getState().deleteStep(steps[1].id)

        expect(useVsmStore.getState().connections).toHaveLength(0)
      })

      it('clears selection when deleting selected step', () => {
        const stepId = useVsmStore.getState().steps[0].id
        useVsmStore.getState().selectStep(stepId)

        useVsmStore.getState().deleteStep(stepId)

        expect(useVsmStore.getState().selectedStepId).toBeNull()
      })

      it('preserves selection when deleting different step', () => {
        const steps = useVsmStore.getState().steps
        useVsmStore.getState().selectStep(steps[0].id)

        useVsmStore.getState().deleteStep(steps[1].id)

        expect(useVsmStore.getState().selectedStepId).toBe(steps[0].id)
      })
    })
  })

  describe('Connection management', () => {
    beforeEach(() => {
      useVsmStore.getState().createNewMap('Test Map')
      useVsmStore.getState().addStep('Step 1')
      useVsmStore.getState().addStep('Step 2')
    })

    describe('Creating connections', () => {
      it('creates forward connection between steps', () => {
        const { steps, addConnection } = useVsmStore.getState()
        const result = addConnection(steps[0].id, steps[1].id)

        expect(result).not.toBeNull()
        expect(useVsmStore.getState().connections).toHaveLength(1)
        expect(useVsmStore.getState().connections[0].type).toBe('forward')
      })

      it('creates rework connection with rate', () => {
        const { steps, addConnection } = useVsmStore.getState()
        addConnection(steps[1].id, steps[0].id, 'rework', 20)

        const connections = useVsmStore.getState().connections
        expect(connections).toHaveLength(1)
        expect(connections[0].type).toBe('rework')
        expect(connections[0].reworkRate).toBe(20)
      })

      it('prevents duplicate connections', () => {
        const { steps, addConnection } = useVsmStore.getState()
        addConnection(steps[0].id, steps[1].id)
        const duplicate = addConnection(steps[0].id, steps[1].id)

        expect(duplicate).toBeNull()
        expect(useVsmStore.getState().connections).toHaveLength(1)
      })
    })

    describe('Editing connections', () => {
      it('changes connection type and properties', () => {
        const { steps, addConnection, updateConnection } = useVsmStore.getState()
        addConnection(steps[0].id, steps[1].id)

        const connId = useVsmStore.getState().connections[0].id
        updateConnection(connId, { type: 'rework', reworkRate: 15 })

        const updated = useVsmStore.getState().connections[0]
        expect(updated.type).toBe('rework')
        expect(updated.reworkRate).toBe(15)
      })

      it('updates rework rate independently', () => {
        const { steps, addConnection, updateConnection } = useVsmStore.getState()
        addConnection(steps[0].id, steps[1].id, 'rework', 10)

        const connId = useVsmStore.getState().connections[0].id
        updateConnection(connId, { reworkRate: 25 })

        expect(useVsmStore.getState().connections[0].reworkRate).toBe(25)
      })
    })

    describe('Deleting connections', () => {
      it('removes connection from map', () => {
        const { steps, addConnection, deleteConnection } = useVsmStore.getState()
        addConnection(steps[0].id, steps[1].id)

        const connId = useVsmStore.getState().connections[0].id
        deleteConnection(connId)

        expect(useVsmStore.getState().connections).toHaveLength(0)
      })

      it('clears selection when deleting selected connection', () => {
        const { steps, addConnection, selectConnection, deleteConnection } =
          useVsmStore.getState()
        addConnection(steps[0].id, steps[1].id)

        const connId = useVsmStore.getState().connections[0].id
        selectConnection(connId)
        expect(useVsmStore.getState().selectedConnectionId).toBe(connId)

        deleteConnection(connId)
        expect(useVsmStore.getState().selectedConnectionId).toBeNull()
        expect(useVsmStore.getState().isEditingConnection).toBe(false)
      })
    })

    describe('Connection selection', () => {
      it('selects connection and opens editor', () => {
        const { steps, addConnection, selectConnection } = useVsmStore.getState()
        addConnection(steps[0].id, steps[1].id)

        const connId = useVsmStore.getState().connections[0].id
        selectConnection(connId)

        const state = useVsmStore.getState()
        expect(state.selectedConnectionId).toBe(connId)
        expect(state.isEditingConnection).toBe(true)
      })

      it('clears step selection when selecting connection', () => {
        const { steps, addConnection, selectStep, selectConnection } =
          useVsmStore.getState()
        selectStep(steps[0].id)
        expect(useVsmStore.getState().selectedStepId).toBe(steps[0].id)

        addConnection(steps[0].id, steps[1].id)
        const connId = useVsmStore.getState().connections[0].id
        selectConnection(connId)

        expect(useVsmStore.getState().selectedStepId).toBeNull()
        expect(useVsmStore.getState().isEditing).toBe(false)
      })

      it('clears connection selection', () => {
        const { steps, addConnection, selectConnection, clearConnectionSelection } =
          useVsmStore.getState()
        addConnection(steps[0].id, steps[1].id)

        const connId = useVsmStore.getState().connections[0].id
        selectConnection(connId)
        clearConnectionSelection()

        const state = useVsmStore.getState()
        expect(state.selectedConnectionId).toBeNull()
        expect(state.isEditingConnection).toBe(false)
      })
    })
  })

  describe('Template loading', () => {
    it('loads template with steps', () => {
      const template = {
        name: 'Test Template',
        description: 'A test template',
        steps: [
          { name: 'Step A', processTime: 60, leadTime: 120, position: { x: 0, y: 0 } },
          { name: 'Step B', processTime: 30, leadTime: 60, position: { x: 200, y: 0 } },
        ],
        connections: [],
      }

      useVsmStore.getState().loadTemplate(template)

      const state = useVsmStore.getState()
      expect(state.name).toBe('Test Template')
      expect(state.steps).toHaveLength(2)
      expect(state.steps[0].name).toBe('Step A')
      expect(state.steps[1].name).toBe('Step B')
    })

    it('recreates forward connections from template', () => {
      const template = {
        name: 'Template with Connections',
        description: 'Has connections',
        steps: [
          { name: 'Step A', processTime: 60, leadTime: 120, position: { x: 0, y: 0 } },
          { name: 'Step B', processTime: 30, leadTime: 60, position: { x: 200, y: 0 } },
        ],
        connections: [{ source: 0, target: 1, type: 'forward' }],
      }

      useVsmStore.getState().loadTemplate(template)

      const state = useVsmStore.getState()
      expect(state.connections).toHaveLength(1)
      expect(state.connections[0].source).toBe(state.steps[0].id)
      expect(state.connections[0].target).toBe(state.steps[1].id)
    })

    it('recreates rework connections with rates', () => {
      const template = {
        name: 'Template with Rework',
        description: 'Has rework',
        steps: [
          { name: 'Dev', processTime: 60, leadTime: 120, position: { x: 0, y: 0 } },
          { name: 'Test', processTime: 30, leadTime: 60, position: { x: 200, y: 0 } },
        ],
        connections: [
          { source: 0, target: 1, type: 'forward' },
          { source: 1, target: 0, type: 'rework', reworkRate: 20 },
        ],
      }

      useVsmStore.getState().loadTemplate(template)

      const state = useVsmStore.getState()
      expect(state.connections).toHaveLength(2)
      const reworkConn = state.connections.find((c) => c.type === 'rework')
      expect(reworkConn).toBeDefined()
      expect(reworkConn.reworkRate).toBe(20)
    })

    it('generates fresh IDs when loading template', () => {
      const template = {
        name: 'ID Test',
        description: 'Test ID generation',
        steps: [
          { id: 'old-id-1', name: 'Step A', position: { x: 0, y: 0 } },
          { id: 'old-id-2', name: 'Step B', position: { x: 200, y: 0 } },
        ],
        connections: [{ id: 'old-conn-1', source: 0, target: 1, type: 'forward' }],
      }

      useVsmStore.getState().loadTemplate(template)

      const state = useVsmStore.getState()
      expect(state.steps[0].id).not.toBe('old-id-1')
      expect(state.steps[1].id).not.toBe('old-id-2')
      expect(state.connections[0].id).not.toBe('old-conn-1')
    })

    it('loads example map with valid structure', () => {
      useVsmStore.getState().loadExample()

      const state = useVsmStore.getState()
      expect(state.steps.length).toBeGreaterThan(0)
      expect(state.name).toBeDefined()
      expect(state.description).toBeDefined()
    })

    it('generates unique IDs for example steps', () => {
      useVsmStore.getState().loadExample()

      const steps = useVsmStore.getState().steps
      const uniqueIds = new Set(steps.map((s) => s.id))
      expect(uniqueIds.size).toBe(steps.length)
    })

    it('maintains connection integrity in example', () => {
      useVsmStore.getState().loadExample()

      const state = useVsmStore.getState()
      if (state.connections.length > 0) {
        const stepIds = new Set(state.steps.map((s) => s.id))
        state.connections.forEach((conn) => {
          expect(stepIds.has(conn.source)).toBe(true)
          expect(stepIds.has(conn.target)).toBe(true)
        })
      }
    })

    it('initializes metadata for loaded template', () => {
      useVsmStore.getState().loadExample()

      const state = useVsmStore.getState()
      expect(state.id).not.toBeNull()
      expect(state.createdAt).not.toBeNull()
      expect(state.updatedAt).not.toBeNull()
    })
  })

  describe('Import and export', () => {
    const validJson = JSON.stringify({
      id: 'test-id',
      name: 'Imported Map',
      description: 'Test description',
      steps: [
        {
          id: 'step-1',
          name: 'Development',
          processTime: 60,
          leadTime: 240,
          position: { x: 0, y: 0 },
        },
      ],
      connections: [],
      createdAt: '2024-01-01T00:00:00Z',
    })

    describe('Importing maps', () => {
      it('imports valid VSM from JSON string', () => {
        const result = useVsmStore.getState().importFromJson(validJson)

        expect(result).toBe(true)
        const state = useVsmStore.getState()
        expect(state.name).toBe('Imported Map')
        expect(state.description).toBe('Test description')
        expect(state.steps).toHaveLength(1)
        expect(state.steps[0].name).toBe('Development')
      })

      it('handles malformed JSON gracefully', () => {
        const result = useVsmStore.getState().importFromJson('invalid json')

        expect(result).toBe(false)
      })

      it('generates ID when missing from import', () => {
        const jsonWithoutId = JSON.stringify({
          name: 'Test Map',
          steps: [],
          connections: [],
        })

        useVsmStore.getState().importFromJson(jsonWithoutId)

        expect(useVsmStore.getState().id).not.toBeNull()
      })

      it('applies defaults for missing fields', () => {
        const minimalJson = JSON.stringify({ name: 'Minimal Map' })

        useVsmStore.getState().importFromJson(minimalJson)

        const state = useVsmStore.getState()
        expect(state.steps).toEqual([])
        expect(state.connections).toEqual([])
        expect(state.description).toBe('')
      })

      it('updates timestamp on import', () => {
        useVsmStore.getState().importFromJson(validJson)

        expect(useVsmStore.getState().updatedAt).toBeDefined()
      })

      it('resets selection state on import', () => {
        useVsmStore.getState().createNewMap('Test')
        useVsmStore.getState().addStep('Step 1')
        useVsmStore.getState().selectStep(useVsmStore.getState().steps[0].id)

        useVsmStore.getState().importFromJson(validJson)

        const state = useVsmStore.getState()
        expect(state.selectedStepId).toBeNull()
        expect(state.isEditing).toBe(false)
      })
    })

    describe('Exporting maps', () => {
      beforeEach(() => {
        useVsmStore.getState().createNewMap('Export Test')
        useVsmStore.getState().addStep('Development')
        useVsmStore.getState().addStep('Testing')
      })

      it('produces valid JSON string', () => {
        const json = useVsmStore.getState().exportToJson()
        const parsed = JSON.parse(json)

        expect(parsed.name).toBe('Export Test')
        expect(parsed.steps).toHaveLength(2)
        expect(parsed.id).toBeDefined()
      })

      it('includes complete map data structure', () => {
        const steps = useVsmStore.getState().steps
        useVsmStore.getState().addConnection(steps[0].id, steps[1].id)

        const json = useVsmStore.getState().exportToJson()
        const parsed = JSON.parse(json)

        expect(parsed).toHaveProperty('id')
        expect(parsed).toHaveProperty('name')
        expect(parsed).toHaveProperty('description')
        expect(parsed).toHaveProperty('steps')
        expect(parsed).toHaveProperty('connections')
        expect(parsed).toHaveProperty('createdAt')
        expect(parsed).toHaveProperty('updatedAt')
      })

      it('formats JSON with readable indentation', () => {
        const json = useVsmStore.getState().exportToJson()

        expect(json).toContain('\n')
        expect(json).toContain('  ')
      })

      it('supports round-trip import/export', () => {
        const json = useVsmStore.getState().exportToJson()
        useVsmStore.getState().clearMap()

        const result = useVsmStore.getState().importFromJson(json)

        expect(result).toBe(true)
        expect(useVsmStore.getState().name).toBe('Export Test')
        expect(useVsmStore.getState().steps).toHaveLength(2)
      })
    })
  })
})
