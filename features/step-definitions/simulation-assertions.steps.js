import { Then } from '@cucumber/cucumber'
import { expect } from 'chai'

// Helpers to access state
const getVsmState = (world) => world.vsmState
const getSimState = (world) => world.simState
const findStepByName = (world, name) => getVsmState(world).steps.find((s) => s.name === name)

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
