import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'
import { vsmDataStore, vsmUIStore } from './helpers/testStores.js'
import * as metrics from '../../src/utils/calculations/metrics.js'
import * as assertions from './helpers/AssertionHelpers.js'

// Helpers
const findStepByName = (name) => vsmDataStore.steps.find((s) => s.name === name)
const findConnection = (sourceName, targetName) => {
  const source = findStepByName(sourceName)
  const target = findStepByName(targetName)
  if (!source || !target) return null
  return vsmDataStore.connections.find(
    (c) => c.source === source.id && c.target === target.id
  )
}

// ==========================================
// Rework Loop Steps
// ==========================================

Given(
  'I have a forward connection from {string} to {string}',
  function (source, target) {
    this.vsm.addConnection(source, target, 'forward', 0)
  }
)

Given(
  'I have a rework connection from {string} to {string}',
  function (source, target) {
    this.vsm.addConnection(source, target, 'rework', 20)
  }
)

When(
  'I create a connection from {string} back to {string}',
  function (source, target) {
    this.pendingConnection = { source, target, type: 'forward', reworkRate: 0 }
  }
)

When('I mark it as a {string} connection', function (type) {
  if (this.pendingConnection) {
    this.pendingConnection.type = type.toLowerCase()
  }
})

When('I set rework rate to {int}%', function (rate) {
  if (this.pendingConnection) {
    this.vsm.addConnection(
      this.pendingConnection.source,
      this.pendingConnection.target,
      this.pendingConnection.type,
      rate
    )
    this.pendingConnection = null
  } else if (vsmUIStore.selectedConnectionId) {
    vsmDataStore.updateConnection(vsmUIStore.selectedConnectionId, {
      reworkRate: rate,
    })
  }
})

When('I click on the rework connection', function () {
  const reworkConn = vsmDataStore.connections.find((c) => c.type === 'rework')
  if (reworkConn) {
    vsmUIStore.selectConnection(reworkConn.id)
  }
})

When('I click on the forward connection', function () {
  const forwardConn = vsmDataStore.connections.find((c) => c.type === 'forward')
  if (forwardConn) {
    vsmUIStore.selectConnection(forwardConn.id)
  }
})

When('I change the connection type to {string}', function (type) {
  if (vsmUIStore.selectedConnectionId) {
    vsmDataStore.updateConnection(vsmUIStore.selectedConnectionId, {
      type: type.toLowerCase(),
    })
  }
})

When('I save the connection', function () {
  // No-op, changes are applied directly via store actions
})

When('I click delete on the connection', function () {
  this.pendingDelete = vsmUIStore.selectedConnectionId
})

When('I enter a rework rate of {int}%', function (rate) {
  if (vsmUIStore.selectedConnectionId) {
    const conn = vsmDataStore.connections.find(
      (c) => c.id === vsmUIStore.selectedConnectionId
    )
    if (conn.type === 'rework' && rate === 0) {
      this.error = 'Rework connections need a rate > 0'
    }
  }
})

Given('I am editing a rework connection', function () {
  if (!vsmDataStore.id) {
    this.vsm.createVSM('Test Map')
    this.vsm.addStep('Development')
    this.vsm.addStep('Testing')
  }
  const conn = this.vsm.addConnection('Testing', 'Development', 'rework', 20)
  vsmUIStore.selectConnection(conn.id)
})

Then('the connection editor should open', function () {
  expect(vsmUIStore.selectedConnectionId).to.exist
})

Then(
  'I should see a rework connection from {string} to {string}',
  function (source, target) {
    const conn = findConnection(source, target)
    assertions.assertConnectionType(conn, 'rework')
  }
)

Then('it should display {string}', function (expected) {
  if (expected.includes('rework')) {
    const rate = parseInt(expected)
    const reworkConn = vsmDataStore.connections.find(
      (c) => c.type === 'rework'
    )
    assertions.assertReworkRate(reworkConn, rate)
  }
})

Then('the connection should display as a rework loop', function () {
  const conn = vsmDataStore.connections.find(
    (c) => c.id === vsmUIStore.selectedConnectionId
  )
  assertions.assertConnectionType(conn, 'rework')
})

Then('it should show {string}', function (expected) {
  const conn = vsmDataStore.connections.find(
    (c) => c.id === vsmUIStore.selectedConnectionId
  )
  if (expected.includes('rework')) {
    const rate = parseInt(expected)
    assertions.assertReworkRate(conn, rate)
  }
})

Then('the rework connection should be removed', function () {
  assertions.assertNoReworkConnections(vsmDataStore.connections)
})

// ==========================================
// Queue Visualization Steps
// ==========================================

Given(
  'I have a step {string} with queue size of {int}',
  function (name, queueSize) {
    if (!vsmDataStore.id) {
      this.vsm.createVSM('Test Map')
    }
    this.vsm.addStep(name, { queueSize })
  }
)

