import { useSimulationStore } from '../../../src/stores/simulationStore.js'
import * as simEngine from '../../../src/utils/simulation/simulationEngine.js'

export class SimulationTestHelper {
  constructor(vsmHelper) {
    this.vsmHelper = vsmHelper
    this.store = useSimulationStore
    this.engine = simEngine
  }

  get state() {
    return this.store.getState()
  }

  initSimulation() {
    const { steps, connections } = this.vsmHelper.state
    const config = { workItemCount: this.state.workItemCount }
    const initialState = this.engine.initSimulation(steps, connections, config)
    this.store.setState(initialState)
  }

  generateWorkItems(count) {
    const firstStep = this.vsmHelper.state.steps[0]
    return this.engine.generateWorkItems(count, firstStep?.id)
  }

  processTick() {
    const state = this.engine.processTick(
      this.state,
      this.vsmHelper.state.steps,
      this.vsmHelper.state.connections
    )
    this.store.setState(state)
  }

  detectBottlenecks() {
    const bottlenecks = this.engine.detectBottlenecks(
      this.vsmHelper.state.steps,
      this.state.queueSizesByStepId
    )
    this.store.getState().setDetectedBottlenecks(bottlenecks)
  }

  runSimulationToCompletion(maxTicks = 10000) {
    const finalState = this.engine.runSimulationToCompletion(
      this.state,
      this.vsmHelper.state.steps,
      this.vsmHelper.state.connections,
      maxTicks
    )
    this.store.setState(finalState)
  }

  resetSimulation() {
    this.state.reset()
  }

  createScenario() {
    const { steps, connections } = this.vsmHelper.state
    const scenario = {
      id: crypto.randomUUID(),
      name: `Scenario ${this.state.scenarios.length + 1}`,
      steps: steps.map((s) => ({ ...s })),
      connections: connections.map((c) => ({ ...c })),
      saved: false,
    }
    this.state.addScenario(scenario)
    return scenario
  }
}
