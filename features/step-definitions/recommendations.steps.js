import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'
import { vsmDataStore } from './helpers/testStores.js'
import { generateRecommendations } from '../../src/utils/calculations/recommendations.js'

const recs = () =>
  generateRecommendations(vsmDataStore.cdReadiness, vsmDataStore.metrics.bottleneckIds)

const recById = (id) => recs().find((r) => r.id === id)

Given('a healthy value stream with an automated deployment', function () {
  this.vsm.createVSM('Healthy Map')
  this.vsm.addStep('Development', {
    type: 'development',
    processTime: 120,
    leadTime: 360,
    percentCompleteAccurate: 100,
  })
  this.vsm.addStep('Deploy', { type: 'deployment', processTime: 60, leadTime: 180, automated: true })
})

When('I view the recommendations', function () {
  // Derived from store state; nothing to trigger.
})

Then('there are no recommendations', function () {
  expect(recs()).to.have.lengthOf(0)
})

Then('there is a recommendation for {string}', function (id) {
  expect(recById(id)).to.exist
})

Then('the recommendation for {string} deep-links to the practice guide', function (id) {
  expect(recById(id).link).to.match(/beyond\.minimumcd\.org/)
})

Then('the first recommendation is for {string}', function (id) {
  expect(recs()[0].id).to.equal(id)
})

Then('the recommendation for {string} is marked as a constraint', function (id) {
  expect(recById(id).priority).to.equal('high')
})
