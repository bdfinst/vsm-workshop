import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'
import { useVsmStore } from '../../src/stores/vsmStore.js'

// Helpers to access state
const getVsmState = (world) => useVsmStore.getState()
const findStepByName = (world, name) => getVsmState(world).steps.find((s) => s.name === name)

// Create VSM steps
Given('I am on the home page', function () {
  // World constructor already resets the stores, so nothing to do here.
})

Given('I have an empty value stream map', function () {
  this.vsm.createVSM('Test Map')
})

Given('I have created a map named {string}', function (name) {
  this.vsm.createVSM(name)
})

Given('I have created a value stream map', function () {
  this.vsm.createVSM('Test Map')
})

Given('I have a value stream map', function () {
  this.vsm.createVSM('Test Map')
})

Given('an empty value stream map', function () {
  this.vsm.createVSM('Empty Map')
})

When('I click {string}', function (buttonText) {
  if (buttonText === 'Create New Map') {
    this.vsm.createVSM()
  } else if (buttonText === 'Delete') {
    this.pendingDelete = this.vsmState.selectedStepId
  } else if (buttonText === 'Export') {
    this.exportClicked = true
  } else if (buttonText === 'Import') {
    this.importClicked = true
  } else if (buttonText === 'New Map') {
    this.newMapClicked = true
  }
})

When('I click {string} without entering a name', function (buttonText) {
  if (buttonText === 'Create New Map') {
    this.vsm.createVSM() // Default name is handled by the store
  }
})

When('I enter {string} as the map name', function (name) {
  if (this.vsmState.id) {
    this.vsmState.updateMapName(name)
  } else {
    this.vsm.createVSM(name)
  }
})

When('I change the map name to {string}', function (name) {
  this.vsmState.updateMapName(name)
})

Then('I should see an empty canvas', function () {
  expect(this.vsmState.id).to.exist
  expect(this.vsmState.steps).to.have.lengthOf(0)
})

Then('the map name should display {string}', function (name) {
  expect(this.vsmState.name).to.equal(name)
})

Then('the map name should update to {string}', function (name) {
  expect(this.vsmState.name).to.equal(name)
})

Then('a map should be created with name {string}', function (name) {
  expect(this.vsmState.name).to.equal(name)
})

// Add step steps
Given('I have a value stream map with a {string} step', function (stepName) {
  this.vsm.createVSM('Test Map')
  this.vsm.addStep(stepName)
})

Given('I have a value stream map with steps {string} and {string}', function (step1, step2) {
  this.vsm.createVSM('Test Map')
  this.vsm.addStep(step1)
  this.vsm.addStep(step2)
})

Given('I have steps {string} and {string}', function (step1, step2) {
  this.vsm.createVSM('Test Map')
  this.vsm.addStep(step1)
  this.vsm.addStep(step2)
})

When('I click the {string} button', function (buttonText) {
  if (buttonText === 'Add Step') {
    this.vsm.addStep('New Step')
  }
})

When('I add a step named {string}', function (name) {
  this.vsm.addStep(name)
})

When('I add a step', function () {
  this.vsm.addStep('New Step')
})

When('I add steps {string}, {string}, {string}', function (s1, s2, s3) {
  this.vsm.addStep(s1)
  this.vsm.addStep(s2)
  this.vsm.addStep(s3)
})

When('I add {int} steps', function (count) {
  for (let i = 0; i < count; i++) {
    this.vsm.addStep(`Step ${i + 1}`)
  }
})

Then('I should see a {string} step on the canvas', function (stepName) {
  const step = findStepByName(this, stepName)
  expect(step).to.exist
})

Then('the step should have default process time and lead time', function () {
  const { steps } = this.vsmState
  const lastStep = steps[steps.length - 1]
  expect(lastStep.processTime).to.be.greaterThan(0)
  expect(lastStep.leadTime).to.be.greaterThan(0)
})

Then('I should see {int} steps on the canvas', function (count) {
  expect(this.vsmState.steps).to.have.lengthOf(count)
})

Then('the steps should be arranged left to right', function () {
  // This logic was specific to the old world's positioning.
  // The new store handles positioning, so we just check they exist.
  expect(this.vsmState.steps.length).to.be.greaterThan(1)
  for (let i = 1; i < this.vsmState.steps.length; i++) {
    expect(this.vsmState.steps[i].position.x).to.be.greaterThan(
      this.vsmState.steps[i - 1].position.x
    )
  }
})

// Edit step steps
Given('I have a step named {string}', function (name) {
  this.vsm.createVSM('Test Map')
  this.vsm.addStep(name)
})

Given('I have the step editor open for {string}', function (name) {
  if (!this.vsmState.id) {
    this.vsm.createVSM('Test Map')
  }
  let step = findStepByName(this, name)
  if (!step) {
    step = this.vsm.addStep(name)
  }
  this.vsmState.selectStep(step.id)
})

Given('I have a step with process time {int} and lead time {int}', function (pt, lt) {
  this.vsm.createVSM('Test Map')
  const step = this.vsm.addStep('Test Step', 'custom', { processTime: pt, leadTime: lt })
  this.vsmState.selectStep(step.id)
})

Given('I have a step with %C&A of {int}', function (pca) {
  this.vsm.createVSM('Test Map')
  const step = this.vsm.addStep('Test Step', 'custom', { percentCompleteAccurate: pca })
  this.vsmState.selectStep(step.id)
})

Given('I am editing a step', function () {
  this.vsm.createVSM('Test Map')
  const step = this.vsm.addStep('Test Step')
  this.vsmState.selectStep(step.id)
})

When('I double-click on the step', function () {
  const step = this.vsmState.steps[0]
  this.vsmState.selectStep(step.id)
})

