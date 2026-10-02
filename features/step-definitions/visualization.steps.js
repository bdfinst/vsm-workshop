import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'
import { vsmDataStore, vsmUIStore } from './helpers/testStores.js'
import * as metrics from '../../src/utils/calculations/metrics.js'

// Canvas display steps
Given(
  'I have steps {string}, {string}, {string}, {string}',
  function (s1, s2, s3, s4) {
    this.vsm.createVSM('Test Map')
    this.vsm.addStep(s1)
    this.vsm.addStep(s2)
    this.vsm.addStep(s3)
    this.vsm.addStep(s4)
  }
)

Given('I have a step on the canvas', function () {
  this.vsm.createVSM('Test Map')
  this.vsm.addStep('Test Step')
})

Then('each step should be visible on the canvas', function () {
  const steps = vsmDataStore.steps
  expect(steps.length).to.be.greaterThan(0)
  steps.forEach((step) => {
    expect(step.position).to.exist
  })
})

Then('each step should show its metrics', function () {
  const steps = vsmDataStore.steps
  steps.forEach((step) => {
    expect(step.processTime).to.exist
    expect(step.leadTime).to.exist
    expect(step.percentCompleteAccurate).to.exist
  })
})

Then('the step should be highlighted as selected', function () {
  const selectedStepId = vsmUIStore.selectedStepId
  expect(selectedStepId).to.exist
})

// Metrics steps
Given('a value stream with steps:', function (dataTable) {
  this.vsm.createVSM('Test Map')
  const rows = dataTable.hashes()
  rows.forEach((row) => {
    this.vsm.addStep(row.name, {
      processTime: parseInt(row.processTime) || undefined,
      leadTime: parseInt(row.leadTime) || undefined,
      queueSize: parseInt(row.queueSize) || undefined,
      batchSize: parseInt(row.batchSize) || undefined,
    })
  })
})

Given('total process time is {int} minutes', function (pt) {
  this.vsm.createVSM('Test Map')
  this.vsm.addStep('Test', { processTime: pt, leadTime: pt * 4 })
})

Given('total lead time is {int} minutes', function (lt) {
  const steps = vsmDataStore.steps
  if (steps.length > 0) {
    this.vsm.updateStep(steps[0].id, { leadTime: lt })
  }
})

Given('flow efficiency is {int}%', function (efficiency) {
  this.vsm.createVSM('Test Map')
  const lt = 100
  const pt = efficiency
  this.vsm.addStep('Test', { processTime: pt, leadTime: lt })
})

When('I view the metrics dashboard', function () {
  // In the old world, this triggered calculation.
  // Now, we calculate just-in-time in the 'Then' steps.
  // This step is now effectively a no-op that makes scenarios more readable.
})

Then('total lead time should show {string}', function (expected) {
  const steps = vsmDataStore.steps
  const totalLeadTime = metrics.calculateTotalLeadTime(steps)
  const display = metrics.formatDuration(totalLeadTime)
  // This is a loose match because formatting can be complex (e.g. days, hours, mins)
  expect(display).to.equal(expected)
})

Then('total process time should show {string}', function (expected) {
  const steps = vsmDataStore.steps
  const totalProcessTime = metrics.calculateTotalProcessTime(steps)
  const display = metrics.formatDuration(totalProcessTime)
  expect(display).to.equal(expected)
})

Then('flow efficiency should show {string}', function (expected) {
  const steps = vsmDataStore.steps
  const result = metrics.calculateFlowEfficiency(steps)
  expect(result.displayValue).to.equal(expected)
})

Then('the flow efficiency card should show good status', function () {
  const steps = vsmDataStore.steps
  const result = metrics.calculateFlowEfficiency(steps)
  expect(result.status).to.equal('good')
})

Then('the flow efficiency card should show warning status', function () {
  const steps = vsmDataStore.steps
  const result = metrics.calculateFlowEfficiency(steps)
  expect(result.status).to.equal('warning')
})

Then('the flow efficiency card should show critical status', function () {
  const steps = vsmDataStore.steps
  const result = metrics.calculateFlowEfficiency(steps)
  expect(result.status).to.equal('critical')
})

Then('I should see a message to add steps', function () {
  const steps = vsmDataStore.steps
  expect(steps).to.have.lengthOf(0)
})
