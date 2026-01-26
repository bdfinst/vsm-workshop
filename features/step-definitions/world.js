import { setWorldConstructor, World } from '@cucumber/cucumber'
import { useVsmStore } from '../../src/stores/vsmStore.js'
import { useSimulationStore } from '../../src/stores/simulationStore.js'
import { VSMTestHelper } from './helpers/VSMTestHelper.js'
import { SimulationTestHelper } from './helpers/SimulationTestHelper.js'

// Get the initial state from the stores to reset them for each scenario
const vsmInitialState = useVsmStore.getState()
const simInitialState = useSimulationStore.getState()

class VSMWorld extends World {
  constructor(options) {
    super(options)
    // Reset stores before each scenario
    useVsmStore.setState(vsmInitialState, true)
    useSimulationStore.setState(simInitialState, true)

    // Verify stores are in clean state
    const vsmState = useVsmStore.getState()
    const simState = useSimulationStore.getState()

    if (vsmState.steps.length !== 0) {
      throw new Error('VSM store was not properly reset: steps array is not empty')
    }
    if (vsmState.connections.length !== 0) {
      throw new Error('VSM store was not properly reset: connections array is not empty')
    }
    if (simState.workItems.length !== 0) {
      throw new Error('Simulation store was not properly reset: workItems array is not empty')
    }

    // Initialize concern-based operations objects
    this.vsm = new VSMTestHelper()
    this.simulation = new SimulationTestHelper(this.vsm)

    // Error state
    this.error = null

    // Scenario state
    this.baselineResults = null
    this.scenarioResults = null
    this.duplicateAttempt = false
    this.pendingDelete = null
  }

  // Convenience accessors for store state
  get vsmState() {
    return this.vsm.state
  }

  get simState() {
    return this.simulation.state
  }
}

setWorldConstructor(VSMWorld)