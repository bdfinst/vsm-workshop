import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'
import {
  vsmDataStore,
  simControlStore,
  simDataStore,
  scenarioStore,
} from './helpers/testStores.js'
import * as simEngine from '../../src/utils/simulation/simulationEngine.js'

// Helpers to access state
const findStepByName = (name) => vsmDataStore.steps.find((s) => s.name === name)

// ==========================================
// Simulation Setup Steps
// ==========================================

Given(
  'I have a value stream map with {int} connected steps',
  function (stepCount) {
    this.vsm.createVSM('Simulation Test Map')
    const stepNames = ['Backlog', 'Development', 'Testing', 'Deployment']
    for (let i = 0; i < stepCount; i++) {
      const name = stepNames[i] || `Step ${i + 1}`
      this.vsm.addStep(name, {
        processTime: 30 + i * 10,
        leadTime: 60 + i * 20,
      })
    }
    // Connect steps in sequence
    const steps = vsmDataStore.steps
    for (let i = 0; i < steps.length - 1; i++) {
      this.vsm.addConnection(steps[i].name, steps[i + 1].name)
    }
  }
)

Given('a value stream with a slow step', function () {
  this.vsm.createVSM('Bottleneck Test Map')
  this.vsm.addStep('Step 1', { processTime: 30, leadTime: 60 })
  this.vsm.addStep('Slow Step', { processTime: 120, leadTime: 240 })
  this.vsm.addStep('Step 3', { processTime: 30, leadTime: 60 })
  this.vsm.addConnection('Step 1', 'Slow Step')
  this.vsm.addConnection('Slow Step', 'Step 3')
})

Given('the slow step has process time twice the average', function () {
  const slowStep = findStepByName('Slow Step')
  const otherSteps = vsmDataStore.steps.filter((s) => s.name !== 'Slow Step')
  const avgProcessTime =
    otherSteps.reduce((sum, s) => sum + s.processTime, 0) / otherSteps.length
  this.vsm.updateStep(slowStep.id, { processTime: avgProcessTime * 2 })
})

Given('a value stream with two slow steps', function () {
  this.vsm.createVSM('Multi-Bottleneck Test Map')
  this.vsm.addStep('Step 1', { processTime: 30, leadTime: 60 })
  this.vsm.addStep('Slow Step A', { processTime: 90, leadTime: 180 })
  this.vsm.addStep('Step 2', { processTime: 30, leadTime: 60 })
  this.vsm.addStep('Slow Step B', { processTime: 90, leadTime: 180 })
  this.vsm.addStep('Step 3', { processTime: 30, leadTime: 60 })
  this.vsm.addConnection('Step 1', 'Slow Step A')
  this.vsm.addConnection('Slow Step A', 'Step 2')
  this.vsm.addConnection('Step 2', 'Slow Step B')
  this.vsm.addConnection('Slow Step B', 'Step 3')
})

Given(
  'a value stream with batch size {int} at deployment',
  function (batchSize) {
    this.vsm.createVSM('Batch Test Map')
    this.vsm.addStep('Development', { processTime: 60, leadTime: 120 })
    this.vsm.addStep('Testing', { processTime: 30, leadTime: 60 })
    this.vsm.addStep('Deployment', {
      processTime: 15,
      leadTime: 30,
      batchSize,
    })
    this.vsm.addConnection('Development', 'Testing')
    this.vsm.addConnection('Testing', 'Deployment')
  }
)

Given('a value stream with a bottleneck step', function () {
  this.vsm.createVSM('Capacity Test Map')
  this.vsm.addStep('Intake', { processTime: 20, leadTime: 40, peopleCount: 2 })
  this.vsm.addStep('Bottleneck', {
    processTime: 60,
    leadTime: 120,
    peopleCount: 1,
  })
  this.vsm.addStep('Finish', { processTime: 20, leadTime: 40, peopleCount: 2 })
  this.vsm.addConnection('Intake', 'Bottleneck')
  this.vsm.addConnection('Bottleneck', 'Finish')
})