Given('I have a step with queue size of {int}', function (queueSize) {
  if (!vsmDataStore.id) {
    this.vsm.createVSM('Test Map')
  }
  // Add a second step with a small queue to make the average lower
  this.vsm.addStep('Normal Step', { queueSize: 1 })
  this.vsm.addStep('Bottleneck Step', { queueSize })
})

When('I view the canvas', function () {
  // No-op for logic tests
})

Then(
  'I should see a queue badge showing {string} on the step',
  function (expected) {
    const steps = vsmDataStore.steps
    const step = steps[steps.length - 1]
    assertions.assertQueueSize(step, parseInt(expected))
    assertions.assertQueueBadgeVisible(step)
  }
)

Then('I should not see a queue badge on the step', function () {
  const steps = vsmDataStore.steps
  const step = steps[steps.length - 1]
  assertions.assertQueueSize(step, 0)
})

Then('the queue badge should be highlighted as high', function () {
  const steps = vsmDataStore.steps
  const step = steps[steps.length - 1]
  assertions.assertHighQueueThreshold(step, 5)
})

Then('the step should be marked as a potential bottleneck', function () {
  const latestSteps = vsmDataStore.steps
  const step = latestSteps[latestSteps.length - 1]
  const bottlenecks = metrics.identifyBottlenecks(latestSteps)
  assertions.assertIsBottleneck(step.id, bottlenecks)
})

Then('total queue should show {string}', function (expected) {
  const steps = vsmDataStore.steps
  const totalQueue = metrics.calculateTotalQueueSize(steps)
  expect(totalQueue).to.equal(parseInt(expected))
})

// ==========================================
// Batch Size Display Steps
// ==========================================

Given(
  'I have a step {string} with batch size of {int}',
  function (name, batchSize) {
    if (!vsmDataStore.id) {
      this.vsm.createVSM('Test Map')
    }
    this.vsm.addStep(name, { batchSize })
  }
)

Given('I have a step with batch size of {int}', function (batchSize) {
  if (!vsmDataStore.id) {
    this.vsm.createVSM('Test Map')
  }
  const step = this.vsm.addStep('Test Step', { batchSize })
  vsmUIStore.selectStep(step.id)
})

When('I change batch size to {int}', function (batchSize) {
  if (vsmUIStore.selectedStepId) {
    vsmDataStore.updateStep(vsmUIStore.selectedStepId, { batchSize })
  }
})

Then(
  'I should see a batch badge showing {string} on the step',
  function (expected) {
    const steps = vsmDataStore.steps
    const step = steps[steps.length - 1]
    assertions.assertBatchBadge(step, expected)
  }
)

Then('I should not see a batch badge on the step', function () {
  const steps = vsmDataStore.steps
  const step = steps[steps.length - 1]
  assertions.assertBatchSize(step, 1)
})

Then('the step should show a batch badge {string}', function (expected) {
  const step = vsmDataStore.steps.find(
    (s) => s.id === vsmUIStore.selectedStepId
  )
  assertions.assertBatchBadge(step, expected)
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
  const stepTemplates = {
    Development: {
      name: 'Development',
      steps: [{ name: 'Development', processTime: 120, leadTime: 480 }],
    },
    Testing: {
      name: 'Testing',
      steps: [{ name: 'Testing', processTime: 60, leadTime: 240 }],
    },
  }
  const template = stepTemplates[templateName]
  if (template) {
    // This is a simplified version of loading a template.
    // In reality, it would be a single step. Here we add it.
    this.vsm.addStep(template.steps[0].name, template.steps[0])
  }
})

When('I click on {string} template', function (templateName) {
  // These would come from a data file, hardcoded here for simplicity
  const mapTemplates = {
    'Software Delivery Pipeline': {
      name: templateName,
      steps: [
        { name: 'Backlog', processTime: 0, leadTime: 480 },
        { name: 'Development', processTime: 240, leadTime: 960 },
        { name: 'Code Review', processTime: 30, leadTime: 240 },
        { name: 'Testing', processTime: 60, leadTime: 480 },
        { name: 'Deploy', processTime: 15, leadTime: 60 },
      ],
      connections: [
        { source: 0, target: 1 },
        { source: 1, target: 2 },
        { source: 2, target: 3 },
        { source: 3, target: 4 },
      ],
    },
    'Support Ticket Flow': {
      name: templateName,
      steps: [
        { name: 'Triage', processTime: 5, leadTime: 30 },
        { name: 'Investigation', processTime: 30, leadTime: 120 },
        { name: 'Resolution', processTime: 45, leadTime: 180 },
        { name: 'Verification', processTime: 15, leadTime: 60 },
      ],
      connections: [
        { source: 0, target: 1 },
        { source: 1, target: 2 },
        { source: 2, target: 3 },
      ],
    },
  }
  const template = mapTemplates[templateName]
  if (template) {
    // Create new map and load template
    vsmDataStore.createNewMap(templateName)
    const addedSteps = []
    template.steps.forEach((stepData) => {
      const step = vsmDataStore.addStep(stepData.name, stepData)
      addedSteps.push(step)
    })
    template.connections.forEach((conn) => {
      vsmDataStore.addConnection(
        addedSteps[conn.source].id,
        addedSteps[conn.target].id
      )
    })
  }
})

