# Testing Patterns

**Examples for unit, integration, and acceptance testing.**

---

## Unit Testing (Vitest)

### Testing Calculations

```javascript
import { describe, it, expect } from 'vitest'
import { calculateFlowEfficiency } from '../../../src/utils/calculations/metrics'

describe('calculateFlowEfficiency', () => {
  it('calculates flow efficiency correctly', () => {
    const vsm = {
      steps: [
        { processTime: 60, leadTime: 240 },
        { processTime: 30, leadTime: 120 }
      ]
    }

    const result = calculateFlowEfficiency(vsm)

    expect(result).toBeCloseTo(0.25, 2) // 25%
  })

  it('handles zero lead time', () => {
    const vsm = {
      steps: [{ processTime: 60, leadTime: 0 }]
    }

    const result = calculateFlowEfficiency(vsm)

    expect(result).toBe(0)
  })

  it('returns 0 for empty VSM', () => {
    const vsm = { steps: [] }

    const result = calculateFlowEfficiency(vsm)

    expect(result).toBe(0)
  })
})
```

### Testing Factory Functions

```javascript
import { describe, it, expect } from 'vitest'
import { createStep } from '../../../src/models/StepFactory'

describe('createStep', () => {
  it('creates step with default values', () => {
    const step = createStep({
      name: 'Development',
      processTime: 60,
      leadTime: 240
    })

    expect(step).toMatchObject({
      name: 'Development',
      processTime: 60,
      leadTime: 240,
      type: 'development',
      percentCompleteAccurate: 100
    })
    expect(step.id).toBeDefined()
  })

  it('generates unique IDs', () => {
    const step1 = createStep({ name: 'Step 1' })
    const step2 = createStep({ name: 'Step 2' })

    expect(step1.id).not.toBe(step2.id)
  })
})
```

---

## Integration Testing

### E2E Component Testing (Playwright)

Since this is a Svelte 5 project, integration tests are done via Playwright E2E tests:

```javascript
import { test, expect } from '@playwright/test'

test.describe('StepEditor integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => window.localStorage.clear())
    await page.goto('/')
    await page.getByTestId('new-map-name-input').fill('Test Map')
    await page.getByTestId('create-map-button').click()
  })

  test('updates store when user saves step', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Step' }).click()

    await page.getByTestId('step-name-input').fill('Development')
    await page.getByTestId('process-time-input').fill('60')
    await page.getByTestId('lead-time-input').fill('240')
    await page.getByRole('button', { name: 'Save' }).click()

    // Verify step appears in canvas
    await expect(page.locator('.vsm-node')).toBeVisible()
    await expect(page.locator('.vsm-node')).toContainText('Development')
  })

  test('validates lead time >= process time', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Step' }).click()

    await page.getByTestId('process-time-input').fill('100')
    await page.getByTestId('lead-time-input').fill('50')
    await page.getByRole('button', { name: 'Save' }).click()

    // Verify error message
    await expect(page.getByText(/Lead time must be >= process time/i)).toBeVisible()
  })
})
```

### Testing Store Logic (Unit)

```javascript
import { describe, it, expect } from 'vitest'

describe('vsmDataStore logic', () => {
  it('adds step and auto-calculates position', () => {
    const store = createVsmDataStore()
    store.addStep({ id: '1', name: 'Development', processTime: 60 })

    expect(store.steps).toHaveLength(1)
    expect(store.steps[0].name).toBe('Development')
  })

  it('deletes step and cascades to connections', () => {
    const store = createVsmDataStore()
    store.addStep({ id: '1', name: 'Dev' })
    store.addStep({ id: '2', name: 'Test' })
    store.addConnection({ id: 'c1', source: '1', target: '2' })

    store.deleteStep('1')

    expect(store.steps).toHaveLength(1)
    expect(store.connections).toHaveLength(0)
  })
})
```

---

## Acceptance Testing (Cucumber)

### Feature File

```gherkin
Feature: Add step to VSM
  As a VSM creator
  I want to add steps to my value stream
  So that I can visualize my process

  Scenario: Add a development step
    Given I have an empty VSM
    When I add a step with the following details:
      | field      | value       |
      | name       | Development |
      | type       | development |
      | processTime| 60          |
      | leadTime   | 240         |
    Then the VSM should contain 1 step
    And the step should be visible in the canvas

  Scenario: Validate lead time >= process time
    Given I have an empty VSM
    When I try to add a step with process time 100 and lead time 50
    Then I should see an error "Lead time must be >= process time"
    And the step should not be added
```

### Step Definitions