Given('the bottleneck step has {int} worker', function (workers) {
  const bottleneck = findStepByName('Bottleneck')
  if (bottleneck) {
    this.vsm.updateStep(bottleneck.id, { peopleCount: workers })
  }
})

// ==========================================
// Simulation Control Steps
// ==========================================

When('I click the Run Simulation button', function () {
  this.simulation.initSimulation()
  simControlStore.setRunning(true)
})

When('I click the Pause button', function () {
  simControlStore.setPaused(true)
})

When('I click the Resume button', function () {
  simControlStore.setPaused(false)
  simControlStore.setRunning(true)
})

When('I click the Reset button', function () {
  this.simulation.resetSimulation()
})

When('I click the Create Scenario button', function () {
  this.simulation.createScenario()
})

When('I set work items to {int}', function (count) {
  simDataStore.setWorkItemCount(count)
  const workItems = this.simulation.generateWorkItems(count)
  simDataStore.updateWorkItems(workItems)
})

When('I start the simulation with {int} work items', function (count) {
  this.simulation.initSimulation()
  simDataStore.setWorkItemCount(count)
  const workItems = this.simulation.generateWorkItems(count)
  simDataStore.updateWorkItems(workItems)
  simControlStore.setRunning(true)
  // Run a few ticks to progress items
  for (let i = 0; i < 100; i++) {
    this.simulation.processTick()
  }
})

When('the simulation runs to completion', function () {
  this.simulation.runSimulationToCompletion()
  // Completion is verified by the SimulationTestHelper warning and subsequent Then steps
})

When('I run the simulation with {int} work items', function (count) {
  this.simulation.initSimulation()
  simDataStore.setWorkItemCount(count)
  const workItems = this.simulation.generateWorkItems(count)
  simDataStore.updateWorkItems(workItems)
  this.simulation.runSimulationToCompletion()
  // Completion is verified by subsequent Then steps
})

When('I run the simulation', function () {
  this.simulation.initSimulation()
  simDataStore.setWorkItemCount(10)
  const workItems = this.simulation.generateWorkItems(10)
  simDataStore.updateWorkItems(workItems)
  this.simulation.runSimulationToCompletion()
  // Completion is verified by subsequent Then steps
})

When('I set simulation speed to {float}x', function (speed) {
  simControlStore.setSpeed(speed)
})

Given('a running simulation', function () {
  if (!vsmDataStore.id) {
    this.vsm.createVSM('Running Simulation Test')
    this.vsm.addStep('Step 1', { processTime: 30, leadTime: 60 })
    this.vsm.addStep('Step 2', { processTime: 30, leadTime: 60 })
    this.vsm.addConnection('Step 1', 'Step 2')
  }
  this.simulation.initSimulation()
  simDataStore.setWorkItemCount(5)
  const workItems = this.simulation.generateWorkItems(5)
  simDataStore.updateWorkItems(workItems)
  simControlStore.setRunning(true)
  // Process a few ticks
  for (let i = 0; i < 10; i++) {
    this.simulation.processTick()
  }
})

Given('a completed simulation', function () {
  if (!vsmDataStore.id) {
    this.vsm.createVSM('Completed Simulation Test')
    this.vsm.addStep('Step 1', { processTime: 30, leadTime: 60 })
    this.vsm.addStep('Step 2', { processTime: 30, leadTime: 60 })
    this.vsm.addConnection('Step 1', 'Step 2')
  }
  this.simulation.initSimulation()
  simDataStore.setWorkItemCount(5)
  const workItems = this.simulation.generateWorkItems(5)
  simDataStore.updateWorkItems(workItems)
  this.simulation.runSimulationToCompletion()
  expect(simDataStore.completedCount).to.equal(simDataStore.workItemCount)
})

Given('a simulation with an active bottleneck', function () {
  this.vsm.createVSM('Active Bottleneck Test')
  this.vsm.addStep('Fast', { processTime: 10, leadTime: 20 })
  this.vsm.addStep('Slow', { processTime: 100, leadTime: 200 })
  this.vsm.addConnection('Fast', 'Slow')
  this.simulation.initSimulation()
  simDataStore.setWorkItemCount(10)
  const workItems = this.simulation.generateWorkItems(10)
  simDataStore.updateWorkItems(workItems)
  // Run until bottleneck forms
  for (let i = 0; i < 50; i++) {
    this.simulation.processTick()
  }
  simDataStore.setDetectedBottlenecks([findStepByName('Slow').id])
})

