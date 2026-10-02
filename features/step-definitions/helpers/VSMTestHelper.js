import { vsmDataStore, vsmUIStore } from './testStores.js'

export const createVSMTestHelper = () => {
  const dataStore = vsmDataStore
  const uiStore = vsmUIStore

  const findStepByName = (name) => dataStore.steps.find((s) => s.name === name)
  const findStepById = (id) => dataStore.steps.find((s) => s.id === id)

  const addConnection = (sourceName, targetName, type = 'forward', reworkRate = 0) => {
    const source = findStepByName(sourceName)
    const target = findStepByName(targetName)
    if (!source) {
      throw new Error(
        `addConnection failed: source step "${sourceName}" not found. Available steps: ${dataStore.steps.map((s) => s.name).join(', ') || 'none'}`
      )
    }
    if (!target) {
      throw new Error(
        `addConnection failed: target step "${targetName}" not found. Available steps: ${dataStore.steps.map((s) => s.name).join(', ') || 'none'}`
      )
    }
    return dataStore.addConnection(source.id, target.id, type, reworkRate)
  }

  const validateStep = (step) => {
    const errors = []
    if (step.leadTime < step.processTime) {
      errors.push('Lead time must be >= process time')
    }
    if (step.percentCompleteAccurate < 0 || step.percentCompleteAccurate > 100) {
      errors.push('%C&A must be between 0 and 100')
    }
    return errors
  }

  return {
    get dataStore() {
      return dataStore
    },
    get uiStore() {
      return uiStore
    },
    get state() {
      return {
        steps: dataStore.steps,
        connections: dataStore.connections,
        name: dataStore.name,
        id: dataStore.id,
        createNewMap: (name) => dataStore.createNewMap(name),
        addStep: (name, overrides) => dataStore.addStep(name, overrides),
        updateStep: (id, updates) => dataStore.updateStep(id, updates),
        deleteStep: (id) => dataStore.deleteStep(id),
        addConnection,
        deleteConnection: (id) => dataStore.deleteConnection(id),
      }
    },
    createVSM(name) {
      dataStore.createNewMap(name || 'My Value Stream')
    },
    addStep(name, overrides = {}) {
      return dataStore.addStep(name, overrides)
    },
    findStepByName,
    findStepById,
    updateStep(stepId, updates) {
      dataStore.updateStep(stepId, updates)
    },
    deleteStep(stepId) {
      dataStore.deleteStep(stepId)
    },
    addConnection,
    deleteConnection(connectionId) {
      dataStore.deleteConnection(connectionId)
    },
    validateStep,
    clearAll() {
      dataStore.clearMap()
      uiStore.clearUIState()
    },
  }
}
