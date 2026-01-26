import { useVsmStore } from '../../../src/stores/vsmStore.js'

export class VSMTestHelper {
  constructor() {
    this.store = useVsmStore
  }

  get state() {
    return this.store.getState()
  }

  createVSM(name) {
    this.state.createNewMap(name || 'My Value Stream')
  }

  addStep(name, type = 'custom', overrides = {}) {
    return this.state.addStep(name, overrides)
  }

  findStepByName(name) {
    return this.state.steps.find((s) => s.name === name)
  }

  findStepById(id) {
    return this.state.steps.find((s) => s.id === id)
  }

  updateStep(stepId, updates) {
    this.state.updateStep(stepId, updates)
  }

  deleteStep(stepId) {
    this.state.deleteStep(stepId)
  }

  addConnection(sourceName, targetName, type = 'forward', reworkRate = 0) {
    const source = this.findStepByName(sourceName)
    const target = this.findStepByName(targetName)
    if (!source || !target) return null
    return this.state.addConnection(source.id, target.id, type, reworkRate)
  }

  deleteConnection(connectionId) {
    this.state.deleteConnection(connectionId)
  }

  validateStep(step) {
    const errors = []
    if (step.leadTime < step.processTime) {
      errors.push('Lead time must be >= process time')
    }
    if (step.percentCompleteAccurate < 0 || step.percentCompleteAccurate > 100) {
      errors.push('%C&A must be between 0 and 100')
    }
    return errors
  }
}
