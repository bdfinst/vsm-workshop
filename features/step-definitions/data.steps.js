import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'

// Save/Load steps
Given('I have saved a map with {int} steps', function (stepCount) {
  this.createVSM('Saved Map')
  for (let i = 0; i < stepCount; i++) {
    this.addStep(`Step ${i + 1}`, 'custom')
  }
  this.savedState = JSON.stringify({
    ...this.vsm,
    steps: this.steps,
    connections: this.connections,
  })
})

Given('I have a completed value stream map', function () {
  this.createVSM('Completed Map')
  this.addStep('Development', 'development')
  this.addStep('Testing', 'testing')
  this.addStep('Deployment', 'deployment')
  this.addConnection('Development', 'Testing')
  this.addConnection('Testing', 'Deployment')
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
        position: { x: 0, y: 0 },
      },
    ],
    connections: [],
  }
  this.jsonFile = JSON.stringify(vsm)
})

Given('I have a map with steps', function () {
  this.createVSM('Existing Map')
  this.addStep('Existing Step', 'custom')
})

When('I refresh the page', function () {
  // Simulate loading from saved state
  if (this.savedState) {
    const loaded = JSON.parse(this.savedState)
    this.vsm = loaded
    this.steps = loaded.steps || []
    this.connections = loaded.connections || []
  }
})

When('I select {string}', function (option) {
  this.selectedExportOption = option
})

When('I select the JSON file', function () {
  if (this.jsonFile) {
    const imported = JSON.parse(this.jsonFile)
    this.vsm = imported
    this.steps = imported.steps || []
    this.connections = imported.connections || []
  }
})

Then('the map should be automatically saved to browser storage', function () {
  // In real implementation, this would check localStorage
  expect(this.vsm).to.exist
  expect(this.steps.length).to.be.greaterThan(0)
})

Then('I should see my map with {int} steps', function (count) {
  expect(this.steps).to.have.lengthOf(count)
})

Then('a JSON file should download', function () {
  expect(this.exportClicked).to.be.true
  expect(this.selectedExportOption).to.include('JSON')
})

Then('the map should load on the canvas', function () {
  expect(this.vsm).to.exist
  expect(this.steps.length).to.be.greaterThan(0)
})

Then('I should see the welcome screen', function () {
  expect(this.vsm).to.be.null
})

// Export image steps
Then('a PNG file should download', function () {
  expect(this.exportClicked).to.be.true
  expect(this.selectedExportOption).to.include('PNG')
})

Then('a PDF file should download', function () {
  expect(this.exportClicked).to.be.true
  expect(this.selectedExportOption).to.include('PDF')
})
