import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { EXAMPLE_MAP } from '../data/exampleMaps.js'

const createStep = (name, overrides = {}) => {
  return {
    id: crypto.randomUUID(),
    name,
    type: 'custom',
    description: '',
    processTime: 60,
    leadTime: 240,
    percentCompleteAccurate: 100,
    queueSize: 0,
    batchSize: 1,
    peopleCount: 1,
    tools: [],
    position: { x: 0, y: 0 },
    ...overrides,
  }
}

const createConnection = (source, target, type = 'forward', reworkRate = 0) => ({
  id: `${source}-${target}`,
  source,
  target,
  type,
  reworkRate,
})

export const useVsmStore = create(
  persist(
    (set, get) => ({
      // VSM Data
      id: null,
      name: '',
      description: '',
      steps: [],
      connections: [],
      createdAt: null,
      updatedAt: null,

      // UI State
      selectedStepId: null,
      isEditing: false,
      selectedConnectionId: null,
      isEditingConnection: false,

      // Actions
      createNewMap: (name) => {
        const now = new Date().toISOString()
        set({
          id: crypto.randomUUID(),
          name,
          description: '',
          steps: [],
          connections: [],
          createdAt: now,
          updatedAt: now,
          selectedStepId: null,
          isEditing: false,
          selectedConnectionId: null,
          isEditingConnection: false,
        })
      },

      loadExample: () => {
        const now = new Date().toISOString()
        set({
          id: crypto.randomUUID(),
          name: EXAMPLE_MAP.name,
          description: EXAMPLE_MAP.description,
          steps: EXAMPLE_MAP.steps.map((step) => ({ ...step, id: crypto.randomUUID() })),
          connections: [],
          createdAt: now,
          updatedAt: now,
          selectedStepId: null,
          isEditing: false,
          selectedConnectionId: null,
          isEditingConnection: false,
        })
        // Recreate connections with new IDs
        const { steps } = get()
        const stepIdMap = {}
        EXAMPLE_MAP.steps.forEach((oldStep, index) => {
          stepIdMap[oldStep.id] = steps[index].id
        })
        const newConnections = EXAMPLE_MAP.connections.map((conn) => ({
          ...conn,
          id: `${stepIdMap[conn.source]}-${stepIdMap[conn.target]}`,
          source: stepIdMap[conn.source],
          target: stepIdMap[conn.target],
        }))
        set({ connections: newConnections })
      },

      loadTemplate: (template) => {
        const now = new Date().toISOString()
        // Create steps with new IDs
        const newSteps = template.steps.map((step) => ({
          ...step,
          id: crypto.randomUUID(),
        }))

        set({
          id: crypto.randomUUID(),
          name: template.name,
          description: template.description,
          steps: newSteps,
          connections: [],
          createdAt: now,
          updatedAt: now,
          selectedStepId: null,
          isEditing: false,
          selectedConnectionId: null,
          isEditingConnection: false,
        })

        // Create connections with new step IDs
        if (template.connections && template.connections.length > 0) {
          const newConnections = template.connections.map((conn) => ({
            id: `${newSteps[conn.source].id}-${newSteps[conn.target].id}`,
            source: newSteps[conn.source].id,
            target: newSteps[conn.target].id,
            type: conn.type || 'forward',
            reworkRate: conn.reworkRate || 0,
          }))
          set({ connections: newConnections })
        }
      },

      updateMapName: (name) => {
        set({
          name,
          updatedAt: new Date().toISOString(),
        })
      },

      updateMapDescription: (description) => {
        set({
          description,
          updatedAt: new Date().toISOString(),
        })
      },

      addStep: (name = 'New Step', overrides = {}) => {
        const { steps } = get()
        const position = {
          x: steps.length * 250 + 50,
          y: 150,
        }
        const newStep = createStep(name, { ...overrides, position })
        set({
          steps: [...steps, newStep],
          updatedAt: new Date().toISOString(),
        })
        return newStep
      },

      updateStep: (stepId, updates) => {
        const { steps } = get()
        set({
          steps: steps.map((step) =>
            step.id === stepId ? { ...step, ...updates } : step
          ),
          updatedAt: new Date().toISOString(),
        })
      },

      deleteStep: (stepId) => {
        const { steps, connections, selectedStepId } = get()
        set({
          steps: steps.filter((step) => step.id !== stepId),
          connections: connections.filter(
            (conn) => conn.source !== stepId && conn.target !== stepId
          ),
          selectedStepId: selectedStepId === stepId ? null : selectedStepId,
          updatedAt: new Date().toISOString(),
        })
      },

      updateStepPosition: (stepId, position) => {
        const { steps } = get()
        set({
          steps: steps.map((step) =>
            step.id === stepId ? { ...step, position } : step
          ),
        })
      },

      addConnection: (source, target, type = 'forward', reworkRate = 0) => {
        const { connections } = get()
        const existingConnection = connections.find(
          (c) => c.source === source && c.target === target
        )
        if (existingConnection) return null

        const newConnection = createConnection(source, target, type, reworkRate)
        set({
          connections: [...connections, newConnection],
          updatedAt: new Date().toISOString(),
        })
        return newConnection
      },

      deleteConnection: (connectionId) => {
        const { connections, selectedConnectionId, isEditingConnection } = get()
        const isSelectedConnection = selectedConnectionId === connectionId
        set({
          connections: connections.filter((conn) => conn.id !== connectionId),
          selectedConnectionId: isSelectedConnection ? null : selectedConnectionId,
          isEditingConnection: isSelectedConnection ? false : isEditingConnection,
          updatedAt: new Date().toISOString(),
        })
      },

      selectStep: (stepId) => {
        set({ selectedStepId: stepId })
      },

      clearSelection: () => {
        set({ selectedStepId: null })
      },

      setEditing: (isEditing) => {
        set({ isEditing })
      },

      // Connection Selection
      selectConnection: (connectionId) => {
        set({
          selectedConnectionId: connectionId,
          isEditingConnection: true,
          selectedStepId: null,
          isEditing: false,
        })
      },

      updateConnection: (connectionId, updates) => {
        const { connections } = get()
        set({
          connections: connections.map((conn) =>
            conn.id === connectionId ? { ...conn, ...updates } : conn
          ),
          updatedAt: new Date().toISOString(),
        })
      },

      setEditingConnection: (isEditingConnection) => {
        set({ isEditingConnection })
      },

      clearConnectionSelection: () => {
        set({
          selectedConnectionId: null,
          isEditingConnection: false,
        })
      },

      // Import/Export
      exportToJson: () => {
        const { id, name, description, steps, connections, createdAt, updatedAt } =
          get()
        return JSON.stringify(
          { id, name, description, steps, connections, createdAt, updatedAt },
          null,
          2
        )
      },

      importFromJson: (jsonString) => {
        try {
          const data = JSON.parse(jsonString)
          set({
            id: data.id || crypto.randomUUID(),
            name: data.name || 'Imported Map',
            description: data.description || '',
            steps: data.steps || [],
            connections: data.connections || [],
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            selectedStepId: null,
            isEditing: false,
            selectedConnectionId: null,
            isEditingConnection: false,
          })
          return true
        } catch (e) {
          console.error('Failed to import JSON:', e)
          return false
        }
      },

      clearMap: () => {
        set({
          id: null,
          name: '',
          description: '',
          steps: [],
          connections: [],
          createdAt: null,
          updatedAt: null,
          selectedStepId: null,
          isEditing: false,
          selectedConnectionId: null,
          isEditingConnection: false,
        })
      },
    }),
    {
      name: 'vsm-workshop-storage',
    }
  )
)
