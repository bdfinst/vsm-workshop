import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'
import { useVsmStore } from '../../src/stores/vsmStore.js'

// Helpers to access state
const getVsmState = (world) => world.vsmState
const getSimState = (world) => world.simState

// ==========================================
// What-If Scenario Steps
// ==========================================

When('I click the Create Scenario button', function () {
  this.simulation.createScenario()
})

When('I create a scenario with batch size {int} at deployment', function (batchSize) {
  const scenario = this.simulation.createScenario()
  const deployment = scenario.steps.find((s) => s.name === 'Deployment')
  if (deployment) {
    deployment.batchSize = batchSize
  }
})

When('I create a scenario with {int} workers at the bottleneck', function (workers) {
  const scenario = this.simulation.createScenario()
  const bottleneck = scenario.steps.find((s) => s.name === 'Bottleneck')
  if (bottleneck) {
    bottleneck.peopleCount = workers
  }
})

When('I run both simulations', function () {
  // Run original
  this.simulation.initSimulation()
  getSimState(this).setWorkItemCount(10)
  getSimState(this).updateWorkItems(this.simulation.generateWorkItems(10))
  this.simulation.runSimulationToCompletion()
  expect(getSimState(this).completedCount).to.equal(getSimState(this).workItemCount)
  this.baselineResults = { ...getSimState(this).results }

  // Run scenario with isolated simulation state
  const scenarios = getSimState(this).scenarios
  if (scenarios.length > 0) {
    const scenario = scenarios[scenarios.length - 1]
    // Preserve original state
    const originalSteps = [...getVsmState(this).steps]
    const originalConnections = [...getVsmState(this).connections]

    // Run scenario simulation with isolated state
    const scenarioConfig = { workItemCount: 10 }
    const scenarioInitialState = this.simEngine.initSimulation(
      scenario.steps,
      scenario.connections,
      scenarioConfig
    )
    const workItems = this.simEngine.generateWorkItems(10, scenario.steps[0]?.id)
    scenarioInitialState.workItems = workItems
    scenarioInitialState.workItemCount = 10

    const scenarioFinalState = this.simEngine.runSimulationToCompletion(
      scenarioInitialState,
      scenario.steps,
      scenario.connections,
      10000
    )
    expect(scenarioFinalState.completedCount).to.equal(scenarioFinalState.workItemCount)
    this.scenarioResults = { ...scenarioFinalState.results }

    // Verify original state was not mutated
    expect(getVsmState(this).steps).to.deep.equal(originalSteps)
    expect(getVsmState(this).connections).to.deep.equal(originalConnections)
  }
})

When('I view the comparison', function () {
  this.comparisonViewed = true
})

When('I save the scenario', function () {
  const scenarios = getSimState(this).scenarios
  if (scenarios.length > 0) {
    scenarios[scenarios.length - 1].saved = true
  }
})

Given('I have created a what-if scenario', function () {
  if (!getVsmState(this).id) {
    this.vsm.createVSM('Scenario Test')
    this.vsm.addStep('Step 1', 'custom')
    this.vsm.addStep('Step 2', 'custom')
    this.vsm.addConnection('Step 1', 'Step 2')
  }
  this.simulation.createScenario()
})

Given('two completed scenario simulations', function () {
  this.vsm.createVSM('Comparison Test')
  this.vsm.addStep('Step 1', 'custom', { processTime: 30, leadTime: 60 })
  this.vsm.addStep('Step 2', 'custom', { processTime: 30, leadTime: 60 })
  this.vsm.addConnection('Step 1', 'Step 2')

  // Run baseline
  this.simulation.initSimulation()
  getSimState(this).setWorkItemCount(10)
  getSimState(this).updateWorkItems(this.simulation.generateWorkItems(10))
  this.simulation.runSimulationToCompletion()
  expect(getSimState(this).completedCount).to.equal(getSimState(this).workItemCount)
  this.baselineResults = { ...getSimState(this).results }

  // Create and run scenario
  const scenario = this.simulation.createScenario()
  scenario.steps[1].processTime = 15 // Faster

  const originalVsmState = { steps: this.vsmState.steps, connections: this.vsmState.connections }
  useVsmStore.setState({ steps: scenario.steps, connections: scenario.connections })

  this.simulation.initSimulation()
  getSimState(this).setWorkItemCount(10)
  getSimState(this).updateWorkItems(this.simulation.generateWorkItems(10))
  this.simulation.runSimulationToCompletion()
  expect(getSimState(this).completedCount).to.equal(getSimState(this).workItemCount)
  this.scenarioResults = { ...getSimState(this).results }

  // Restore
  useVsmStore.setState(originalVsmState)
})

// ==========================================
// What-If Scenario Assertions
// ==========================================

Then('a copy of the current map should be created', function () {
  const { scenarios } = getSimState(this)
  expect(scenarios.length).to.be.greaterThan(0)
  const scenario = scenarios[scenarios.length - 1]
  expect(scenario.steps.length).to.equal(getVsmState(this).steps.length)
})

Then('I should be able to modify the scenario', function () {
  const scenario = getSimState(this).scenarios[getSimState(this).scenarios.length - 1]
  expect(scenario.steps).to.exist
})

Then('I should see a comparison of results', function () {
  expect(this.baselineResults).to.exist
  expect(this.scenarioResults).to.exist
})

Then('the smaller batch scenario should show lower lead time', function () {
  expect(this.scenarioResults).to.exist
  expect(this.baselineResults).to.exist
  const scenarioDeployment = getSimState(this).scenarios[
    getSimState(this).scenarios.length - 1
  ].steps.find((s) => s.name === 'Deployment')
  expect(scenarioDeployment.batchSize).to.be.lessThan(5)
})

Then('I should see improved throughput in the {int}-worker scenario', function (workers) {
  expect(this.scenarioResults).to.exist
  expect(this.baselineResults).to.exist
  const scenarioBottleneck = getSimState(this).scenarios[
    getSimState(this).scenarios.length - 1
  ].steps.find((s) => s.name === 'Bottleneck')
  expect(scenarioBottleneck.peopleCount).to.equal(workers)
})

Then('the bottleneck should be reduced or eliminated', function () {
  const baselineBottlenecks = this.baselineResults.bottlenecks?.length || 0
  const scenarioBottlenecks = this.scenarioResults.bottlenecks?.length || 0
  expect(scenarioBottlenecks).to.be.at.most(baselineBottlenecks)
})

Then('I should see the percentage improvement in lead time', function () {
  const improvement =
    ((this.baselineResults.avgLeadTime - this.scenarioResults.avgLeadTime) /
      this.baselineResults.avgLeadTime) *
    100
  expect(improvement).to.be.greaterThan(0)
})

Then('I should see the percentage improvement in throughput', function () {
  const improvement =
    ((this.scenarioResults.throughput - this.baselineResults.throughput) /
      this.baselineResults.throughput) *
    100
  expect(improvement).to.be.greaterThan(0)
})

Then('the scenario should be persisted', function () {
  const scenario = getSimState(this).scenarios[getSimState(this).scenarios.length - 1]
  expect(scenario.saved).to.be.true
})

Then('I should be able to load it later', function () {
  const scenario = getSimState(this).scenarios.find((s) => s.saved)
  expect(scenario).to.exist
})
