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

### Testing Components with Stores

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useVsmStore } from '../../../src/stores/vsmStore'
import StepEditor from '../../../src/components/builder/StepEditor'

describe('StepEditor integration', () => {
  beforeEach(() => {
    // Reset store before each test
    useVsmStore.setState({
      steps: [
        { id: 'step-1', name: 'Original Name', processTime: 60, leadTime: 240 }
      ]
    })
  })

  it('updates store when user saves step', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(<StepEditor stepId="step-1" onSave={onSave} onCancel={vi.fn()} />)

    // Update name
    const nameInput = screen.getByTestId('step-name-input')
    await user.clear(nameInput)
    await user.type(nameInput, 'New Name')

    // Submit
    const saveButton = screen.getByTestId('save-button')
    await user.click(saveButton)

    // Verify store was updated
    const updatedStep = useVsmStore.getState().getStepById('step-1')
    expect(updatedStep.name).toBe('New Name')

    // Verify callback
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Name' })
    )
  })

  it('validates lead time >= process time', async () => {
    const user = userEvent.setup()

    render(<StepEditor stepId="step-1" onSave={vi.fn()} onCancel={vi.fn()} />)

    // Set invalid values
    const processTimeInput = screen.getByTestId('process-time-input')
    const leadTimeInput = screen.getByTestId('lead-time-input')

    await user.clear(processTimeInput)
    await user.type(processTimeInput, '100')

    await user.clear(leadTimeInput)
    await user.type(leadTimeInput, '50')

    // Submit
    const saveButton = screen.getByTestId('save-button')
    await user.click(saveButton)

    // Verify error message
    expect(screen.getByText(/Lead time must be >= process time/i)).toBeInTheDocument()

    // Verify store was NOT updated
    const step = useVsmStore.getState().getStepById('step-1')
    expect(step.processTime).toBe(60) // Original value
  })
})
```

### Mocking Zustand Stores

```javascript
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MetricsDashboard from '../../../src/components/metrics/MetricsDashboard'

// Mock the store
vi.mock('../../../src/stores/vsmStore', () => ({
  useVsmStore: vi.fn((selector) => selector({
    steps: [
      { id: '1', processTime: 60, leadTime: 240 },
      { id: '2', processTime: 30, leadTime: 120 }
    ],
    getTotalLeadTime: () => 360,
    getTotalProcessTime: () => 90,
    getFlowEfficiency: () => 25
  }))
}))

describe('MetricsDashboard', () => {
  it('displays flow efficiency', () => {
    render(<MetricsDashboard />)

    expect(screen.getByText(/25%/)).toBeInTheDocument()
  })

  it('displays total lead time', () => {
    render(<MetricsDashboard />)

    expect(screen.getByText(/360 minutes/)).toBeInTheDocument()
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
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useVsmStore } from '../../src/stores/vsmStore'
import App from '../../src/App'

Given('I have an empty VSM', function () {
  useVsmStore.setState({
    steps: [],
    connections: []
  })

  render(<App />)
})

When('I add a step with the following details:', async function (dataTable) {
  const data = dataTable.rowsHash()
  const user = userEvent.setup()

  // Click "Add Step" button
  const addButton = screen.getByTestId('add-step-button')
  await user.click(addButton)

  // Fill form
  const nameInput = screen.getByTestId('step-name-input')
  await user.type(nameInput, data.name)

  const typeSelect = screen.getByTestId('step-type-select')
  await user.selectOptions(typeSelect, data.type)

  const processTimeInput = screen.getByTestId('process-time-input')
  await user.type(processTimeInput, data.processTime)

  const leadTimeInput = screen.getByTestId('lead-time-input')
  await user.type(leadTimeInput, data.leadTime)

  // Submit
  const saveButton = screen.getByTestId('save-step-button')
  await user.click(saveButton)
})

Then('the VSM should contain {int} step(s)', function (expectedCount) {
  const steps = useVsmStore.getState().steps
  expect(steps.length).to.equal(expectedCount)
})

Then('the step should be visible in the canvas', function () {
  const stepNode = screen.getByTestId('step-node-0')
  expect(stepNode).to.exist
})

When('I try to add a step with process time {int} and lead time {int}',
  async function (processTime, leadTime) {
    const user = userEvent.setup()

    // Click "Add Step"
    const addButton = screen.getByTestId('add-step-button')
    await user.click(addButton)

    // Fill with invalid values
    const processTimeInput = screen.getByTestId('process-time-input')
    await user.type(processTimeInput, processTime.toString())

    const leadTimeInput = screen.getByTestId('lead-time-input')
    await user.type(leadTimeInput, leadTime.toString())

    // Try to submit
    const saveButton = screen.getByTestId('save-step-button')
    await user.click(saveButton)
  }
)

Then('I should see an error {string}', function (errorMessage) {
  const error = screen.getByText(new RegExp(errorMessage, 'i'))
  expect(error).to.exist
})

Then('the step should not be added', function () {
  const steps = useVsmStore.getState().steps
  expect(steps.length).to.equal(0)
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
- [React Component Examples](react-components.md) - Component patterns to test