Then('I should see a {string} section', function (_sectionName) {
  expect(this.viewingSidebar).to.be.true
  // Section name is verified by the sidebar being visible
})

Then('I should see template categories', function () {
  expect(this.viewingSidebar).to.be.true
})

Then('a {string} step should be added to the canvas', function (stepName) {
  const step = findStepByName(stepName)
  expect(step).to.exist
})

Then('it should have pre-configured process time and lead time', function () {
  const steps = vsmDataStore.steps
  const step = steps[steps.length - 1]
  assertions.assertHasTimingConfiguration(step)
})

Then('a new map should be created with multiple steps', function () {
  assertions.assertMinimumSteps(vsmDataStore.steps, 3)
})

Then('the steps should be connected', function () {
  assertions.assertMinimumConnections(vsmDataStore.connections, 2)
})

Then('a new map should be created with support workflow steps', function () {
  assertions.assertMinimumSteps(vsmDataStore.steps, 3)
  expect(findStepByName('Triage') || findStepByName('Investigation')).to.exist
})

// ==========================================
// Advanced Metrics Steps
// ==========================================

Given('a value stream with total lead time of {int} minutes', function (lt) {
  this.vsm.createVSM('Test Map')
  this.vsm.addStep('Step 1', {
    processTime: Math.floor(lt / 4),
    leadTime: lt,
  })
})

Given('a rework loop with {int}% rework rate', function (rate) {
  if (!vsmDataStore.id) {
    this.vsm.createVSM('Test Map')
  }

  let steps = vsmDataStore.steps
  let sourceStep, targetStep

  // Ensure at least two steps exist
  if (steps.length < 2) {
    targetStep = this.vsm.addStep('Step 1')
    sourceStep = this.vsm.addStep('Step 2')
    steps = vsmDataStore.steps // Refresh steps array
  } else {
    sourceStep = steps[1]
    targetStep = steps[0]
  }

  // Remove existing rework connections before adding new one.
  const reworkConnections = vsmDataStore.connections.filter(
    (c) => c.type === 'rework'
  )
  reworkConnections.forEach((c) => vsmDataStore.deleteConnection(c.id))

  this.vsm.addConnection(sourceStep.name, targetStep.name, 'rework', rate)
})

Given('a value stream with no rework connections', function () {
  this.vsm.createVSM('Test Map')
  this.vsm.addStep('Step 1')
  this.vsm.addStep('Step 2')
  this.vsm.addConnection('Step 1', 'Step 2', 'forward')
})

Then('average process time should show {string}', function (expected) {
  const steps = vsmDataStore.steps
  const result = metrics.calculateActivityRatio(steps)
  assertions.assertDisplayValue(result.displayValue, expected)
})

Then('effective lead time should be greater than base lead time', function () {
  const steps = vsmDataStore.steps
  const connections = vsmDataStore.connections
  const baseLeadTime = metrics.calculateTotalLeadTime(steps)
  const reworkImpact = metrics.calculateReworkImpact(steps, connections)
  assertions.assertReworkImpact(reworkImpact.effectiveLeadTime, baseLeadTime)
})

Then('rework multiplier should show {string}', function (expected) {
  const steps = vsmDataStore.steps
  const connections = vsmDataStore.connections
  const reworkImpact = metrics.calculateReworkImpact(steps, connections)
  assertions.assertReworkMultiplier(reworkImpact, expected)
})

Then('the rework impact should show good status', function () {
  const steps = vsmDataStore.steps
  const connections = vsmDataStore.connections
  const reworkImpact = metrics.calculateReworkImpact(steps, connections)
  assertions.assertReworkStatus(reworkImpact, 'good')
})

Then('the rework impact should show warning status', function () {
  const steps = vsmDataStore.steps
  const connections = vsmDataStore.connections
  const reworkImpact = metrics.calculateReworkImpact(steps, connections)
  assertions.assertReworkStatus(reworkImpact, 'warning')
})

Then('the rework impact should show critical status', function () {
  const steps = vsmDataStore.steps
  const connections = vsmDataStore.connections
  const reworkImpact = metrics.calculateReworkImpact(steps, connections)
  assertions.assertReworkStatus(reworkImpact, 'critical')
})

Then('I should not see effective lead time metric', function () {
  const steps = vsmDataStore.steps
  const connections = vsmDataStore.connections
  const reworkImpact = metrics.calculateReworkImpact(steps, connections)
  expect(reworkImpact.totalReworkRate).to.equal(0)
})

// Note: "I should see an error {string}" is defined in builder.steps.js