```javascript
import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'chai'

// Acceptance tests use Playwright-based step definitions
// interacting with the running app via browser automation

Given('I have an empty VSM', async function () {
  await this.page.goto('/')
  await this.page.evaluate(() => window.localStorage.clear())
  await this.page.goto('/')
})

When('I add a step with the following details:', async function (dataTable) {
  const data = dataTable.rowsHash()

  await this.page.getByRole('button', { name: 'Add Step' }).click()

  await this.page.getByTestId('step-name-input').fill(data.name)
  await this.page.getByTestId('process-time-input').fill(data.processTime)
  await this.page.getByTestId('lead-time-input').fill(data.leadTime)

  await this.page.getByRole('button', { name: 'Save' }).click()
})

Then('the VSM should contain {int} step(s)', async function (expectedCount) {
  const nodes = this.page.locator('.vsm-node')
  await expect(nodes).toHaveCount(expectedCount)
})

Then('the step should be visible in the canvas', async function () {
  await expect(this.page.locator('.vsm-node').first()).toBeVisible()
})

When('I try to add a step with process time {int} and lead time {int}',
  async function (processTime, leadTime) {
    await this.page.getByRole('button', { name: 'Add Step' }).click()
    await this.page.getByTestId('process-time-input').fill(processTime.toString())
    await this.page.getByTestId('lead-time-input').fill(leadTime.toString())
    await this.page.getByRole('button', { name: 'Save' }).click()
  }
)

Then('I should see an error {string}', async function (errorMessage) {
  await expect(this.page.getByText(new RegExp(errorMessage, 'i'))).toBeVisible()
})
```

---

## Simulation Testing

### Testing Simulation Engine

```javascript
import { describe, it, expect } from 'vitest'
import { createSimulationEngine } from '../../../src/utils/simulation/simulationEngine'

describe('simulationEngine', () => {
  it('processes work items through steps', () => {
    const steps = [
      { id: 'step-1', processTime: 60, percentCompleteAccurate: 100 },
      { id: 'step-2', processTime: 30, percentCompleteAccurate: 100 }
    ]

    const engine = createSimulationEngine(steps, {
      workItemCount: 1,
      maxTicks: 100
    })

    // Initial state
    let state = engine.getState()
    expect(state.workItems[0].currentStep).toBe(0)

    // Process for 60 ticks (step 1 duration)
    for (let i = 0; i < 60; i++) {
      engine.tick()
    }

    // Should move to step 2
    state = engine.getState()
    expect(state.workItems[0].currentStep).toBe(1)

    // Process for 30 more ticks (step 2 duration)
    for (let i = 0; i < 30; i++) {
      engine.tick()
    }

    // Should be complete
    state = engine.getState()
    expect(state.workItems[0].isComplete).toBe(true)
  })

  it('respects queue limits', () => {
    const steps = [
      { id: 'step-1', processTime: 60, queueLimit: 3 }
    ]

    const engine = createSimulationEngine(steps, {
      workItemCount: 10,
      maxTicks: 100
    })

    // Check that queue never exceeds limit
    for (let i = 0; i < 100; i++) {
      engine.tick()
      const state = engine.getState()

      const queueSize = state.stepStates[0].queue.length
      expect(queueSize).toBeLessThanOrEqual(3)
    }
  })
})
```

---

## Test Data Builders

### Mock VSM Factory

```javascript
// tests/fixtures/vsmBuilder.js

export function createMockVSM({
  stepCount = 3,
  connectionCount = 2,
  ...overrides
} = {}) {
  const steps = Array.from({ length: stepCount }, (_, i) => ({
    id: `step-${i}`,
    name: `Step ${i + 1}`,
    type: 'development',
    processTime: 60,
    leadTime: 240,
    percentCompleteAccurate: 95,
    position: { x: i * 200, y: 100 }
  }))

  const connections = Array.from({ length: connectionCount }, (_, i) => ({
    id: `conn-${i}`,
    source: `step-${i}`,
    target: `step-${i + 1}`,
    type: 'forward'
  }))

  return {
    steps,
    connections,
    metadata: {
      name: 'Test VSM',
      description: 'Test value stream map',
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    ...overrides
  }
}
```

**Usage:**

```javascript
import { createMockVSM } from '../fixtures/vsmBuilder'

it('calculates metrics for VSM', () => {
  const vsm = createMockVSM({ stepCount: 5 })
  const metrics = calculateMetrics(vsm)

  expect(metrics.totalLeadTime).toBe(1200) // 5 * 240
})
```

---

## Test Organization

### File Structure

```
tests/
├── unit/
│   ├── calculations/
│   │   ├── flowEfficiency.test.js
│   │   └── metrics.test.js
│   ├── simulation/
│   │   └── simulationEngine.test.js
│   └── stores/
│       └── vsmStore.test.js
├── integration/
│   └── components/
│       └── StepEditor.test.jsx
└── fixtures/
    ├── vsmBuilder.js
    └── mockData.js
```

### Test Naming

```javascript
// Good: Descriptive test names
it('calculates flow efficiency correctly', () => {})
it('handles zero lead time gracefully', () => {})
it('validates lead time >= process time', () => {})

// Bad: Vague test names
it('works', () => {})
it('test calculation', () => {})
```

---

## Related Documentation

- [Testing Rules](../rules/testing.md) - Complete testing guidelines
- [ATDD Workflow](../rules/atdd-workflow.md) - Test-first process
- [Quality Verification](../rules/quality-verification.md) - Running tests
- [Svelte Component Examples](svelte-components.md) - Component patterns to test
