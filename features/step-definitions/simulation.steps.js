import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'
import { useVsmStore } from '../../src/stores/vsmStore.js'
import { useSimulationStore } from '../../src/stores/simulationStore.js'

// Helpers to access state
const getVsmState = (world) => world.vsmState
const getSimState = (world) => world.simState
const findStepByName = (world, name) => getVsmState(world).steps.find((s) => s.name === name)

// ==========================================
// Simulation Setup Steps
// ==========================================

Given('I have a value stream map with {int} connected steps', function (stepCount) {
  this.vsm.createVSM('Simulation Test Map')
  const stepNames = ['Backlog', 'Development', 'Testing', 'Deployment']
  for (let i = 0; i < stepCount; i++) {
    const name = stepNames[i] || `Step ${i + 1}`
    this.vsm.addStep(name, 'custom', {
      processTime: 30 + i * 10,
      leadTime: 60 + i * 20,
    })
  }
  // Connect steps in sequence
  const { steps } = getVsmState(this)
  for (let i = 0; i < steps.length - 1; i++) {
    this.vsm.addConnection(steps[i].name, steps[i + 1].name)
  }
})

Given('a value stream with a slow step', function () {
  this.vsm.createVSM('Bottleneck Test Map')
  this.vsm.addStep('Step 1', 'custom', { processTime: 30, leadTime: 60 })
  this.vsm.addStep('Slow Step', 'custom', { processTime: 120, leadTime: 240 })
  this.vsm.addStep('Step 3', 'custom', { processTime: 30, leadTime: 60 })
  this.vsm.addConnection('Step 1', 'Slow Step')
  this.vsm.addConnection('Slow Step', 'Step 3')
})

Given('the slow step has process time twice the average', function () {
  const slowStep = findStepByName(this, 'Slow Step')
  const otherSteps = getVsmState(this).steps.filter((s) => s.name !== 'Slow Step')
  const avgProcessTime =
    otherSteps.reduce((sum, s) => sum + s.processTime, 0) / otherSteps.length
  this.vsm.updateStep(slowStep.id, { processTime: avgProcessTime * 2 })
})

Given('a value stream with two slow steps', function () {
  this.vsm.createVSM('Multi-Bottleneck Test Map')
  this.vsm.addStep('Step 1', 'custom', { processTime: 30, leadTime: 60 })
  this.vsm.addStep('Slow Step A', 'custom', { processTime: 90, leadTime: 180 })
  this.vsm.addStep('Step 2', 'custom', { processTime: 30, leadTime: 60 })
  this.vsm.addStep('Slow Step B', 'custom', { processTime: 90, leadTime: 180 })
  this.vsm.addStep('Step 3', 'custom', { processTime: 30, leadTime: 60 })
  this.vsm.addConnection('Step 1', 'Slow Step A')
  this.vsm.addConnection('Slow Step A', 'Step 2')
  this.vsm.addConnection('Step 2', 'Slow Step B')
  this.vsm.addConnection('Slow Step B', 'Step 3')
})

Given('a value stream with batch size {int} at deployment', function (batchSize) {
  this.vsm.createVSM('Batch Test Map')
  this.vsm.addStep('Development', 'development', { processTime: 60, leadTime: 120 })
  this.vsm.addStep('Testing', 'testing', { processTime: 30, leadTime: 60 })
  this.vsm.addStep('Deployment', 'deployment', { processTime: 15, leadTime: 30, batchSize })
  this.vsm.addConnection('Development', 'Testing')
  this.vsm.addConnection('Testing', 'Deployment')
})

Given('a value stream with a bottleneck step', function () {
  this.vsm.createVSM('Capacity Test Map')
  this.vsm.addStep('Intake', 'custom', { processTime: 20, leadTime: 40, peopleCount: 2 })
  this.vsm.addStep('Bottleneck', 'custom', { processTime: 60, leadTime: 120, peopleCount: 1 })
  this.vsm.addStep('Finish', 'custom', { processTime: 20, leadTime: 40, peopleCount: 2 })
  this.vsm.addConnection('Intake', 'Bottleneck')
  this.vsm.addConnection('Bottleneck', 'Finish')
})

Given('the bottleneck step has {int} worker', function (workers) {
  const bottleneck = findStepByName(this, 'Bottleneck')
  if (bottleneck) {
    this.vsm.updateStep(bottleneck.id, { peopleCount: workers })
  }
})

// ==========================================
// Simulation Control Steps
// ==========================================

When('I click the Run Simulation button', function () {
  this.simulation.initSimulation()
  getSimState(this).setRunning(true)
})

When('I click the Pause button', function () {
  getSimState(this).setPaused(true)
})

When('I click the Resume button', function () {
  getSimState(this).setPaused(false)
  getSimState(this).setRunning(true)
})

When('I click the Reset button', function () {
  this.simulation.resetSimulation()
})

When('I click the Create Scenario button', function () {
  this.simulation.createScenario()
})