When('I click on the step', function () {
  const step = this.vsmState.steps[0]
  this.vsmState.selectStep(step.id)
})

When('I edit the step', function () {
  const step = this.vsmState.steps[0]
  this.vsmState.selectStep(step.id)
})

When('I change the step name to {string}', function (name) {
  this.vsm.updateStep(this.vsmState.selectedStepId, { name })
})

When('I change process time to {int}', function (pt) {
  this.vsm.updateStep(this.vsmState.selectedStepId, { processTime: pt })
})

When('I change lead time to {int}', function (lt) {
  this.vsm.updateStep(this.vsmState.selectedStepId, { leadTime: lt })
})

When('I change %C&A to {int}', function (pca) {
  this.vsm.updateStep(this.vsmState.selectedStepId, { percentCompleteAccurate: pca })
})

When('I enter process time of {int} minutes', function (pt) {
  const step = this.vsm.findStepById(this.vsmState.selectedStepId)
  this.tempStepState = { ...step, processTime: pt }
})

When('I enter lead time of {int} minutes', function (lt) {
  this.tempStepState = { ...this.tempStepState, leadTime: lt }
  this.error = this.vsm.validateStep(this.tempStepState)
})

When('I save the changes', function () {
  if (this.tempStepState && !this.error) {
    this.vsm.updateStep(this.vsmState.selectedStepId, this.tempStepState)
  }
})

Then('the step editor should open', function () {
  expect(this.vsmState.selectedStepId).to.exist
})

Then('the step should display {string}', function (name) {
  const step = findStepByName(this, name)
  expect(step).to.exist
})

Then('the step should show PT: {int}m and LT: {int}m', function (pt, lt) {
  const step = this.vsm.findStepById(this.vsmState.selectedStepId)
  expect(step.processTime).to.equal(pt)
  expect(step.leadTime).to.equal(lt)
})

Then('the step should show %C&A: {int}%', function (pca) {
  const step = this.vsm.findStepById(this.vsmState.selectedStepId)
  expect(step.percentCompleteAccurate).to.equal(pca)
})

Then('I should see an error {string}', function (errorMessage) {
  expect(this.error).to.include(errorMessage)
})

Then('the save button should be disabled', function () {
  expect(this.error.length).to.be.greaterThan(0)
})

// Delete step steps
Given('I have a step selected', function () {
  this.vsm.createVSM('Test Map')
  const step = this.vsm.addStep('Selected Step')
  this.vsmState.selectStep(step.id)
})

Given('{string} is connected to {string}', function (sourceName, targetName) {
  if (!this.vsmState.id) {
    this.vsm.createVSM('Test Map')
  }
  let source = findStepByName(this, sourceName)
  let target = findStepByName(this, targetName)
  if (!source) source = this.vsm.addStep(sourceName)
  if (!target) target = this.vsm.addStep(targetName)
  this.vsm.addConnection(source.name, target.name)
})

When('I open the editor for {string}', function (name) {
  const step = findStepByName(this, name)
  this.vsmState.selectStep(step.id)
})

When('I press the Delete key', function () {
  this.pendingDelete = this.vsmState.selectedStepId
})

When('I confirm the deletion', function () {
  if (this.pendingDelete) {
    // Check if it's a connection ID
    const isConnection = this.vsmState.connections.some(
      (c) => c.id === this.pendingDelete
    )
    if (isConnection) {
      this.vsm.deleteConnection(this.pendingDelete)
    } else {
      this.vsm.deleteStep(this.pendingDelete)
    }
    this.pendingDelete = null
  }
})

When('I click delete on the step', function () {
  this.pendingDelete = this.vsmState.steps[0]?.id
})

When('I cancel the confirmation', function () {
  this.pendingDelete = null
})

When('I delete {string}', function (name) {
  const step = findStepByName(this, name)
  if (step) {
    this.vsm.deleteStep(step.id)
  }
})

When('I confirm', function () {
  if (this.pendingDelete) {
    this.vsm.deleteStep(this.pendingDelete)
    this.pendingDelete = null
  } else if (this.newMapClicked) {
    this.vsmState.clearMap()
  }
})

Then('the canvas should only show {string}', function (name) {
  expect(this.vsmState.steps).to.have.lengthOf(1)
  expect(this.vsmState.steps[0].name).to.equal(name)
})

Then('the step should be removed', function () {
  const deletedStepId = this.vsmState.selectedStepId
  expect(this.vsm.findStepById(deletedStepId)).to.be.undefined
})

Then('the step should still exist', function () {
  expect(this.vsmState.steps.length).to.be.greaterThan(0)
})

Then('the connection should also be removed', function () {
  expect(this.vsmState.connections).to.have.lengthOf(0)
})

// Connect steps
When('I drag from the output handle of {string}', function (sourceName) {
  this.dragSource = findStepByName(this, sourceName)
})

When('I drop on the input handle of {string}', function (targetName) {
  if (this.dragSource) {
    this.vsm.addConnection(this.dragSource.name, targetName)
    this.dragSource = null
  }
})

When('I click on the connection', function () {
  this.vsmState.selectConnection(this.vsmState.connections[0].id)
})

When('I confirm deletion', function () {
  if (this.vsmState.selectedConnectionId) {
    this.vsm.deleteConnection(this.vsmState.selectedConnectionId)
  }
})

When('I try to connect {string} to {string} again', function (source, target) {
  const result = this.vsm.addConnection(source, target)
  this.duplicateAttempt = result === null
})

Then('a connection should appear between the steps', function () {
  expect(this.vsmState.connections.length).to.be.greaterThan(0)
})

Then('the connection should be removed', function () {
  expect(this.vsmState.connections).to.have.lengthOf(0)
})

Then('no new connection should be created', function () {
  expect(this.duplicateAttempt).to.be.true
})