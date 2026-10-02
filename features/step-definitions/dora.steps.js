import { When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'
import { vsmDataStore } from './helpers/testStores.js'
import {
  reconcileLeadTime,
  classifyDora,
} from '../../src/utils/calculations/doraReconciliation.js'

const reconciliation = () => reconcileLeadTime(vsmDataStore.steps, vsmDataStore.dora)

When('I view the DORA panel', function () {
  // Derived from store state; nothing to trigger.
})

When('I record an actual lead time for changes of {int} minutes', function (minutes) {
  vsmDataStore.setDora({ leadTimeForChangesMinutes: minutes })
})

When('I record the following DORA metrics:', function (dataTable) {
  const updates = {}
  dataTable.raw().forEach(([key, value]) => {
    updates[key] = Number(value)
  })
  vsmDataStore.setDora(updates)
})

Then('the lead-time reconciliation status is {string}', function (status) {
  expect(reconciliation().status).to.equal(status)
})

Then('the lead-time reconciliation shows a hidden queue of {int} minutes', function (minutes) {
  expect(reconciliation().hiddenQueue).to.equal(minutes)
})

Then('the {string} DORA metric is rated {string}', function (metric, tier) {
  expect(classifyDora(vsmDataStore.dora)[metric]).to.equal(tier)
})
