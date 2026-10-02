import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'
import { vsmDataStore } from './helpers/testStores.js'
import { calculateWaitTimeBreakdown } from '../../src/utils/calculations/waitTime.js'

const rowByName = (name) =>
  calculateWaitTimeBreakdown(vsmDataStore.steps).steps.find((r) => r.name === name)

Given(
  'a manual approval step {string} with process time {int} and lead time {int}',
  function (name, pt, lt) {
    this.vsm.createVSM('Waterfall Map')
    this.vsm.addStep(name, { processTime: pt, leadTime: lt, automated: false })
  }
)

When('I view the wait-time waterfall', function () {
  // Derived from store state; nothing to trigger.
})

Then('I see a message to add steps for the waterfall', function () {
  expect(vsmDataStore.steps).to.have.lengthOf(0)
})

Then('the wait-time waterfall shows {string} as {int}% waiting', function (name, percentage) {
  expect(rowByName(name).waitPercentage).to.equal(percentage)
})

Then('{string} is flagged as a hidden queue', function (name) {
  expect(rowByName(name).waitDominated).to.equal(true)
})

Then('{string} is not flagged as a hidden queue', function (name) {
  expect(rowByName(name).waitDominated).to.equal(false)
})

Then('{string} is flagged as a handoff', function (name) {
  expect(rowByName(name).manual).to.equal(true)
})

Then('the wait-time summary shows {int}% waiting', function (percentage) {
  expect(calculateWaitTimeBreakdown(vsmDataStore.steps).totals.waitPercentage).to.equal(percentage)
})
