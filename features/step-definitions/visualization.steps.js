import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'
import { useVsmStore } from '../../src/stores/vsmStore.js'
import * as metrics from '../../src/utils/calculations/metrics.js'

const getVsmState = () => useVsmStore.getState()

// Canvas display steps
Given('I have steps {string}, {string}, {string}, {string}', function (s1, s2, s3, s4) {
  this.createVSM('Test Map')
  this.addStep(s1)
  this.addStep(s2)
  this.addStep(s3)
  this.addStep(s4)
})

Given('I have a step on the canvas', function () {
  this.createVSM('Test Map')
  this.addStep('Test Step')
})

// When('I drag the canvas background', function () {
//   // UI-only interaction, cannot be tested at this level
//   this.canvasPanned = true
// })

// When('I use the mouse wheel to zoom', function () {
//   // UI-only interaction, cannot be tested at this level
//   this.canvasZoomed = true
// })

// When('I click the zoom in button', function () {
//   // UI-only interaction
//   this.zoomLevel = (this.zoomLevel || 1) * 1.2
// })

// When('I click the fit view button', function () {
//   // UI-only interaction
//   this.fitView = true
// })

Then('each step should be visible on the canvas', function () {
  const { steps } = getVsmState()
  expect(steps.length).to.be.greaterThan(0)
  steps.forEach((step) => {
    expect(step.position).to.exist
  })
})

Then('each step should show its metrics', function () {
  const { steps } = getVsmState()
  steps.forEach((step) => {
    expect(step.processTime).to.exist
    expect(step.leadTime).to.exist
    expect(step.percentCompleteAccurate).to.exist
  })
})

// Then('the view should pan', function () {
//   expect(this.canvasPanned).to.be.true
// })

// Then('the canvas should zoom in or out', function () {
//   expect(this.canvasZoomed).to.be.true
// })

// Then('the canvas should zoom in', function () {
//   expect(this.zoomLevel).to.be.greaterThan(1)
// })

// Then('all steps should be visible', function () {
//   expect(this.fitView).to.be.true
// })

Then('the step should be highlighted as selected', function () {
  const { selectedStepId } = getVsmState()
  expect(selectedStepId).to.exist
})

// Metrics steps
Given('a value stream with steps:', function (dataTable) {
  this.createVSM('Test Map')
  const rows = dataTable.hashes()
  rows.forEach((row) => {
    this.addStep(row.name, 'custom', {
      processTime: parseInt(row.processTime) || undefined,
      leadTime: parseInt(row.leadTime) || undefined,
      queueSize: parseInt(row.queueSize) || undefined,
      batchSize: parseInt(row.batchSize) || undefined,
    })
  })
})

Given('total process time is {int} minutes', function (pt) {
  this.createVSM('Test Map')
  this.addStep('Test', 'custom', { processTime: pt, leadTime: pt * 4 })
})

Given('total lead time is {int} minutes', function (lt) {
  const { steps } = getVsmState()
  if (steps.length > 0) {
    this.updateStep(steps[0].id, { leadTime: lt })
  }
})

Given('flow efficiency is {int}%', function (efficiency) {
  this.createVSM('Test Map')
  const lt = 100
  const pt = efficiency
  this.addStep('Test', 'custom', { processTime: pt, leadTime: lt })
})

When('I view the metrics dashboard', function () {
  // In the old world, this triggered calculation.
  // Now, we calculate just-in-time in the 'Then' steps.
  // This step is now effectively a no-op that makes scenarios more readable.
})

Then('total lead time should show {string}', function (expected) {
  const { steps } = getVsmState()
  const totalLeadTime = metrics.calculateTotalLeadTime(steps)
  const display = metrics.formatDuration(totalLeadTime)
  // This is a loose match because formatting can be complex (e.g. days, hours, mins)
  expect(display).to.equal(expected)
})

Then('total process time should show {string}', function (expected) {
  const { steps } = getVsmState()
  const totalProcessTime = metrics.calculateTotalProcessTime(steps)
  const display = metrics.formatDuration(totalProcessTime)
  expect(display).to.equal(expected)
})

Then('flow efficiency should show {string}', function (expected) {
  const { steps } = getVsmState()
  const result = metrics.calculateFlowEfficiency(steps)
  expect(result.displayValue).to.equal(expected)
})

Then('the flow efficiency card should show good status', function () {
  const { steps } = getVsmState()
  const result = metrics.calculateFlowEfficiency(steps)
  expect(result.status).to.equal('good')
})

Then('the flow efficiency card should show warning status', function () {
  const { steps } = getVsmState()
  const result = metrics.calculateFlowEfficiency(steps)
  expect(result.status).to.equal('warning')
})

Then('the flow efficiency card should show critical status', function () {
  const { steps } = getVsmState()
  const result = metrics.calculateFlowEfficiency(steps)
  expect(result.status).to.equal('critical')
})

Then('I should see a message to add steps', function () {
  const { steps } = getVsmState()
  expect(steps).to.have.lengthOf(0)
})