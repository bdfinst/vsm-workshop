import { setWorldConstructor, World } from '@cucumber/cucumber'
import { useVsmStore } from '../../src/stores/vsmStore.js'
import { useSimulationStore } from '../../src/stores/simulationStore.js'
import * as simEngine from '../../src/utils/simulation/simulationEngine.js'

// Get the initial state from the stores to reset them for each scenario
const vsmInitialState = useVsmStore.getState()
const simInitialState = useSimulationStore.getState()

class VSMWorld extends World {
  constructor(options) {
    super(options)
    // Reset stores before each scenario
    useVsmStore.setState(vsmInitialState, true)
    useSimulationStore.setState(simInitialState, true)

    this.error = null
    this.simEngine = simEngine

    // Scenario state
    this.baselineResults = null
    this.scenarioResults = null
    this.duplicateAttempt = false
    this.pendingDelete = null
  }

  // Helper properties to get current store states
  get vsmState() {
    return useVsmStore.getState()
  }

  get simState() {
    return useSimulationStore.getState()
  }

  // ==========================================
  // VSM Methods (delegating to vsmStore)
  // ==========================================

  createVSM(name) {
    this.vsmState.createNewMap(name || 'My Value Stream')
  }

  addStep(name, type = 'custom', overrides = {}) {
    // The store's addStep doesn't take type, but we can pass overrides
    return this.vsmState.addStep(name, overrides)
  }

  findStep(name) {
    return this.vsmState.steps.find((s) => s.name === name)
  }

  findStepById(id) {
    return this.vsmState.steps.find((s) => s.id === id)
  }

  updateStep(stepId, updates) {
    this.vsmState.updateStep(stepId, updates)
  }

  deleteStep(stepId) {
    this.vsmState.deleteStep(stepId)
  }

  addConnection(sourceName, targetName, type = 'forward', reworkRate = 0) {
    const source = this.findStep(sourceName)
    const target = this.findStep(targetName)
    if (!source || !target) return null
    return this.vsmState.addConnection(source.id, target.id, type, reworkRate)
  }

  deleteConnection(connectionId) {
    this.vsmState.deleteConnection(connectionId)
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
  // Simulation Methods (delegating to simStore and simEngine)
  // ==========================================

  initSimulation() {
    const { steps, connections } = this.vsmState
    const config = { workItemCount: this.simState.workItemCount }
    const initialState = this.simEngine.initSimulation(steps, connections, config)
    useSimulationStore.setState(initialState)
  }

  generateWorkItems(count) {
    const firstStep = this.vsmState.steps[0]
    return this.simEngine.generateWorkItems(count, firstStep?.id)
  }

  processTick() {
    const state = this.simEngine.processTick(
      this.simState,
      this.vsmState.steps,
      this.vsmState.connections
    )
    useSimulationStore.setState(state)
  }

  detectBottlenecks() {
    const bottlenecks = this.simEngine.detectBottlenecks(
      this.vsmState.steps,
      this.simState.queueSizes
    )
    useSimulationStore.getState().setDetectedBottlenecks(bottlenecks)
  }

  runSimulationToCompletion(maxTicks = 10000) {
    const finalState = this.simEngine.runSimulationToCompletion(
      this.simState,
      this.vsmState.steps,
      this.vsmState.connections,
      maxTicks
    )
    useSimulationStore.setState(finalState)
  }

  resetSimulation() {
    this.simState.reset()
  }

  createScenario() {
    const { steps, connections } = this.vsmState
    const scenario = {
      id: crypto.randomUUID(),
      name: `Scenario ${this.simState.scenarios.length + 1}`,
      // Deep copy steps and connections
      steps: steps.map((s) => ({ ...s })),
      connections: connections.map((c) => ({ ...c })),
      saved: false,
    }
    this.simState.addScenario(scenario)
    return scenario
  }
}

setWorldConstructor(VSMWorld)