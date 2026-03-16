# Testing Standards

## Test-First Development (TDD)

**Tests must always be written before implementation code.**

When implementing any feature or bug fix:
1. Write the failing test(s) first
2. Verify the test fails for the expected reason
3. Write the minimum code to make the test pass
4. Refactor while keeping tests green

This applies to:
- **Acceptance tests** - Write feature files before any implementation
- **Unit tests** - Write test cases before implementing functions
- **Integration tests** - Write tests before wiring components together

## Testing Pyramid

1. **Acceptance Tests** (Cucumber) - User-facing behavior
2. **Integration Tests** - Component interactions
3. **Unit Tests** - Utility functions and calculations

## Acceptance Tests (ATDD)

Acceptance tests are the primary driver of development. See `atdd-workflow.md` for detailed guidelines.

### Structure

```
features/
├── builder/           # VSM builder features
├── visualization/     # Map display features
├── simulation/        # Simulation features
└── step-definitions/  # Cucumber step definitions
```

### Running Acceptance Tests

```bash
# Run all acceptance tests
npm run test:acceptance

# Run specific feature
npm run test:acceptance -- features/builder/add-step.feature

# Watch mode
npm run test:acceptance -- --watch
```

## Unit Tests

Unit tests cover utility functions, calculations, and business logic.

### Organization

```
tests/
├── unit/
│   ├── calculations/
│   │   ├── flowEfficiency.test.js
│   │   └── metrics.test.js
│   └── simulation/
│       └── simulateTick.test.js
└── integration/
    └── vsmStore.test.js
```

### Naming Conventions

- Test files: `{moduleName}.test.js`
- Describe blocks: Module or function name
- It blocks: Start with verb describing behavior

```javascript
import { describe, it, expect } from 'vitest';
import { calculateFlowEfficiency } from '../../src/utils/calculations/flowEfficiency';

describe('calculateFlowEfficiency', () => {
  it('returns ratio of process time to lead time', () => {
    const result = calculateFlowEfficiency({
      steps: [
        { processTime: 60, leadTime: 240 }
      ]
    });

    expect(result.value).toBe(0.25);
  });

  it('handles zero lead time gracefully', () => {
    const result = calculateFlowEfficiency({
      steps: [
        { processTime: 60, leadTime: 0 }
      ]
    });

    expect(result.value).toBe(0);
  });

  it('returns null for empty VSM', () => {
    const result = calculateFlowEfficiency({ steps: [] });

    expect(result.value).toBeNull();
  });
});
```

### Testing Calculations

Test edge cases thoroughly:

```javascript
describe('calculateMetrics', () => {
  it('calculates correctly for standard VSM', () => {
    const vsm = createMockVSM({ stepCount: 5 });
    const metrics = calculateMetrics(vsm);

    expect(metrics.totalLeadTime).toBe(240);
    expect(metrics.flowEfficiency).toBeCloseTo(0.25, 2);
  });

  it('handles empty VSM', () => {
    const vsm = createMockVSM({ stepCount: 0 });
    const metrics = calculateMetrics(vsm);

    expect(metrics.totalLeadTime).toBe(0);
    expect(metrics.flowEfficiency).toBe(0);
  });

  it('handles single step VSM', () => {
    const vsm = createMockVSM({ stepCount: 1 });
    const metrics = calculateMetrics(vsm);

    expect(metrics.totalLeadTime).toBeGreaterThan(0);
  });
});
```

## Integration Tests

Integration tests verify component interactions and store behavior. This project uses Svelte 5 with Playwright for E2E integration testing rather than component-level rendering libraries.

### E2E Integration Pattern (Playwright)

```javascript
import { test, expect } from '@playwright/test'

test.describe('StepEditor integration', () => {
  test('updates store when user saves step', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('new-map-name-input').fill('Test Map')
    await page.getByTestId('create-map-button').click()

    // Add a step
    await page.getByRole('button', { name: 'Add Step' }).click()
    await page.getByTestId('step-name-input').fill('Development')
    await page.getByTestId('process-time-input').fill('60')
    await page.getByTestId('lead-time-input').fill('240')
    await page.getByRole('button', { name: 'Save' }).click()

    // Verify step appears in canvas
    await expect(page.locator('.vsm-node')).toBeVisible()
  })
})
```

### Unit Testing Store Logic

```javascript
import { describe, it, expect } from 'vitest'

describe('vsmDataStore actions', () => {
  it('adds step and updates state', () => {
    const store = createVsmDataStore()
    store.addStep({ id: '1', name: 'Test', processTime: 60 })

    expect(store.steps).toHaveLength(1)
    expect(store.steps[0].name).toBe('Test')
  })
})
```

## Simulation Testing

Simulations require deterministic testing with controlled inputs:

```javascript
describe('workFlowSimulation', () => {
  it('moves work items through steps correctly', () => {
    const vsm = createMockVSM();
    const config = { workItemCount: 10, ticks: 100 };

    const result = runSimulation(vsm, config);

    expect(result.completedItems).toBe(10);
    expect(result.averageCycleTime).toBeGreaterThan(0);
  });

  it('respects queue limits', () => {
    const vsm = createMockVSM({ queueLimit: 3 });
    const config = { workItemCount: 10, ticks: 50 };

    const result = runSimulation(vsm, config);

    // Check no queue exceeded limit during simulation
    result.history.forEach(state => {
      state.stepStates.forEach(stepState => {
        expect(stepState.queue.length).toBeLessThanOrEqual(3);
      });
    });
  });
});
```

## Test Commands

```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm test -- --watch

# Run acceptance tests
npm run test:acceptance

# Run all tests
npm run test:all
```

## Coverage Goals

Focus on meaningful coverage:

- Calculations: 90%+
- Simulation logic: 90%+
- Utility functions: 80%+

Acceptance tests cover user-facing behavior and don't need coverage metrics.
