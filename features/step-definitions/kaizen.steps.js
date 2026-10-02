import { When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'
import { vsmDataStore } from './helpers/testStores.js'
import {
  groupAnnotationsByWaste,
  summarizeAnnotations,
} from '../../src/utils/annotations.js'

const stepByName = (name) => vsmDataStore.steps.find((s) => s.name === name)

When(
  'I annotate the {string} step with {string} waste noted {string}',
  function (stepName, wasteType, note) {
    const step = stepByName(stepName)
    this.lastAnnotation = vsmDataStore.addAnnotation('step', step.id, wasteType, note)
  }
)

When('I remove that annotation', function () {
  vsmDataStore.removeAnnotation(this.lastAnnotation.id)
})

When('I delete the {string} step', function (stepName) {
  vsmDataStore.deleteStep(stepByName(stepName).id)
})

Then('the improvement backlog has {int} kaizen burst(s)', function (count) {
  expect(summarizeAnnotations(vsmDataStore.annotations).total).to.equal(count)
})

Then('the backlog has {int} {string} annotation(s)', function (count, wasteType) {
  const group = groupAnnotationsByWaste(vsmDataStore.annotations)[wasteType] || []
  expect(group).to.have.lengthOf(count)
})
