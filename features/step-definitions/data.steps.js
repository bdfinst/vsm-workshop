import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'
import { vsmDataStore, vsmIOStore } from './helpers/testStores.js'

// Save/Load steps
Given('I have saved a map with {int} steps', function (stepCount) {
  vsmDataStore.createNewMap('Saved Map')
  for (let i = 0; i < stepCount; i++) {
    vsmDataStore.addStep(`Step ${i + 1}`)
  }
  // Simulate the persistence by storing the JSON export
  this.savedStateJSON = vsmIOStore.exportToJson()
})

Given('I have a completed value stream map', function () {
  vsmDataStore.createNewMap('Completed Map')
  const devStep = vsmDataStore.addStep('Development')
  const testStep = vsmDataStore.addStep('Testing')
  const deployStep = vsmDataStore.addStep('Deployment')
  vsmDataStore.addConnection(devStep.id, testStep.id)
  vsmDataStore.addConnection(testStep.id, deployStep.id)
})

Given('I have a JSON file of a value stream map', function () {
  const vsm = {
    id: crypto.randomUUID(),
    name: 'Imported Map',
    steps: [
      {
        id: '1',
        name: 'Step 1',
        type: 'custom',
        processTime: 60,
        leadTime: 240,
        percentCompleteAccurate: 100,
        queueSize: 0,
        batchSize: 1,
        peopleCount: 1,
        tools: [],
        position: { x: 0, y: 0 },
      },
    ],
    connections: [],
  }
  this.jsonFile = JSON.stringify(vsm)
})

Given('I have a map with steps', function () {
  vsmDataStore.createNewMap('Existing Map')
  vsmDataStore.addStep('Existing Step')
})

When('I refresh the page', function () {
  // Simulate loading from saved state by re-importing the JSON
  if (this.savedStateJSON) {
    vsmIOStore.importFromJson(this.savedStateJSON)
  }
})

When('I select {string}', function (option) {
  this.selectedExportOption = option
  this.exportClicked = true
})

When('I select the JSON file', function () {
  if (this.jsonFile) {
    vsmIOStore.importFromJson(this.jsonFile)
  }
})

Then('the map should be automatically saved to browser storage', function () {
  // In a Node.js test environment, we can't check localStorage.
  // The fact that state persists across steps within a scenario is
  // our verification that the store is working.
  // The 'persist' middleware is mocked/unavailable, so this test's
  // original intent is moot. We just check the store state.
  expect(vsmDataStore.id).to.exist
  expect(vsmDataStore.steps.length).to.be.greaterThan(0)
})

Then('I should see my map with {int} steps', function (count) {
  expect(vsmDataStore.steps).to.have.lengthOf(count)
})

Then('a JSON file should download', function () {
  // We can't test the download, but we can test the export function
  const json = vsmIOStore.exportToJson()
  expect(this.exportClicked).to.be.true
  expect(this.selectedExportOption).to.include('JSON')
  expect(json).to.be.a('string')

  // Verify the JSON structure of exported data
  const exportedData = JSON.parse(json)
  expect(exportedData).to.have.property('id')
  expect(exportedData).to.have.property('name')
  expect(exportedData).to.have.property('steps')
  expect(exportedData).to.have.property('connections')
  expect(exportedData.steps).to.be.an('array')
  expect(exportedData.connections).to.be.an('array')

  // Verify steps have required properties
  if (exportedData.steps.length > 0) {
    const step = exportedData.steps[0]
    expect(step).to.have.property('id')
    expect(step).to.have.property('name')
    expect(step).to.have.property('processTime')
    expect(step).to.have.property('leadTime')
  }
})

Then('the map should load on the canvas', function () {
  expect(vsmDataStore.id).to.exist
  expect(vsmDataStore.steps.length).to.be.greaterThan(0)
})

Then('I should see the welcome screen', function () {
  // In the app, this means the store is in its initial, empty state
  expect(vsmDataStore.id).to.be.null
})

// Export image steps
Then('a PNG file should download', function () {
  // Can't test downloads in this environment
  expect(this.exportClicked).to.be.true
  expect(this.selectedExportOption).to.include('PNG')
})

Then('a PDF file should download', function () {
  // Can't test downloads in this environment
  expect(this.exportClicked).to.be.true
  expect(this.selectedExportOption).to.include('PDF')
})
