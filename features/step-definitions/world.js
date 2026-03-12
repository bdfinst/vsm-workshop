import { setWorldConstructor, World } from '@cucumber/cucumber'
import {
  vsmDataStore,
  vsmUIStore,
  simControlStore,
  simDataStore,
  scenarioStore,
} from './helpers/testStores.js'
import { createVSMTestHelper } from './helpers/VSMTestHelper.js'
import { createSimulationTestHelper } from './helpers/SimulationTestHelper.js'

class VSMWorld extends World {
  constructor(options) {
    super(options)
    // Reset all stores before each scenario
    vsmDataStore.clearMap()
    vsmUIStore.clearUIState()
    simControlStore.reset()
    simDataStore.reset()
    scenarioStore.reset()

    // Reset workItemCount to default
    simDataStore.setWorkItemCount(10)

    // Verify stores are in clean state
    if (vsmDataStore.steps.length !== 0) {
      throw new Error(
        'VSM store was not properly reset: steps array is not empty'
      )
    }
    if (vsmDataStore.connections.length !== 0) {
      throw new Error(
        'VSM store was not properly reset: connections array is not empty'
      )
    }
    if (simDataStore.workItems.length !== 0) {
      throw new Error(
        'Simulation store was not properly reset: workItems array is not empty'
      )
    }

    // Initialize concern-based operations objects
    this.vsm = createVSMTestHelper()
    this.simulation = createSimulationTestHelper(this.vsm)

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