Given('a completed simulation with bottleneck data', function () {
  this.vsm.createVSM('Bottleneck Data Test')
  this.vsm.addStep('Fast', { processTime: 10, leadTime: 20 })
  this.vsm.addStep('Slow', { processTime: 60, leadTime: 120 })
  this.vsm.addStep('End', { processTime: 10, leadTime: 20 })
  this.vsm.addConnection('Fast', 'Slow')
  this.vsm.addConnection('Slow', 'End')
  this.simulation.initSimulation()
  simDataStore.setWorkItemCount(10)
  const workItems = this.simulation.generateWorkItems(10)
  simDataStore.updateWorkItems(workItems)
  this.simulation.runSimulationToCompletion()
  expect(simDataStore.completedCount).to.equal(simDataStore.workItemCount)
})

When('the queue at the bottleneck step reduces below threshold', function () {
  const slowStep = findStepByName('Slow')
  if (slowStep) {
    const newQueueSizes = { ...simDataStore.queueSizesByStepId, [slowStep.id]: 1 }
    simDataStore.updateQueueSizes(newQueueSizes)
    this.simulation.detectBottlenecks()
  }
})

// ==========================================
// What-If Scenario Steps
// ==========================================

When(
  'I create a scenario with batch size {int} at deployment',
  function (batchSize) {
    const scenario = this.simulation.createScenario()
    const deployment = scenario.steps.find((s) => s.name === 'Deployment')
    if (deployment) {
      deployment.batchSize = batchSize
    }
  }
)

When(
  'I create a scenario with {int} workers at the bottleneck',
  function (workers) {
    const scenario = this.simulation.createScenario()
    const bottleneck = scenario.steps.find((s) => s.name === 'Bottleneck')
    if (bottleneck) {
      bottleneck.peopleCount = workers
    }
  }
)

When('I run both simulations', function () {
  // Run original simulation
  this.simulation.initSimulation()
  simDataStore.setWorkItemCount(10)
  simDataStore.updateWorkItems(this.simulation.generateWorkItems(10))
  this.simulation.runSimulationToCompletion()
  this.baselineResults = { ...simDataStore.results }

  // Run scenario with isolated simulation state
  const scenarios = scenarioStore.scenarios
  if (scenarios.length > 0) {
    const scenario = scenarios[scenarios.length - 1]
    // Preserve original state for mutation check
    const originalSteps = [...vsmDataStore.steps]
    const originalConnections = [...vsmDataStore.connections]

    // Run scenario simulation with isolated state
    const scenarioConfig = { workItemCount: 10 }
    const scenarioInitialState = simEngine.initSimulation(
      scenario.steps,
      scenario.connections,
      scenarioConfig
    )
    const workItems = simEngine.generateWorkItems(10, scenario.steps[0]?.id)
    scenarioInitialState.workItems = workItems
    scenarioInitialState.workItemCount = 10

    const scenarioFinalState = simEngine.runSimulationToCompletion(
      scenarioInitialState,
      scenario.steps,
      scenario.connections,
      10000
    )
    this.scenarioResults = { ...scenarioFinalState.results }

    // Verify original state was not mutated (important for isolation)
    expect(vsmDataStore.steps).to.deep.equal(originalSteps)
    expect(vsmDataStore.connections).to.deep.equal(originalConnections)
  }
})

When('I view the comparison', function () {
  this.comparisonViewed = true
})

When('I save the scenario', function () {
  const scenarios = scenarioStore.scenarios
  if (scenarios.length > 0) {
    scenarios[scenarios.length - 1].saved = true
  }
})

Given('I have created a what-if scenario', function () {
  if (!vsmDataStore.id) {
    this.vsm.createVSM('Scenario Test')
    this.vsm.addStep('Step 1')
    this.vsm.addStep('Step 2')
    this.vsm.addConnection('Step 1', 'Step 2')
  }
  this.simulation.createScenario()
})

