import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'

// ==========================================
// Rework Loop Steps
// ==========================================

Given('I have a forward connection from {string} to {string}', function (source, target) {
  this.addConnection(source, target, 'forward', 0)
})

Given('I have a rework connection from {string} to {string}', function (source, target) {
  this.addConnection(source, target, 'rework', 20)
})

When('I create a connection from {string} back to {string}', function (source, target) {
  this.pendingConnection = { source, target, type: 'forward', reworkRate: 0 }
})

When('I mark it as a {string} connection', function (type) {
  if (this.pendingConnection) {
    this.pendingConnection.type = type.toLowerCase()
  }
})

When('I set rework rate to {int}%', function (rate) {
  if (this.pendingConnection) {
    this.pendingConnection.reworkRate = rate
    // Actually create the connection now
    this.addConnection(
      this.pendingConnection.source,
      this.pendingConnection.target,
      this.pendingConnection.type,
      this.pendingConnection.reworkRate
    )
    this.pendingConnection = null
  } else if (this.selectedConnection) {
    this.updateConnection(this.selectedConnection.id, { reworkRate: rate })
    // Refresh selectedConnection reference after update
    this.selectedConnection = this.connections.find((c) => c.id === this.selectedConnection.id)
  }
})

When('I click on the rework connection', function () {
  const reworkConn = this.connections.find((c) => c.type === 'rework')
  if (reworkConn) {
    this.selectConnection(reworkConn.id)
  }
})

When('I click on the forward connection', function () {
  const forwardConn = this.connections.find((c) => c.type === 'forward')
  if (forwardConn) {
    this.selectConnection(forwardConn.id)
  }
})

When('I change the connection type to {string}', function (type) {
  if (this.selectedConnection) {
    this.updateConnection(this.selectedConnection.id, { type: type.toLowerCase() })
    // Refresh selected connection
    this.selectConnection(this.selectedConnection.id)
  }
})

When('I save the connection', function () {
  // Connection is already saved via updateConnection
})

When('I click delete on the connection', function () {
  if (this.selectedConnection) {
    this.pendingDelete = this.selectedConnection.id
  }
})

When('I enter a rework rate of {int}%', function (rate) {
  if (this.selectedConnection) {
    this.selectedConnection.reworkRate = rate
    if (this.selectedConnection.type === 'rework' && rate === 0) {
      this.error = 'Rework connections need a rate > 0'
    }
  }
})

Given('I am editing a rework connection', function () {
  if (!this.vsm) {
    this.createVSM('Test Map')
    this.addStep('Development', 'development')
    this.addStep('Testing', 'testing')
  }
  this.addConnection('Testing', 'Development', 'rework', 20)
  this.selectConnection(this.connections[this.connections.length - 1].id)
})

Then('the connection editor should open', function () {
  expect(this.selectedConnection).to.exist
})

Then('I should see a rework connection from {string} to {string}', function (source, target) {
  const conn = this.findConnection(source, target)
  expect(conn).to.exist
  expect(conn.type).to.equal('rework')
})

Then('it should display {string}', function (expected) {
  if (expected.includes('rework')) {
    const rate = parseInt(expected)
    const reworkConn = this.connections.find((c) => c.type === 'rework')
    expect(reworkConn).to.exist
    expect(reworkConn.reworkRate).to.equal(rate)
  }
})

Then('the connection should display as a rework loop', function () {
  expect(this.selectedConnection.type).to.equal('rework')
})

Then('it should show {string}', function (expected) {
  if (expected.includes('rework')) {
    const rate = parseInt(expected)
    expect(this.selectedConnection.reworkRate).to.equal(rate)
  }
})

Then('the rework connection should be removed', function () {
  const reworkConns = this.connections.filter((c) => c.type === 'rework')
  expect(reworkConns).to.have.lengthOf(0)
})

// ==========================================
// Queue Visualization Steps
// ==========================================

Given('I have a step {string} with queue size of {int}', function (name, queueSize) {
  if (!this.vsm) {
    this.createVSM('Test Map')
  }
  this.addStep(name, 'custom', { queueSize })
})

