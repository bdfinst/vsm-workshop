import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'
import { vsmDataStore, vsmUIStore, vsmIOStore } from './helpers/testStores.js'
import { isAutomated } from '../../src/models/StepFactory.js'

// Helpers to access state
const findStepByName = (name) => vsmDataStore.steps.find((s) => s.name === name)

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
    this.pendingDelete = vsmUIStore.selectedStepId
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
  if (vsmDataStore.id) {
    vsmDataStore.updateMapName(name)
  } else {
    this.vsm.createVSM(name)
  }
})

When('I change the map name to {string}', function (name) {
  vsmDataStore.updateMapName(name)
})

Then('I should see an empty canvas', function () {
  expect(vsmDataStore.id).to.exist
  expect(vsmDataStore.steps).to.have.lengthOf(0)
})

Then('the map name should display {string}', function (name) {
  expect(vsmDataStore.name).to.equal(name)
})

Then('the map name should update to {string}', function (name) {
  expect(vsmDataStore.name).to.equal(name)
})

Then('a map should be created with name {string}', function (name) {
  expect(vsmDataStore.name).to.equal(name)
})

// Add step steps
Given('I have a value stream map with a {string} step', function (stepName) {
  this.vsm.createVSM('Test Map')
  this.vsm.addStep(stepName)
})

Given(
  'I have a value stream map with steps {string} and {string}',
  function (step1, step2) {
    this.vsm.createVSM('Test Map')
    this.vsm.addStep(step1)
    this.vsm.addStep(step2)
  }
)

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
  const step = findStepByName(stepName)
  expect(step).to.exist
})

Then('the step should have default process time and lead time', function () {
  const steps = vsmDataStore.steps
  const lastStep = steps[steps.length - 1]
  expect(lastStep.processTime).to.be.greaterThan(0)
  expect(lastStep.leadTime).to.be.greaterThan(0)
})

Then('I should see {int} steps on the canvas', function (count) {
  expect(vsmDataStore.steps).to.have.lengthOf(count)
})

Then('the steps should be arranged left to right', function () {
  expect(vsmDataStore.steps.length).to.be.greaterThan(1)
  for (let i = 1; i < vsmDataStore.steps.length; i++) {
    expect(vsmDataStore.steps[i].position.x).to.be.greaterThan(
      vsmDataStore.steps[i - 1].position.x
    )
  }
})

// Edit step steps
Given('I have a step named {string}', function (name) {
  this.vsm.createVSM('Test Map')
  this.vsm.addStep(name)
})

Given('I have the step editor open for {string}', function (name) {
  if (!vsmDataStore.id) {
    this.vsm.createVSM('Test Map')
  }
  let step = findStepByName(name)
  if (!step) {
    step = this.vsm.addStep(name)
  }
  vsmUIStore.selectStep(step.id)
})

Given(
  'I have a step with process time {int} and lead time {int}',
  function (pt, lt) {
    this.vsm.createVSM('Test Map')
    const step = this.vsm.addStep('Test Step', { processTime: pt, leadTime: lt })
    vsmUIStore.selectStep(step.id)
  }
)

Given('I have a step with %C&A of {int}', function (pca) {
  this.vsm.createVSM('Test Map')
  const step = this.vsm.addStep('Test Step', { percentCompleteAccurate: pca })
  vsmUIStore.selectStep(step.id)
})

Given('I am editing a step', function () {
  this.vsm.createVSM('Test Map')
  const step = this.vsm.addStep('Test Step')
  vsmUIStore.selectStep(step.id)
})

When('I double-click on the step', function () {
  const step = vsmDataStore.steps[0]
  vsmUIStore.selectStep(step.id)
})

When('I click on the step', function () {
  const step = vsmDataStore.steps[0]
  vsmUIStore.selectStep(step.id)
})

When('I edit the step', function () {
  const step = vsmDataStore.steps[0]
  vsmUIStore.selectStep(step.id)
})

When('I change the step name to {string}', function (name) {
  this.vsm.updateStep(vsmUIStore.selectedStepId, { name })
})

When('I change process time to {int}', function (pt) {
  this.vsm.updateStep(vsmUIStore.selectedStepId, { processTime: pt })
})

When('I change lead time to {int}', function (lt) {
  this.vsm.updateStep(vsmUIStore.selectedStepId, { leadTime: lt })
})

When('I change %C&A to {int}', function (pca) {
  this.vsm.updateStep(vsmUIStore.selectedStepId, { percentCompleteAccurate: pca })
})

When('I enter process time of {int} minutes', function (pt) {
  const step = this.vsm.findStepById(vsmUIStore.selectedStepId)
  this.tempStepState = { ...step, processTime: pt }
})

When('I enter lead time of {int} minutes', function (lt) {
  this.tempStepState = { ...this.tempStepState, leadTime: lt }
  this.error = this.vsm.validateStep(this.tempStepState)
})

When('I save the changes', function () {
  if (this.tempStepState && !this.error) {
    this.vsm.updateStep(vsmUIStore.selectedStepId, this.tempStepState)
  }
})

Then('the step editor should open', function () {
  expect(vsmUIStore.selectedStepId).to.exist
})

Then('the step should display {string}', function (name) {
  const step = findStepByName(name)
  expect(step).to.exist
})