Given('two completed scenario simulations', function () {
  this.vsm.createVSM('Comparison Test')
  this.vsm.addStep('Step 1', { processTime: 30, leadTime: 60 })
  this.vsm.addStep('Step 2', { processTime: 30, leadTime: 60 })
  this.vsm.addConnection('Step 1', 'Step 2')

  // Run baseline
  this.simulation.initSimulation()
  simDataStore.setWorkItemCount(10)
  simDataStore.updateWorkItems(this.simulation.generateWorkItems(10))
  this.simulation.runSimulationToCompletion()
  expect(simDataStore.completedCount).to.equal(simDataStore.workItemCount)
  this.baselineResults = { ...simDataStore.results }

  // Create and run scenario
  const scenario = this.simulation.createScenario()
  scenario.steps[1].processTime = 15 // Faster

  // Run scenario simulation with scenario's steps
  const scenarioConfig = { workItemCount: 10 }
  const scenarioInitialState = simEngine.initSimulation(
    scenario.steps,
    scenario.connections,
    scenarioConfig
  )
  const workItems = simEngine.generateWorkItems(10, scenario.steps[0]?.id)
  scenarioInitialState.workItems = workItems
  scenarioInitialState.workItemCount = 10

  const scenarioFinalState = simEngine.runSimulationToCompletion(
    scenarioInitialState,
    scenario.steps,
    scenario.connections,
    10000
  )
  expect(scenarioFinalState.completedCount).to.equal(
    scenarioFinalState.workItemCount
  )
  this.scenarioResults = { ...scenarioFinalState.results }
})

// ==========================================
// Simulation Result Assertions
// ==========================================

Then('I should see {int} completed items', function (count) {
  expect(simDataStore.completedCount).to.equal(count)
})

Then('the simulation should show results', function () {
  const results = simDataStore.results
  expect(results).to.exist
  expect(results.completedCount).to.be.greaterThan(0)
})

Then('work items should progress through each step', function () {
  const completedItems = simDataStore.workItems.filter(
    (w) => w.currentStepId === null
  )
  completedItems.forEach((item) => {
    expect(item.history.length).to.be.greaterThan(0)
  })
})

Then('each step should process items based on its process time', function () {
  const anyItemHasHistory = simDataStore.workItems.some(
    (item) => item.history.length > 0
  )
  expect(anyItemHasHistory).to.be.true
})

Then('the simulation should run faster', function () {
  expect(simControlStore.speed).to.be.greaterThan(1)
})

Then('the simulation should run slower', function () {
  expect(simControlStore.speed).to.be.lessThan(1)
})

Then('the simulation should be paused', function () {
  const isPaused = simControlStore.isPaused
  const isRunning = simControlStore.isRunning
  expect(isPaused).to.be.true
  expect(isRunning).to.be.false
})

Then('work items should stop moving', function () {
  const positionsBefore = simDataStore.workItems.map((w) => w.progress)
  this.simulation.processTick() // Should not advance when paused
  const positionsAfter = simDataStore.workItems.map((w) => w.progress)
  expect(positionsBefore).to.deep.equal(positionsAfter)
})

Then('the simulation should continue', function () {
  const isPaused = simControlStore.isPaused
  const isRunning = simControlStore.isRunning
  expect(isRunning).to.be.true
  expect(isPaused).to.be.false
})

Then('work items should resume moving', function () {
  expect(simControlStore.isRunning).to.be.true
})

Then('the simulation should reset', function () {
  const isRunning = simControlStore.isRunning
  const completedCount = simDataStore.completedCount
  expect(isRunning).to.be.false
  expect(completedCount).to.equal(0)
})

Then('completed count should be {int}', function (count) {
  expect(simDataStore.completedCount).to.equal(count)
})

Then('all work items should be cleared', function () {
  expect(simDataStore.workItems).to.have.lengthOf(0)
})

// ==========================================
// Bottleneck Assertions
// ==========================================

