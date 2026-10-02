import { When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'
import { vsmDataStore } from './helpers/testStores.js'
import { compareStates } from '../../src/utils/calculations/futureState.js'

const stepByName = (name) => vsmDataStore.steps.find((s) => s.name === name)

const comparison = () =>
  compareStates(
    vsmDataStore.baseline?.steps ?? null,
    vsmDataStore.baseline?.connections ?? [],
    vsmDataStore.steps,
    vsmDataStore.connections
  )

When('I view the state comparison', function () {
  // Derived from store state; nothing to trigger.
})

When('I capture the current state as the baseline', function () {
  vsmDataStore.captureBaseline()
})

When('I reduce the lead time of {string} to {int}', function (name, leadTime) {
  vsmDataStore.updateStep(stepByName(name).id, { leadTime })
})

Then('there is no state comparison', function () {
  expect(comparison()).to.equal(null)
})

Then('the future-state total lead time delta is {int} minutes', function (delta) {
  expect(comparison().deltas.totalLeadTime.delta).to.equal(delta)
})

Then('the future-state total lead time is improved', function () {
  expect(comparison().deltas.totalLeadTime.improved).to.equal(true)
})
