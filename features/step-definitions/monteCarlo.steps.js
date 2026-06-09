import { When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'
import { vsmDataStore } from './helpers/testStores.js'
import { runMonteCarlo } from '../../src/utils/simulation/monteCarlo.js'

When('I run a Monte-Carlo simulation with {int}% variability', function (percent) {
  this.mcOptions = { trials: 500, variability: percent / 100, seed: 7 }
  this.mc = runMonteCarlo(vsmDataStore.steps, this.mcOptions)
})

Then('the P50 lead time is {int} minutes', function (minutes) {
  expect(this.mc.p50).to.equal(minutes)
})

Then('the P95 lead time is at least the P50 lead time', function () {
  expect(this.mc.p95).to.be.at.least(this.mc.p50)
})

Then('the simulation is reproducible for the same seed', function () {
  const repeat = runMonteCarlo(vsmDataStore.steps, this.mcOptions)
  expect(repeat.p95).to.equal(this.mc.p95)
  expect(repeat.mean).to.equal(this.mc.mean)
})
