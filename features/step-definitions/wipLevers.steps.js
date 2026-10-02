import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'
import { vsmDataStore } from './helpers/testStores.js'
import {
  wipFromLittlesLaw,
  projectBatchSizeChange,
} from '../../src/utils/calculations/littlesLaw.js'
import { calculateTotalLeadTime } from '../../src/utils/calculations/metrics.js'

const stepByName = (name) => vsmDataStore.steps.find((s) => s.name === name)

Given(
  'a step {string} with process time {int}, lead time {int}, and batch size {int}',
  function (name, pt, lt, batch) {
    this.vsm.createVSM('Levers Map')
    this.vsm.addStep(name, { processTime: pt, leadTime: lt, batchSize: batch })
  }
)

When('the team throughput is {int} items per day', function (throughput) {
  this.throughput = throughput
})

When('I project halving the batch size of {string}', function (name) {
  const step = stepByName(name)
  this.projection = projectBatchSizeChange(step, Math.ceil(step.batchSize / 2))
})

When('I project doubling the batch size of {string}', function (name) {
  const step = stepByName(name)
  this.projection = projectBatchSizeChange(step, step.batchSize * 2)
})

Then('the estimated work in progress is {int} items', function (items) {
  const totalLead = calculateTotalLeadTime(vsmDataStore.steps)
  expect(wipFromLittlesLaw(this.throughput, totalLead)).to.equal(items)
})

Then('the projected lead time for {string} is {int} minutes', function (_name, minutes) {
  expect(this.projection.projectedLeadTime).to.equal(minutes)
})

Then(
  'the projected lead time for {string} is greater than {int} minutes',
  function (_name, minutes) {
    expect(this.projection.projectedLeadTime).to.be.greaterThan(minutes)
  }
)
