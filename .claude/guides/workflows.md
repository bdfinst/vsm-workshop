# Common Development Workflows

**Step-by-step procedures for common development tasks.**

---

## Table of Contents

- [Committing Changes](#committing-changes)
- [Running Tests](#running-tests)
- [Building and Previewing](#building-and-previewing)
- [Adding a New Step Type](#adding-a-new-step-type)
- [Adding New Metrics](#adding-new-metrics)
- [Extending Simulation Engine](#extending-simulation-engine)
- [Creating a New Feature](#creating-a-new-feature)

---

## Committing Changes

### 1. Stage files for commit

```bash
git add <file1> <file2>
# Or add all changes
git add .
```

### 2. Run pre-commit checks

**MANDATORY**: Run all three quality gates:

```bash
pnpm lint
pnpm test
pnpm test:acceptance
```

All must pass before committing. See [../checklists/pre-commit.md](../checklists/pre-commit.md) for complete checklist.

### 3. Create commit

```bash
git commit -m "feat: add new feature"
```

**Conventional commit types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style (formatting, no logic change)
- `refactor:` - Code refactoring
- `test:` - Adding/updating tests
- `chore:` - Build process, dependencies, etc.

### 4. Push to remote

```bash
git push origin <branch-name>
```

---

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
pnpm test

# Watch mode (for TDD)
pnpm test --watch

# Run specific test file
pnpm test src/utils/calculations/metrics.test.js

# With coverage
pnpm test:coverage
```

### Acceptance Tests (Cucumber)

```bash
# Run all acceptance tests
pnpm test:acceptance

# Run specific feature file
pnpm test:acceptance -- features/builder/add-step.feature

# Watch mode
pnpm test:acceptance --watch

# Run tests with specific tag
pnpm test:acceptance -- --tags @smoke
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
pnpm test:e2e

# Run in headed mode (see browser)
pnpm test:e2e --headed

# Run specific test
pnpm test:e2e tests/e2e/builder.spec.js
```

### All Tests

```bash
# Run everything (unit + acceptance + e2e)
pnpm test:all
```

---

## Building and Previewing

### Development Server

```bash
# Start dev server (http://localhost:5173)
pnpm dev
```

### Production Build

```bash
# Build for production
pnpm build

# Check build output
ls -lh dist/
```

### Preview Production Build

```bash
# Preview production build locally
pnpm preview
```

**Use preview to:**
- Test production optimizations
- Verify bundle size
- Check for build-time issues

---

## Adding a New Step Type

**Example:** Adding a "Security Review" step type to the VSM builder.

See [../skills/new-process-step.md](../skills/new-process-step.md) for detailed skill workflow.

### 1. Update step types definition

Edit `src/data/stepTypes.js`:

```javascript
export const STEP_TYPES = {
  // ... existing types
  PLANNING: 'planning',
  DEVELOPMENT: 'development',
  CODE_REVIEW: 'code_review',
  TESTING: 'testing',

  // Add new type
  SECURITY_REVIEW: 'security_review',

  // ... rest of types
}
```

### 2. Update StepNode component

Edit `src/components/canvas/nodes/StepNode.jsx`:

```javascript
const stepTypeStyles = {
  // ... existing styles
  development: 'border-blue-400',
  code_review: 'border-purple-400',
  testing: 'border-green-400',

  // Add styling for new type
  security_review: 'border-orange-400',
}
```

### 3. Update step form

Edit `src/components/builder/StepForm.jsx`:

Add new type to dropdown options:

```javascript
<select value={type} onChange={handleTypeChange}>
  <option value="development">Development</option>
  <option value="code_review">Code Review</option>
  <option value="security_review">Security Review</option>
  {/* ... */}
</select>
```

### 4. Write tests

Add unit tests in `tests/unit/components/StepNode.test.js`:

```javascript
it('renders security_review step with correct styling', () => {
  const step = { type: 'security_review', name: 'Security Review' }
  render(<StepNode data={step} />)
  expect(screen.getByTestId('step-node')).toHaveClass('border-orange-400')
})
```

Add acceptance test scenario in `features/builder/add-step.feature`:

```gherkin
Scenario: Add security review step
  When I add a step of type "security_review"
  Then the step should appear in the canvas
  And the step should have orange border styling
```

### 5. Run quality checks

```bash
pnpm test && pnpm build && pnpm lint
```

---

## Adding New Metrics

**Example:** Adding "Average Queue Time" metric to the dashboard.

See [../skills/add-metric.md](../skills/add-metric.md) for detailed skill workflow.

### 1. Write metric calculation function (Test First!)

Create test file `tests/unit/calculations/averageQueueTime.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { calculateAverageQueueTime } from '../../../src/utils/calculations/metrics'

describe('calculateAverageQueueTime', () => {
  it('calculates average queue time correctly', () => {
    const vsm = {
      steps: [
        { queueSize: 5, processTime: 60 },
        { queueSize: 3, processTime: 30 }
      ]
    }
    const result = calculateAverageQueueTime(vsm)
    expect(result).toBe(270) // (5 * 60 + 3 * 30) / 2
  })

  it('handles empty VSM', () => {
    const vsm = { steps: [] }
    const result = calculateAverageQueueTime(vsm)
    expect(result).toBe(0)
  })
})
```

### 2. Implement calculation function

Edit `src/utils/calculations/metrics.js`:

```javascript
/**
 * Calculate average queue time across all steps
 * @param {Object} vsm - Value stream map
 * @returns {number} Average queue time in minutes
 */
export function calculateAverageQueueTime(vsm) {
  if (!vsm.steps || vsm.steps.length === 0) return 0

  const totalQueueTime = vsm.steps.reduce(
    (sum, step) => sum + (step.queueSize * step.processTime),
    0
  )

  return totalQueueTime / vsm.steps.length
}
```

### 3. Add to metrics dashboard

Edit `src/components/metrics/MetricsDashboard.jsx`:

```javascript
import { calculateAverageQueueTime } from '../../utils/calculations/metrics'

function MetricsDashboard() {
  const vsm = useVsmStore((state) => state)
  const avgQueueTime = calculateAverageQueueTime(vsm)

  return (
    <div className="metrics-dashboard">
      {/* Existing metrics */}

      <div className="metric-card" data-testid="avg-queue-time-card">
        <h3>Average Queue Time</h3>
        <p>{avgQueueTime} minutes</p>
      </div>
    </div>
  )
}
```

### 4. Update useVsmMetrics hook

Edit `src/hooks/useVsmMetrics.js`:

```javascript
export function useVsmMetrics() {
  const vsm = useVsmStore((state) => state)

  return {
    flowEfficiency: calculateFlowEfficiency(vsm),
    totalLeadTime: calculateTotalLeadTime(vsm),
    averageQueueTime: calculateAverageQueueTime(vsm), // Add new metric
    // ... other metrics
  }
}
```

### 5. Run quality checks

```bash
pnpm test && pnpm build && pnpm lint
```

---

## Extending Simulation Engine

**Example:** Adding "resource contention" to simulation logic.

See [../skills/run-simulation.md](../skills/run-simulation.md) for related workflows.

### 1. Identify simulation logic location

Key files:
- Core logic: `src/utils/simulation/simulationEngine.js`
- Hook wrapper: `src/hooks/useSimulation.js`
- State management: `src/stores/vsmStore.js`

### 2. Write tests first

Add tests in `tests/unit/simulation/simulationEngine.test.js`:

```javascript
describe('resource contention', () => {
  it('handles multiple items competing for resources', () => {
    const state = createSimulationState({
      step: { peopleCount: 2 },
      workItems: 5
    })

    const result = simulationEngine.tick(state)

    // Only 2 items should be actively processed (people limit)
    expect(result.activeWorkItems).toBe(2)
    expect(result.queuedItems).toBe(3)
  })
})
```

### 3. Modify simulation engine

Edit `src/utils/simulation/simulationEngine.js`:

```javascript
function tick(currentState) {
  // ... existing logic

  // Add resource contention logic
  const updatedState = applyResourceContention(currentState)

  return updatedState
}

function applyResourceContention(state) {
  state.steps.forEach((step, index) => {
    const maxConcurrent = step.peopleCount || 1
    const queuedItems = state.queues[index] || []

    // Limit active work items to available people
    const activeItems = queuedItems.slice(0, maxConcurrent)
    const remainingQueue = queuedItems.slice(maxConcurrent)

    state.activeWork[index] = activeItems
    state.queues[index] = remainingQueue
  })

  return state
}
```

### 4. Update simulation state if needed

Edit `src/stores/vsmStore.js`:

Add tracking for active work items:

```javascript
export const useSimulationStore = create((set) => ({
  // ... existing state
  activeWork: [],

  updateActiveWork: (stepIndex, items) => set((state) => {
    const newActiveWork = [...state.activeWork]
    newActiveWork[stepIndex] = items
    return { activeWork: newActiveWork }
  })
}))
```

### 5. Update UI components

Edit `src/components/simulation/SimulationVisualizer.jsx`:

Display resource contention visually:

```javascript
function SimulationVisualizer() {
  const activeWork = useSimulationStore((state) => state.activeWork)

  return (
    <div>
      {activeWork.map((items, stepIndex) => (
        <div key={stepIndex}>
          <h4>Step {stepIndex + 1}</h4>
          <p>Active: {items.length} items</p>
          <div className="work-item-indicators">
            {items.map(item => (
              <div key={item.id} className="work-item-dot" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

### 6. Run quality checks

```bash
pnpm test && pnpm build && pnpm lint
```

---

## Creating a New Feature

**Complete TDD/ATDD workflow for new features.**

See [../skills/new-feature.md](../skills/new-feature.md) for detailed skill workflow.

### 1. Write feature file

Create `features/<category>/<feature-name>.feature`:

```gherkin
Feature: Export VSM to PDF
  As a team lead
  I want to export my VSM to PDF
  So that I can share it with stakeholders

  Scenario: Export basic VSM to PDF
    Given I have a VSM with 3 steps
    When I click the "Export to PDF" button
    Then a PDF file should be downloaded
    And the PDF should contain all 3 steps
```

### 2. Present for review and approval

**STOP!** Do not proceed to implementation until feature file is reviewed and approved.

### 3. Create step definitions

Add steps to `features/step-definitions/<category>.steps.js`:

```javascript
import { Given, When, Then } from '@cucumber/cucumber'

Given('I have a VSM with {int} steps', function (stepCount) {
  this.vsm = createMockVSM({ stepCount })
})

When('I click the {string} button', function (buttonText) {
  this.button = screen.getByRole('button', { name: buttonText })
  fireEvent.click(this.button)
})

Then('a PDF file should be downloaded', function () {
  // Verify download was triggered
  expect(this.downloadSpy).toHaveBeenCalled()
})
```

### 4. Run tests (Red phase)

```bash
pnpm test:acceptance
# Should fail with "Step definition not implemented" or similar
```

### 5. Implement feature (Green phase)

Write minimal code to pass tests:

```javascript
// src/utils/export/pdfExporter.js
export const exportToPDF = (vsm) => {
  // Minimal implementation
  const doc = createPDFDocument()
  vsm.steps.forEach(step => doc.addStep(step))
  doc.download()
}
```

### 6. Refactor

Clean up code while keeping tests green:
- Extract helper functions
- Improve naming
- Add comments where needed
- Ensure code follows style guidelines

### 7. Document if needed

Update relevant documentation:
- Update `README.md` if user-facing feature
- Update this file if new workflow pattern
- Add to `CHANGELOG.md` (if project uses one)

### 8. Run quality checks

```bash
pnpm test && pnpm build && pnpm lint
```

---

## Related Documentation

- [Pre-Commit Checklist](../checklists/pre-commit.md) - Before every commit
- [ATDD Workflow](../rules/atdd-workflow.md) - Test-first process
- [Quality Verification](../rules/quality-verification.md) - Quality gates
- [Skills Directory](../skills/) - Task-specific workflows

---

**Questions?** See [../INDEX.md](../INDEX.md) for full documentation navigation.