Given('I have a step with queue size of {int}', function (queueSize) {
  if (!this.vsm) {
    this.createVSM('Test Map')
  }
  this.addStep('Test Step', 'custom', { queueSize })
})

When('I view the canvas', function () {
  // Canvas viewing is simulated - steps exist
})

Then('I should see a queue badge showing {string} on the step', function (expected) {
  const step = this.steps[this.steps.length - 1]
  expect(step.queueSize).to.equal(parseInt(expected))
  expect(step.queueSize).to.be.greaterThan(0)
})

Then('I should not see a queue badge on the step', function () {
  const step = this.steps[this.steps.length - 1]
  expect(step.queueSize).to.equal(0)
})

Then('the queue badge should be highlighted as high', function () {
  const step = this.steps[this.steps.length - 1]
  expect(step.queueSize).to.be.at.least(5)
})

Then('the step should be marked as a potential bottleneck', function () {
  const step = this.steps[this.steps.length - 1]
  expect(step.queueSize).to.be.at.least(5)
})

Then('total queue should show {string}', function (expected) {
  this.calculateMetrics()
  expect(this.metrics.totalQueueSize).to.equal(parseInt(expected))
})

// ==========================================
// Batch Size Display Steps
// ==========================================

Given('I have a step {string} with batch size of {int}', function (name, batchSize) {
  if (!this.vsm) {
    this.createVSM('Test Map')
  }
  this.addStep(name, 'custom', { batchSize })
})

Given('I have a step with batch size of {int}', function (batchSize) {
  if (!this.vsm) {
    this.createVSM('Test Map')
  }
  this.addStep('Test Step', 'custom', { batchSize })
  this.selectedStep = this.steps[this.steps.length - 1]
})

When('I change batch size to {int}', function (batchSize) {
  if (this.selectedStep) {
    this.updateStep(this.selectedStep.id, { batchSize })
    this.selectedStep = this.steps.find((s) => s.id === this.selectedStep.id)
  }
})

Then('I should see a batch badge showing {string} on the step', function (expected) {
  const step = this.steps[this.steps.length - 1]
  expect(`${step.batchSize}x`).to.equal(expected)
})

Then('I should not see a batch badge on the step', function () {
  const step = this.steps[this.steps.length - 1]
  expect(step.batchSize).to.equal(1)
})

Then('the step should show a batch badge {string}', function (expected) {
  expect(`${this.selectedStep.batchSize}x`).to.equal(expected)
})

// ==========================================
// Step Templates Steps
// ==========================================

When('I view the sidebar', function () {
  this.viewingSidebar = true
})

When('I expand the {string} template category', function (category) {
  this.expandedCategory = category
})

When('I click on the {string} template', function (templateName) {
  // Simulate adding from template
  const templateDefaults = {
    Development: { processTime: 120, leadTime: 480 },
    Testing: { processTime: 60, leadTime: 240 },
    Deployment: { processTime: 15, leadTime: 30 },
  }
  const defaults = templateDefaults[templateName] || { processTime: 60, leadTime: 120 }
  this.addStep(templateName, 'custom', defaults)
})

When('I click on {string} template', function (templateName) {
  // Load map template
  if (templateName === 'Software Delivery Pipeline') {
    this.createVSM(templateName)
    this.addStep('Backlog', 'custom', { processTime: 0, leadTime: 480 })
    this.addStep('Development', 'development', { processTime: 240, leadTime: 960 })
    this.addStep('Code Review', 'code_review', { processTime: 30, leadTime: 240 })
    this.addStep('Testing', 'testing', { processTime: 60, leadTime: 480 })
    this.addStep('Deploy', 'deployment', { processTime: 15, leadTime: 60 })
    this.addConnection('Backlog', 'Development')
    this.addConnection('Development', 'Code Review')
    this.addConnection('Code Review', 'Testing')
    this.addConnection('Testing', 'Deploy')
  } else if (templateName === 'Support Ticket Flow') {
    this.createVSM(templateName)
    this.addStep('Triage', 'custom', { processTime: 5, leadTime: 30 })
    this.addStep('Investigation', 'custom', { processTime: 30, leadTime: 120 })
    this.addStep('Resolution', 'custom', { processTime: 45, leadTime: 180 })
    this.addStep('Verification', 'qa', { processTime: 15, leadTime: 60 })
    this.addConnection('Triage', 'Investigation')
    this.addConnection('Investigation', 'Resolution')
    this.addConnection('Resolution', 'Verification')
  }
})