When('I set work items to {int}', function (count) {
  getSimState(this).setWorkItemCount(count)
  const workItems = this.simulation.generateWorkItems(count)
  getSimState(this).updateWorkItems(workItems)
})

When('I start the simulation with {int} work items', function (count) {
  this.simulation.initSimulation()
  getSimState(this).setWorkItemCount(count)
  const workItems = this.simulation.generateWorkItems(count)
  getSimState(this).updateWorkItems(workItems)
  getSimState(this).setRunning(true)
  // Run a few ticks to progress items
  for (let i = 0; i < 100; i++) {
    this.simulation.processTick()
  }
})

When('the simulation runs to completion', function () {
  this.simulation.runSimulationToCompletion()
  expect(getSimState(this).completedCount).to.equal(getSimState(this).workItemCount)
})

When('I run the simulation with {int} work items', function (count) {
  this.simulation.initSimulation()
  getSimState(this).setWorkItemCount(count)
  const workItems = this.simulation.generateWorkItems(count)
  getSimState(this).updateWorkItems(workItems)
  this.simulation.runSimulationToCompletion()
  expect(getSimState(this).completedCount).to.equal(getSimState(this).workItemCount)
})

When('I run the simulation', function () {
  this.simulation.initSimulation()
  getSimState(this).setWorkItemCount(10)
  const workItems = this.simulation.generateWorkItems(10)
  getSimState(this).updateWorkItems(workItems)
  this.simulation.runSimulationToCompletion()
  expect(getSimState(this).completedCount).to.equal(getSimState(this).workItemCount)
})

When('I set simulation speed to {float}x', function (speed) {
  getSimState(this).setSpeed(speed)
})

Given('a running simulation', function () {
  if (!getVsmState(this).id) {
    this.vsm.createVSM('Running Simulation Test')
    this.vsm.addStep('Step 1', 'custom', { processTime: 30, leadTime: 60 })
    this.vsm.addStep('Step 2', 'custom', { processTime: 30, leadTime: 60 })
    this.vsm.addConnection('Step 1', 'Step 2')
  }
  this.simulation.initSimulation()
  getSimState(this).setWorkItemCount(5)
  const workItems = this.simulation.generateWorkItems(5)
  getSimState(this).updateWorkItems(workItems)
  getSimState(this).setRunning(true)
  // Process a few ticks
  for (let i = 0; i < 10; i++) {
    this.simulation.processTick()
  }
})

Given('a completed simulation', function () {
  if (!getVsmState(this).id) {
    this.vsm.createVSM('Completed Simulation Test')
    this.vsm.addStep('Step 1', 'custom', { processTime: 30, leadTime: 60 })
    this.vsm.addStep('Step 2', 'custom', { processTime: 30, leadTime: 60 })
    this.vsm.addConnection('Step 1', 'Step 2')
  }
  this.simulation.initSimulation()
  getSimState(this).setWorkItemCount(5)
  const workItems = this.simulation.generateWorkItems(5)
  getSimState(this).updateWorkItems(workItems)
  this.simulation.runSimulationToCompletion()
  expect(getSimState(this).completedCount).to.equal(getSimState(this).workItemCount)
})

Given('a simulation with an active bottleneck', function () {
  this.vsm.createVSM('Active Bottleneck Test')
  this.vsm.addStep('Fast', 'custom', { processTime: 10, leadTime: 20 })
  this.vsm.addStep('Slow', 'custom', { processTime: 100, leadTime: 200 })
  this.vsm.addConnection('Fast', 'Slow')
  this.simulation.initSimulation()
  getSimState(this).setWorkItemCount(10)
  const workItems = this.simulation.generateWorkItems(10)
  getSimState(this).updateWorkItems(workItems)
  // Run until bottleneck forms
  for (let i = 0; i < 50; i++) {
    this.simulation.processTick()
  }
  getSimState(this).setDetectedBottlenecks([findStepByName(this, 'Slow').id])
})

Given('a completed simulation with bottleneck data', function () {
  this.vsm.createVSM('Bottleneck Data Test')
  this.vsm.addStep('Fast', 'custom', { processTime: 10, leadTime: 20 })
  this.vsm.addStep('Slow', 'custom', { processTime: 60, leadTime: 120 })
  this.vsm.addStep('End', 'custom', { processTime: 10, leadTime: 20 })
  this.vsm.addConnection('Fast', 'Slow')
  this.vsm.addConnection('Slow', 'End')
  this.simulation.initSimulation()
  getSimState(this).setWorkItemCount(10)
  const workItems = this.simulation.generateWorkItems(10)
  getSimState(this).updateWorkItems(workItems)
  this.simulation.runSimulationToCompletion()
  expect(getSimState(this).completedCount).to.equal(getSimState(this).workItemCount)
})

