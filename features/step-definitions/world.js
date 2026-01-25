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
    this.selectedConnection = null
    this.pendingConnection = null
    // Simulation state
    this.simulation = null
    this.scenarios = []
    this.baselineResults = null
    this.scenarioResults = null
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

  addConnection(sourceName, targetName, type = 'forward', reworkRate = 0) {
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
      type,
      reworkRate,
    }
    this.connections.push(connection)
    return connection
  }

  findConnection(sourceName, targetName) {
    const source = this.findStep(sourceName)
    const target = this.findStep(targetName)
    if (!source || !target) return null
    return this.connections.find(
      (c) => c.source === source.id && c.target === target.id
    )
  }

  updateConnection(connectionId, updates) {
    const index = this.connections.findIndex((c) => c.id === connectionId)
    if (index >= 0) {
      this.connections[index] = { ...this.connections[index], ...updates }
    }
  }

  deleteConnection(connectionId) {
    this.connections = this.connections.filter((c) => c.id !== connectionId)
    if (this.selectedConnection?.id === connectionId) {
      this.selectedConnection = null
    }
  }

  selectConnection(connectionId) {
    this.selectedConnection = this.connections.find((c) => c.id === connectionId)
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

    // Total queue size
    const totalQueueSize = this.steps.reduce((sum, s) => sum + (s.queueSize || 0), 0)

    // Activity ratio (average process time)
    const activityRatio = this.steps.length > 0 ? totalProcessTime / this.steps.length : 0

    // Rework impact
    const reworkConnections = this.connections.filter((c) => c.type === 'rework')
    const totalReworkRate = Math.min(
      reworkConnections.reduce((sum, c) => sum + (c.reworkRate || 0) / 100, 0),
      0.95
    )
    const reworkMultiplier = totalReworkRate > 0 ? 1 / (1 - totalReworkRate) : 1
    const effectiveLeadTime = Math.round(totalLeadTime * reworkMultiplier)

    let reworkStatus = 'good'
    if (reworkMultiplier > 1.3) reworkStatus = 'critical'
    else if (reworkMultiplier > 1.1) reworkStatus = 'warning'

    this.metrics = {
      totalLeadTime,
      totalProcessTime,
      flowEfficiency,
      flowStatus,
      firstPassYield,
      stepCount: this.steps.length,
      totalQueueSize,
      activityRatio,
      effectiveLeadTime,
      reworkMultiplier,
      reworkStatus,
      hasRework: reworkConnections.length > 0,
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

  // ==========================================
  // Simulation Methods
  // ==========================================

  initSimulation() {
    this.simulation = {
      isRunning: false,
      isPaused: false,
      speed: 1.0,
      workItemCount: 0,
      workItems: [],
      completedCount: 0,
      elapsedTime: 0,
      queueSizes: {},
      queueHistory: [],
      detectedBottlenecks: [],
      results: null,
    }
    // Initialize queue sizes for each step
    this.steps.forEach((step) => {
      this.simulation.queueSizes[step.id] = 0
    })
  }

  generateWorkItems(count) {
    const items = []
    const firstStep = this.steps[0]
    for (let i = 0; i < count; i++) {
      items.push({
        id: crypto.randomUUID(),
        currentStepId: firstStep?.id || null,
        progress: 0,
        enteredAt: 0,
        history: [],
        isRework: false,
      })
    }
    return items
  }

  processTick() {
    if (!this.simulation || this.simulation.isPaused) return

    const tickDuration = 1 / this.simulation.speed
    this.simulation.elapsedTime += tickDuration

    // Process each work item
    this.simulation.workItems.forEach((item) => {
      if (item.currentStepId === null) return // Completed

      const step = this.steps.find((s) => s.id === item.currentStepId)
      if (!step) return

      // Increase progress
      item.progress += tickDuration * 10

      // Check if step is complete
      if (item.progress >= step.processTime) {
        // Record history
        item.history.push({
          stepId: step.id,
          enteredAt: item.enteredAt,
          exitedAt: this.simulation.elapsedTime,
        })

        // Find next step
        const nextConnection = this.connections.find(
          (c) => c.source === step.id && c.type === 'forward'
        )

        if (nextConnection) {
          const nextStep = this.steps.find((s) => s.id === nextConnection.target)
          if (nextStep) {
            item.currentStepId = nextStep.id
            item.progress = 0
            item.enteredAt = this.simulation.elapsedTime
            this.simulation.queueSizes[nextStep.id] =
              (this.simulation.queueSizes[nextStep.id] || 0) + 1
          }
        } else {
          // No next step - completed
          item.currentStepId = null
          this.simulation.completedCount++
        }
      }
    })

    // Record queue history
    this.steps.forEach((step) => {
      this.simulation.queueHistory.push({
        tick: this.simulation.elapsedTime,
        stepId: step.id,
        queueSize: this.simulation.queueSizes[step.id] || 0,
      })
    })

    // Detect bottlenecks
    this.detectBottlenecks()
  }

  detectBottlenecks() {
    const threshold = 3
    this.simulation.detectedBottlenecks = this.steps
      .filter((step) => (this.simulation.queueSizes[step.id] || 0) > threshold)
      .map((step) => step.id)
  }

  runSimulationToCompletion() {
    this.simulation.isRunning = true
    const maxTicks = 10000
    let ticks = 0

    while (
      this.simulation.completedCount < this.simulation.workItemCount &&
      ticks < maxTicks
    ) {
      this.processTick()
      ticks++
    }

    this.simulation.isRunning = false

    // Calculate results
    const avgLeadTime =
      this.simulation.workItems.reduce((sum, item) => {
        const totalTime = item.history.reduce(
          (t, h) => t + (h.exitedAt - h.enteredAt),
          0
        )
        return sum + totalTime
      }, 0) / this.simulation.workItemCount

    // Calculate peak queues for bottleneck reporting
    const peakQueues = {}
    this.simulation.queueHistory.forEach((record) => {
      if (
        !peakQueues[record.stepId] ||
        record.queueSize > peakQueues[record.stepId]
      ) {
        peakQueues[record.stepId] = record.queueSize
      }
    })

    const bottlenecks = Object.entries(peakQueues)
      .filter(([, peak]) => peak > 3)
      .map(([stepId, peakQueueSize]) => ({
        stepId,
        peakQueueSize,
        stepName: this.steps.find((s) => s.id === stepId)?.name,
      }))

    this.simulation.results = {
      completedCount: this.simulation.completedCount,
      avgLeadTime,
      throughput:
        this.simulation.completedCount / (this.simulation.elapsedTime || 1),
      bottlenecks,
      totalTime: this.simulation.elapsedTime,
    }
  }

  resetSimulation() {
    this.simulation = {
      isRunning: false,
      isPaused: false,
      speed: 1.0,
      workItemCount: 0,
      workItems: [],
      completedCount: 0,
      elapsedTime: 0,
      queueSizes: {},
      queueHistory: [],
      detectedBottlenecks: [],
      results: null,
    }
  }

  createScenario() {
    const scenario = {
      id: crypto.randomUUID(),
      name: `Scenario ${this.scenarios.length + 1}`,
      steps: this.steps.map((s) => ({ ...s })),
      connections: this.connections.map((c) => ({ ...c })),
      saved: false,
    }
    this.scenarios.push(scenario)
    return scenario
  }
}

setWorldConstructor(VSMWorld)
