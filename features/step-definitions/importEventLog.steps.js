import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'
import { vsmDataStore, vsmIOStore } from './helpers/testStores.js'

Given('the following CSV event log:', function (dataTable) {
  this.eventLogCsv = dataTable
    .raw()
    .map((row) => row.join(','))
    .join('\n')
})

When('I import the event log as {string}', function (format) {
  this.importResult = vsmIOStore.importEventLog(this.eventLogCsv, format)
})

Then('the imported map has steps {string}', function (names) {
  const expected = names.split(',').map((n) => n.trim())
  expect(vsmDataStore.steps.map((s) => s.name)).to.deep.equal(expected)
})

Then('the {string} step is a testing step', function (name) {
  const step = vsmDataStore.steps.find((s) => s.name === name)
  expect(step.type).to.equal('testing')
})

Then('the imported map has a rework connection', function () {
  expect(vsmDataStore.connections.some((c) => c.type === 'rework')).to.equal(true)
})

Then('the import is rejected', function () {
  expect(this.importResult).to.equal(false)
})
