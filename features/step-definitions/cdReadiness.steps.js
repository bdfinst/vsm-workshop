import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'
import { vsmDataStore } from './helpers/testStores.js'
import {
  groupReadinessItems,
  readinessStatusText,
} from '../../src/utils/ui/readinessScorecard.js'

const itemByLabel = (label) => vsmDataStore.cdReadiness.find((i) => i.label === label)
const stepByName = (name) => vsmDataStore.steps.find((s) => s.name === name)
const groupByHeading = (heading) => {
  const grouped = groupReadinessItems(vsmDataStore.cdReadiness)
  return heading === 'Flow Readiness Signals' ? grouped.signals : grouped.practices
}

// --- Setup ---

Given('a value stream with readiness steps', function () {
  this.vsm.createVSM('Readiness Map')
  this.vsm.addStep('Development', { type: 'development', leadTime: 360, processTime: 120 })
  this.vsm.addStep('Deploy', { type: 'deployment', automated: true })
})

Given('a value stream whose {string} step has a lead time of {int} minutes', function (name, lt) {
  this.vsm.createVSM('Readiness Map')
  this.vsm.addStep(name, { type: 'development', leadTime: lt })
})

Given(
  'a value stream whose {string} step has a lead time of {int} minutes and a process time of {int} minutes',
  function (name, lt, pt) {
    this.vsm.createVSM('Readiness Map')
    this.vsm.addStep(name, { type: 'development', leadTime: lt, processTime: pt })
  }
)

When('I open the CD readiness scorecard', function () {
  // The scorecard derives from store state; nothing to trigger.
})

// --- Assertions ---

Then('the scorecard shows a {string} group with {int} items', function (heading, count) {
  expect(groupByHeading(heading)).to.have.lengthOf(count)
})

Then('I see a message to add steps before assessing readiness', function () {
  expect(vsmDataStore.steps).to.have.lengthOf(0)
})

Then('the {string} item shows a gap', function (label) {
  expect(itemByLabel(label).status).to.equal('gap')
})

Then('the {string} item names the {string} step', function (label, stepName) {
  expect(itemByLabel(label).stepId).to.equal(stepByName(stepName).id)
})

Then('the {string} item shows the status text {string}', function (label, text) {
  expect(readinessStatusText(itemByLabel(label).status)).to.equal(text)
})

Then(
  'within the {string} group the gap items appear before the met items',
  function (heading) {
    const statuses = groupByHeading(heading).map((i) => i.status)
    const lastGap = statuses.lastIndexOf('gap')
    const firstMet = statuses.indexOf('met')
    expect(lastGap).to.be.lessThan(firstMet)
  }
)

Then('the scorecard mentions no migration phase', function () {
  const text = vsmDataStore.cdReadiness
    .map((i) => `${i.label} ${i.explanation}`)
    .join(' ')
  expect(text).to.not.match(/Phase \d/i)
})

// --- Slice 4: confirm / override / reset ---

const idByLabel = (label) => vsmDataStore.cdReadiness.find((i) => i.label === label).id

const SELECT_ACTIONS = {
  'Yes, this is a gap': (id) => vsmDataStore.confirmReadiness(id),
  'Mark as met anyway': (id) => vsmDataStore.setReadinessOverride(id, 'met'),
  Reset: (id) => vsmDataStore.resetReadiness(id),
}

Given('the scorecard flags a {string} gap', function (label) {
  this.vsm.createVSM('Override Map')
  this.vsm.addStep('Development', { type: 'development', leadTime: 1200, processTime: 60 })
  expect(itemByLabel(label).status).to.equal('gap')
})

Given('the scorecard flags a {string} gap for step {string}', function (label, stepName) {
  this.vsm.createVSM('Override Map')
  this.vsm.addStep(stepName, { type: 'development', leadTime: 1200, processTime: 60 })
  expect(itemByLabel(label).status).to.equal('gap')
})

Given('I have overridden {string} to met', function (label) {
  vsmDataStore.setReadinessOverride(idByLabel(label), 'met')
})

When('I select {string} for {string}', function (action, label) {
  SELECT_ACTIONS[action](idByLabel(label))
})

Then('the {string} item is marked as confirmed', function (label) {
  expect(itemByLabel(label).source).to.equal('confirmed')
})

Then('the {string} item is marked as overridden', function (label) {
  expect(itemByLabel(label).source).to.equal('overridden')
})

Then('the {string} item is marked as inferred', function (label) {
  expect(itemByLabel(label).source).to.equal('inferred')
})

Then('the lead time of step {string} is unchanged', function (stepName) {
  expect(stepByName(stepName).leadTime).to.equal(1200)
})

Then('the process time of step {string} is unchanged', function (stepName) {
  expect(stepByName(stepName).processTime).to.equal(60)
})