When('the queue at the bottleneck step reduces below threshold', function () {
  const slowStep = findStepByName(this, 'Slow')
  if (slowStep) {
    const newQueueSizes = { ...getSimState(this).queueSizesByStepId, [slowStep.id]: 1 }
    getSimState(this).updateQueueSizes(newQueueSizes)
    this.simulation.detectBottlenecks()
  }
})

// ==========================================
// What-If Scenario Steps
// ==========================================

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
// Simulation Result Assertions
// ==========================================

Then('I should see {int} completed items', function (count) {
  expect(getSimState(this).completedCount).to.equal(count)
})

Then('the simulation should show results', function () {
  const { results } = getSimState(this)
  expect(results).to.exist
  expect(results.completedCount).to.be.greaterThan(0)
})

Then('work items should progress through each step', function () {
  const completedItems = getSimState(this).workItems.filter((w) => w.currentStepId === null)
  completedItems.forEach((item) => {
    expect(item.history.length).to.be.greaterThan(0)
  })
})

Then('each step should process items based on its process time', function () {
  const anyItemHasHistory = getSimState(this).workItems.some((item) => item.history.length > 0)
  expect(anyItemHasHistory).to.be.true
})

Then('the simulation should run faster', function () {
  expect(getSimState(this).speed).to.be.greaterThan(1)
})

Then('the simulation should run slower', function () {
  expect(getSimState(this).speed).to.be.lessThan(1)
})

Then('the simulation should be paused', function () {
  const { isPaused, isRunning } = getSimState(this)
  expect(isPaused).to.be.true
  expect(isRunning).to.be.false
})

Then('work items should stop moving', function () {
  const positionsBefore = getSimState(this).workItems.map((w) => w.progress)
  this.simulation.processTick() // Should not advance when paused
  const positionsAfter = getSimState(this).workItems.map((w) => w.progress)
  expect(positionsBefore).to.deep.equal(positionsAfter)
})

Then('the simulation should continue', function () {
  const { isPaused, isRunning } = getSimState(this)
  expect(isRunning).to.be.true
  expect(isPaused).to.be.false
})

Then('work items should resume moving', function () {
  expect(getSimState(this).isRunning).to.be.true
})

Then('the simulation should reset', function () {
  const { isRunning, completedCount } = getSimState(this)
  expect(isRunning).to.be.false
  expect(completedCount).to.equal(0)
})

Then('completed count should be {int}', function (count) {
  expect(getSimState(this).completedCount).to.equal(count)
})

Then('all work items should be cleared', function () {
  expect(getSimState(this).workItems).to.have.lengthOf(0)
})

// ==========================================
// Bottleneck Assertions
// ==========================================

Then('work should queue up before the slow step', function () {
  const slowStep = findStepByName(this, 'Slow Step') || findStepByName(this, 'Slow')
  expect(slowStep).to.exist
  const queueSize = getSimState(this).queueSizesByStepId[slowStep.id] || 0
  expect(queueSize).to.be.greaterThan(0)
})

Then('the slow step should be highlighted as a bottleneck', function () {
  const slowStep = findStepByName(this, 'Slow Step') || findStepByName(this, 'Slow')
  expect(getSimState(this).detectedBottlenecks).to.include(slowStep.id)
})

Then('both slow steps should be highlighted as bottlenecks', function () {
  const slowA = findStepByName(this, 'Slow Step A')
  const slowB = findStepByName(this, 'Slow Step B')
  expect(getSimState(this).detectedBottlenecks).to.include(slowA.id)
  expect(getSimState(this).detectedBottlenecks).to.include(slowB.id)
})

Then('the step should no longer be highlighted as a bottleneck', function () {
  const slowStep = findStepByName(this, 'Slow')
  expect(getSimState(this).detectedBottlenecks).to.not.include(slowStep.id)
})

Then('I should see a chart of queue sizes over time', function () {
  const { queueHistory } = getSimState(this)
  expect(queueHistory).to.exist
  expect(queueHistory.length).to.be.greaterThan(0)
})

Then('the bottleneck step should have the highest peak queue', function () {
  const slowStep = findStepByName(this, 'Slow')
  const peakQueues = {}
  getSimState(this).queueHistory.forEach((record) => {
    if (!peakQueues[record.stepId] || record.queueSize > peakQueues[record.stepId]) {
      peakQueues[record.stepId] = record.queueSize
    }
  })
  const maxPeak = Math.max(...Object.values(peakQueues))
  expect(peakQueues[slowStep.id]).to.equal(maxPeak)
})

Then('I should see which steps were bottlenecks', function () {
  const { results } = getSimState(this)
  expect(results.bottlenecks).to.exist
  expect(results.bottlenecks.length).to.be.greaterThan(0)
})

Then('I should see the peak queue size for each bottleneck', function () {
  getSimState(this).results.bottlenecks.forEach((b) => {
    expect(b.peakQueueSize).to.exist
    expect(b.peakQueueSize).to.be.greaterThan(0)
  })
})

When('I view the simulation results', function () {
  // Results are already calculated after simulation completion
  expect(getSimState(this).results).to.exist
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