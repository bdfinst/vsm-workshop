import { Given, When } from '@cucumber/cucumber'
import { expect } from 'chai'

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

When('I view the simulation results', function () {
  // Results are already calculated after simulation completion
  expect(getSimState(this).results).to.exist
})