Then('the step should show PT: {int}m and LT: {int}m', function (pt, lt) {
  const step = this.vsm.findStepById(vsmUIStore.selectedStepId)
  expect(step.processTime).to.equal(pt)
  expect(step.leadTime).to.equal(lt)
})

Then('the step should show %C&A: {int}%', function (pca) {
  const step = this.vsm.findStepById(vsmUIStore.selectedStepId)
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
  vsmUIStore.selectStep(step.id)
})

Given('{string} is connected to {string}', function (sourceName, targetName) {
  if (!vsmDataStore.id) {
    this.vsm.createVSM('Test Map')
  }
  let source = findStepByName(sourceName)
  let target = findStepByName(targetName)
  if (!source) source = this.vsm.addStep(sourceName)
  if (!target) target = this.vsm.addStep(targetName)
  this.vsm.addConnection(source.name, target.name)
})

When('I open the editor for {string}', function (name) {
  const step = findStepByName(name)
  vsmUIStore.selectStep(step.id)
})

When('I press the Delete key', function () {
  this.pendingDelete = vsmUIStore.selectedStepId
})

When('I confirm the deletion', function () {
  if (this.pendingDelete) {
    // Check if it's a connection ID
    const isConnection = vsmDataStore.connections.some(
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
  this.pendingDelete = vsmDataStore.steps[0]?.id
})

When('I cancel the confirmation', function () {
  this.pendingDelete = null
})

When('I delete {string}', function (name) {
  const step = findStepByName(name)
  if (step) {
    this.vsm.deleteStep(step.id)
  }
})

When('I confirm', function () {
  if (this.pendingDelete) {
    this.vsm.deleteStep(this.pendingDelete)
    this.pendingDelete = null
  } else if (this.newMapClicked) {
    vsmDataStore.clearMap()
  }
})

Then('the canvas should only show {string}', function (name) {
  expect(vsmDataStore.steps).to.have.lengthOf(1)
  expect(vsmDataStore.steps[0].name).to.equal(name)
})

Then('the step should be removed', function () {
  const deletedStepId = vsmUIStore.selectedStepId
  expect(this.vsm.findStepById(deletedStepId)).to.be.undefined
})

Then('the step should still exist', function () {
  expect(vsmDataStore.steps.length).to.be.greaterThan(0)
})

Then('the connection should also be removed', function () {
  expect(vsmDataStore.connections).to.have.lengthOf(0)
})

// Connect steps
When('I drag from the output handle of {string}', function (sourceName) {
  this.dragSource = findStepByName(sourceName)
})

When('I drop on the input handle of {string}', function (targetName) {
  if (this.dragSource) {
    this.vsm.addConnection(this.dragSource.name, targetName)
    this.dragSource = null
  }
})

When('I click on the connection', function () {
  vsmUIStore.selectConnection(vsmDataStore.connections[0].id)
})

When('I confirm deletion', function () {
  if (vsmUIStore.selectedConnectionId) {
    this.vsm.deleteConnection(vsmUIStore.selectedConnectionId)
  }
})

When('I try to connect {string} to {string} again', function (source, target) {
  const result = this.vsm.addConnection(source, target)
  this.duplicateAttempt = result === null
})

Then('a connection should appear between the steps', function () {
  expect(vsmDataStore.connections.length).to.be.greaterThan(0)
})

Then('the connection should be removed', function () {
  expect(vsmDataStore.connections).to.have.lengthOf(0)
})

Then('no new connection should be created', function () {
  expect(this.duplicateAttempt).to.be.true
})

// --- Automated step flag (CD readiness) ---

Given('a deployment step {string}', function (name) {
  if (!vsmDataStore.id) this.vsm.createVSM('Test Map')
  this.vsm.addStep(name, { type: 'deployment' })
})

Given('a value stream with a manual deployment step {string}', function (name) {
  this.vsm.createVSM('Test Map')
  this.vsm.addStep(name, { type: 'deployment', automated: false })
})

Given('a saved map whose step {string} has no automated property', function (name) {
  const legacyStep = {
    id: crypto.randomUUID(),
    name,
    type: 'deployment',
    processTime: 30,
    leadTime: 120,
    percentCompleteAccurate: 100,
    queueSize: 0,
    batchSize: 1,
    position: { x: 50, y: 150 },
  }
  this.savedMap = {
    id: crypto.randomUUID(),
    name: 'Legacy Map',
    description: '',
    steps: [legacyStep],
    connections: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
})

When('I open the step editor for {string}', function (name) {
  const step = findStepByName(name)
  vsmUIStore.selectStep(step.id)
  this.editingStepId = step.id
  this.pendingAutomated = step.automated
})

When('I mark the step as not automated', function () {
  this.pendingAutomated = false
})

When('I save the step', function () {
  this.vsm.updateStep(this.editingStepId, { automated: this.pendingAutomated })
})

When('the map is loaded', function () {
  vsmDataStore.loadMap(this.savedMap)
})

When('the map is saved and reloaded', function () {
  const json = vsmIOStore.exportToJson()
  vsmIOStore.importFromJson(json)
})

When('the map is exported and re-imported', function () {
  const json = vsmIOStore.exportToJson()
  vsmIOStore.importFromJson(json)
})

Then('the step {string} is automated', function (name) {
  expect(isAutomated(findStepByName(name))).to.be.true
})

Then('the step {string} is not automated', function (name) {
  expect(isAutomated(findStepByName(name))).to.be.false
})
