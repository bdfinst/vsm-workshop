import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'

// Create VSM steps
Given('I am on the home page', function () {
  this.vsm = null
})

Given('I have an empty value stream map', function () {
  this.createVSM('Test Map')
})

Given('I have created a map named {string}', function (name) {
  this.createVSM(name)
})

Given('I have created a value stream map', function () {
  this.createVSM('Test Map')
})

Given('I have a value stream map', function () {
  this.createVSM('Test Map')
})

Given('an empty value stream map', function () {
  this.createVSM('Empty Map')
})

When('I click {string}', function (buttonText) {
  if (buttonText === 'Create New Map') {
    this.createVSM()
  } else if (buttonText === 'Delete') {
    if (this.selectedStep) {
      this.pendingDelete = this.selectedStep.id
    }
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
    this.createVSM()
  }
})

When('I enter {string} as the map name', function (name) {
  if (this.vsm) {
    this.vsm.name = name
  } else {
    this.createVSM(name)
  }
})

When('I change the map name to {string}', function (name) {
  this.vsm.name = name
})

Then('I should see an empty canvas', function () {
  expect(this.vsm).to.exist
  expect(this.steps).to.have.lengthOf(0)
})

Then('the map name should display {string}', function (name) {
  expect(this.vsm.name).to.equal(name)
})

Then('the map name should update to {string}', function (name) {
  expect(this.vsm.name).to.equal(name)
})

Then('a map should be created with name {string}', function (name) {
  expect(this.vsm.name).to.equal(name)
})

// Add step steps
Given('I have a value stream map with a {string} step', function (stepName) {
  this.createVSM('Test Map')
  this.addStep(stepName, 'development')
})

Given('I have a value stream map with steps {string} and {string}', function (step1, step2) {
  this.createVSM('Test Map')
  this.addStep(step1, 'development')
  this.addStep(step2, 'testing')
})

Given('I have steps {string} and {string}', function (step1, step2) {
  this.createVSM('Test Map')
  this.addStep(step1, 'development')
  this.addStep(step2, 'testing')
})

When('I click the {string} button', function (buttonText) {
  if (buttonText === 'Add Step') {
    this.addStep('New Step', 'custom')
  }
})

When('I add a step named {string}', function (name) {
  this.addStep(name, 'custom')
})

When('I add a step', function () {
  this.addStep('New Step', 'custom')
})

When('I add steps {string}, {string}, {string}', function (s1, s2, s3) {
  this.addStep(s1, 'custom')
  this.addStep(s2, 'custom')
  this.addStep(s3, 'custom')
})

When('I add {int} steps', function (count) {
  for (let i = 0; i < count; i++) {
    this.addStep(`Step ${i + 1}`, 'custom')
  }
})

Then('I should see a {string} step on the canvas', function (stepName) {
  const step = this.findStep(stepName)
  expect(step).to.exist
})

Then('the step should have default process time and lead time', function () {
  const lastStep = this.steps[this.steps.length - 1]
  expect(lastStep.processTime).to.be.greaterThan(0)
  expect(lastStep.leadTime).to.be.greaterThan(0)
})

Then('I should see {int} steps on the canvas', function (count) {
  expect(this.steps).to.have.lengthOf(count)
})

Then('the steps should be arranged left to right', function () {
  for (let i = 1; i < this.steps.length; i++) {
    expect(this.steps[i].position.x).to.be.greaterThan(this.steps[i - 1].position.x)
  }
})

// Edit step steps
Given('I have a step named {string}', function (name) {
  this.createVSM('Test Map')
  this.addStep(name, 'development')
})

Given('I have the step editor open for {string}', function (name) {
  if (!this.vsm) {
    this.createVSM('Test Map')
    this.addStep(name, 'development')
  }
  this.selectedStep = this.findStep(name)
})

Given('I have a step with process time {int} and lead time {int}', function (pt, lt) {
  this.createVSM('Test Map')
  this.addStep('Test Step', 'custom', { processTime: pt, leadTime: lt })
  this.selectedStep = this.steps[0]
})

Given('I have a step with %C&A of {int}', function (pca) {
  this.createVSM('Test Map')
  this.addStep('Test Step', 'custom', { percentCompleteAccurate: pca })
  this.selectedStep = this.steps[0]
})

Given('I am editing a step', function () {
  this.createVSM('Test Map')
  this.addStep('Test Step', 'custom')
  this.selectedStep = this.steps[0]
})

When('I double-click on the step', function () {
  this.selectedStep = this.steps[0]
})

When('I click on the step', function () {
  this.selectedStep = this.steps[0]
})

When('I edit the step', function () {
  this.selectedStep = this.steps[0]
})

