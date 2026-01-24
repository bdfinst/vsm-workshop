import { setWorldConstructor, World } from '@cucumber/cucumber'

class VSMWorld extends World {
  constructor(options) {
    super(options)
    this.vsm = null
    this.steps = []
    this.connections = []
    this.metrics = null
    this.error = null
    this.selectedStep = null
  }

  createVSM(name) {
    this.vsm = {
      id: crypto.randomUUID(),
      name: name || 'My Value Stream',
      description: '',
      steps: [],
      connections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.steps = this.vsm.steps
    this.connections = this.vsm.connections
  }

  addStep(name, type = 'custom', overrides = {}) {
    const step = {
      id: crypto.randomUUID(),
      name,
      type,
      description: '',
      processTime: overrides.processTime ?? 60,
      leadTime: overrides.leadTime ?? 240,
      percentCompleteAccurate: overrides.percentCompleteAccurate ?? 100,
      queueSize: overrides.queueSize ?? 0,
      batchSize: overrides.batchSize ?? 1,
      position: { x: this.steps.length * 250, y: 150 },
    }
    this.steps.push(step)
    return step
  }

  findStep(name) {
    return this.steps.find((s) => s.name === name)
  }

  updateStep(stepId, updates) {
    const index = this.steps.findIndex((s) => s.id === stepId)
    if (index >= 0) {
      this.steps[index] = { ...this.steps[index], ...updates }
    }
  }

  deleteStep(stepId) {
    this.steps = this.steps.filter((s) => s.id !== stepId)
    this.connections = this.connections.filter(
      (c) => c.source !== stepId && c.target !== stepId
    )
  }

  addConnection(sourceName, targetName) {
    const source = this.findStep(sourceName)
    const target = this.findStep(targetName)
    if (!source || !target) return null

    const existing = this.connections.find(
      (c) => c.source === source.id && c.target === target.id
    )
    if (existing) return null

    const connection = {
      id: `${source.id}-${target.id}`,
      source: source.id,
      target: target.id,
      type: 'forward',
      reworkRate: 0,
    }
    this.connections.push(connection)
    return connection
  }

  deleteConnection(connectionId) {
    this.connections = this.connections.filter((c) => c.id !== connectionId)
  }

  calculateMetrics() {
    const totalLeadTime = this.steps.reduce((sum, s) => sum + s.leadTime, 0)
    const totalProcessTime = this.steps.reduce((sum, s) => sum + s.processTime, 0)
    const flowEfficiency = totalLeadTime > 0 ? (totalProcessTime / totalLeadTime) * 100 : 0

    let flowStatus = 'critical'
    if (flowEfficiency >= 25) flowStatus = 'good'
    else if (flowEfficiency >= 15) flowStatus = 'warning'

    const firstPassYield = this.steps.reduce(
      (product, s) => product * (s.percentCompleteAccurate / 100),
      1
    ) * 100

    this.metrics = {
      totalLeadTime,
      totalProcessTime,
      flowEfficiency,
      flowStatus,
      firstPassYield,
      stepCount: this.steps.length,
    }
    return this.metrics
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

setWorldConstructor(VSMWorld)