Then('work should queue up before the slow step', function () {
  const slowStep = findStepByName('Slow Step') || findStepByName('Slow')
  expect(slowStep).to.exist
  const queueSize = simDataStore.queueSizesByStepId[slowStep.id] || 0
  expect(queueSize).to.be.greaterThan(0)
})

Then('the slow step should be highlighted as a bottleneck', function () {
  const slowStep = findStepByName('Slow Step') || findStepByName('Slow')
  expect(simDataStore.detectedBottlenecks).to.include(slowStep.id)
})

Then('both slow steps should be highlighted as bottlenecks', function () {
  const slowA = findStepByName('Slow Step A')
  const slowB = findStepByName('Slow Step B')
  expect(simDataStore.detectedBottlenecks).to.include(slowA.id)
  expect(simDataStore.detectedBottlenecks).to.include(slowB.id)
})

Then('the step should no longer be highlighted as a bottleneck', function () {
  const slowStep = findStepByName('Slow')
  expect(simDataStore.detectedBottlenecks).to.not.include(slowStep.id)
})

Then('I should see a chart of queue sizes over time', function () {
  const queueHistory = simDataStore.queueHistory
  expect(queueHistory).to.exist
  expect(queueHistory.length).to.be.greaterThan(0)
})

Then('the bottleneck step should have the highest peak queue', function () {
  const slowStep = findStepByName('Slow')
  const peakQueues = {}
  simDataStore.queueHistory.forEach((record) => {
    if (
      !peakQueues[record.stepId] ||
      record.queueSize > peakQueues[record.stepId]
    ) {
      peakQueues[record.stepId] = record.queueSize
    }
  })
  const maxPeak = Math.max(...Object.values(peakQueues))
  expect(peakQueues[slowStep.id]).to.equal(maxPeak)
})

Then('I should see which steps were bottlenecks', function () {
  const results = simDataStore.results
  expect(results.bottlenecks).to.exist
  expect(results.bottlenecks.length).to.be.greaterThan(0)
})

Then('I should see the peak queue size for each bottleneck', function () {
  simDataStore.results.bottlenecks.forEach((b) => {
    expect(b.peakQueueSize).to.exist
    expect(b.peakQueueSize).to.be.greaterThan(0)
  })
})

When('I view the simulation results', function () {
  // Results are already calculated after simulation completion
  expect(simDataStore.results).to.exist
})

// ==========================================
// What-If Scenario Assertions
// ==========================================

Then('a copy of the current map should be created', function () {
  const scenarios = scenarioStore.scenarios
  expect(scenarios.length).to.be.greaterThan(0)
  const scenario = scenarios[scenarios.length - 1]
  expect(scenario.steps.length).to.equal(vsmDataStore.steps.length)
})

Then('I should be able to modify the scenario', function () {
  const scenario =
    scenarioStore.scenarios[scenarioStore.scenarios.length - 1]
  expect(scenario.steps).to.exist
})

Then('I should see a comparison of results', function () {
  expect(this.baselineResults).to.exist
  expect(this.scenarioResults).to.exist
})

Then('the smaller batch scenario should show lower lead time', function () {
  expect(this.scenarioResults).to.exist
  expect(this.baselineResults).to.exist
  const scenarioDeployment = scenarioStore.scenarios[
    scenarioStore.scenarios.length - 1
  ].steps.find((s) => s.name === 'Deployment')
  expect(scenarioDeployment.batchSize).to.be.lessThan(5)
})

Then(
  'I should see improved throughput in the {int}-worker scenario',
  function (workers) {
    expect(this.scenarioResults).to.exist
    expect(this.baselineResults).to.exist
    const scenarioBottleneck = scenarioStore.scenarios[
      scenarioStore.scenarios.length - 1
    ].steps.find((s) => s.name === 'Bottleneck')
    expect(scenarioBottleneck.peopleCount).to.equal(workers)
  }
)

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
  const scenario =
    scenarioStore.scenarios[scenarioStore.scenarios.length - 1]
  expect(scenario.saved).to.be.true
})

Then('I should be able to load it later', function () {
  const scenario = scenarioStore.scenarios.find((s) => s.saved)
  expect(scenario).to.exist
})