When('I change the step name to {string}', function (name) {
  this.updateStep(this.selectedStep.id, { name })
  this.selectedStep = this.findStep(name)
})

When('I change process time to {int}', function (pt) {
  this.updateStep(this.selectedStep.id, { processTime: pt })
  this.selectedStep = this.steps.find(s => s.id === this.selectedStep.id)
})

When('I change lead time to {int}', function (lt) {
  this.updateStep(this.selectedStep.id, { leadTime: lt })
  this.selectedStep = this.steps.find(s => s.id === this.selectedStep.id)
})

When('I change %C&A to {int}', function (pca) {
  this.updateStep(this.selectedStep.id, { percentCompleteAccurate: pca })
  this.selectedStep = this.steps.find(s => s.id === this.selectedStep.id)
})

When('I enter process time of {int} minutes', function (pt) {
  this.selectedStep.processTime = pt
})

When('I enter lead time of {int} minutes', function (lt) {
  this.selectedStep.leadTime = lt
  this.error = this.validateStep(this.selectedStep)
})

When('I save the changes', function () {
  // Changes are already applied
})

Then('the step editor should open', function () {
  expect(this.selectedStep).to.exist
})

Then('the step should display {string}', function (name) {
  const step = this.findStep(name)
  expect(step).to.exist
})

Then('the step should show PT: {int}m and LT: {int}m', function (pt, lt) {
  const step = this.selectedStep || this.steps[0]
  expect(step.processTime).to.equal(pt)
  expect(step.leadTime).to.equal(lt)
})

Then('the step should show %C&A: {int}%', function (pca) {
  const step = this.selectedStep || this.steps[0]
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
  this.createVSM('Test Map')
  this.addStep('Selected Step', 'development')
  this.selectedStep = this.steps[0]
})

Given('{string} is connected to {string}', function (source, target) {
  if (!this.vsm) {
    this.createVSM('Test Map')
  }
  if (!this.findStep(source)) {
    this.addStep(source, 'development')
  }
  if (!this.findStep(target)) {
    this.addStep(target, 'testing')
  }
  this.addConnection(source, target)
})

When('I open the editor for {string}', function (name) {
  this.selectedStep = this.findStep(name)
})

When('I press the Delete key', function () {
  if (this.selectedStep) {
    this.pendingDelete = this.selectedStep.id
  }
})

When('I confirm the deletion', function () {
  if (this.pendingDelete) {
    // Check if it's a connection ID
    const isConnection = this.connections.some((c) => c.id === this.pendingDelete)
    if (isConnection) {
      this.deleteConnection(this.pendingDelete)
    } else {
      this.deleteStep(this.pendingDelete)
      this.selectedStep = null
    }
    this.pendingDelete = null
  }
})

When('I click delete on the step', function () {
  this.pendingDelete = this.selectedStep?.id || this.steps[0]?.id
})

When('I cancel the confirmation', function () {
  this.pendingDelete = null
})

When('I delete {string}', function (name) {
  const step = this.findStep(name)
  if (step) {
    this.deleteStep(step.id)
  }
})

When('I confirm', function () {
  if (this.pendingDelete) {
    this.deleteStep(this.pendingDelete)
    this.pendingDelete = null
  } else if (this.newMapClicked) {
    this.vsm = null
    this.steps = []
    this.connections = []
  }
})

Then('the canvas should only show {string}', function (name) {
  expect(this.steps).to.have.lengthOf(1)
  expect(this.steps[0].name).to.equal(name)
})

Then('the step should be removed', function () {
  expect(this.steps.find((s) => s.id === this.selectedStep?.id)).to.be.undefined
})

Then('the step should still exist', function () {
  expect(this.steps.length).to.be.greaterThan(0)
})

Then('the connection should also be removed', function () {
  expect(this.connections).to.have.lengthOf(0)
})

// Connect steps
When('I drag from the output handle of {string}', function (name) {
  this.dragSource = this.findStep(name)
})

When('I drop on the input handle of {string}', function (name) {
  if (this.dragSource) {
    this.addConnection(this.dragSource.name, name)
    this.dragSource = null
  }
})

When('I click on the connection', function () {
  this.selectedConnection = this.connections[0]
})

When('I confirm deletion', function () {
  if (this.selectedConnection) {
    this.deleteConnection(this.selectedConnection.id)
    this.selectedConnection = null
  }
})

When('I try to connect {string} to {string} again', function (source, target) {
  const result = this.addConnection(source, target)
  this.duplicateAttempt = result === null
})

Then('a connection should appear between the steps', function () {
  expect(this.connections.length).to.be.greaterThan(0)
})

Then('the connection should be removed', function () {
  expect(this.connections).to.have.lengthOf(0)
})

Then('no new connection should be created', function () {
  expect(this.duplicateAttempt).to.be.true
})