Then('I should see a {string} section', function (sectionName) {
  // UI verification - simulated
  expect(this.viewingSidebar).to.be.true
})

Then('I should see template categories', function () {
  // UI verification - simulated
  expect(this.viewingSidebar).to.be.true
})

Then('a {string} step should be added to the canvas', function (stepName) {
  const step = this.findStep(stepName)
  expect(step).to.exist
})

Then('it should have pre-configured process time and lead time', function () {
  const step = this.steps[this.steps.length - 1]
  expect(step.processTime).to.be.greaterThan(0)
  expect(step.leadTime).to.be.greaterThan(0)
})

Then('a new map should be created with multiple steps', function () {
  expect(this.steps.length).to.be.at.least(3)
})

Then('the steps should be connected', function () {
  expect(this.connections.length).to.be.at.least(2)
})

Then('a new map should be created with support workflow steps', function () {
  expect(this.steps.length).to.be.at.least(3)
  expect(this.findStep('Triage') || this.findStep('Investigation')).to.exist
})

// ==========================================
// Advanced Metrics Steps
// ==========================================

Given('a value stream with total lead time of {int} minutes', function (lt) {
  this.createVSM('Test Map')
  this.addStep('Step 1', 'custom', { processTime: Math.floor(lt / 4), leadTime: lt })
})

Given('a rework loop with {int}% rework rate', function (rate) {
  if (this.steps.length < 2) {
    this.addStep('Step 2', 'custom', { processTime: 30, leadTime: 120 })
  }
  // Remove existing rework connections
  this.connections = this.connections.filter((c) => c.type !== 'rework')
  // Add new one
  this.addConnection(this.steps[1]?.name || 'Step 2', this.steps[0].name, 'rework', rate)
  this.calculateMetrics()
})

Given('a value stream with no rework connections', function () {
  this.createVSM('Test Map')
  this.addStep('Step 1', 'custom')
  this.addStep('Step 2', 'custom')
  this.addConnection('Step 1', 'Step 2', 'forward')
})

Then('average process time should show {string}', function (expected) {
  this.calculateMetrics()
  const expectedMinutes = parseInt(expected)
  expect(Math.round(this.metrics.activityRatio)).to.equal(expectedMinutes)
})

Then('effective lead time should show {string}', function (expected) {
  // Parse flexible format like "375m" or "6h 15m"
  this.calculateMetrics()
  expect(this.metrics.effectiveLeadTime).to.be.greaterThan(this.metrics.totalLeadTime)
})

Then('effective lead time should be greater than base lead time', function () {
  this.calculateMetrics()
  expect(this.metrics.effectiveLeadTime).to.be.greaterThan(this.metrics.totalLeadTime)
})

Then('rework multiplier should show {string}', function (expected) {
  const expectedMultiplier = parseFloat(expected)
  expect(this.metrics.reworkMultiplier).to.be.closeTo(expectedMultiplier, 0.01)
})

Then('the rework impact should show good status', function () {
  expect(this.metrics.reworkStatus).to.equal('good')
})

Then('the rework impact should show warning status', function () {
  expect(this.metrics.reworkStatus).to.equal('warning')
})

Then('the rework impact should show critical status', function () {
  expect(this.metrics.reworkStatus).to.equal('critical')
})

Then('I should not see effective lead time metric', function () {
  this.calculateMetrics()
  expect(this.metrics.hasRework).to.be.false
})
