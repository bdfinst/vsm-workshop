# Testing Standards

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
pnpm test:acceptance

# Run specific feature
pnpm test:acceptance -- features/builder/add-step.feature

# Watch mode
pnpm test:acceptance --watch
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

Integration tests verify component interactions and store behavior.

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

describe('StepEditor integration', () => {
  it('updates store when user saves step', async () => {
    const user = userEvent.setup();
    const mockUpdate = vi.fn();

    render(<StepEditor step={mockStep} onUpdate={mockUpdate} />);

    const input = screen.getByTestId('step-name-input');
    await user.clear(input);
    await user.type(input, 'New Name');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Name' })
    );
  });
});
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
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test --watch

# Run acceptance tests
pnpm test:acceptance

# Run all tests
pnpm test:all
```

## Coverage Goals

Focus on meaningful coverage:

- Calculations: 90%+
- Simulation logic: 90%+
- Utility functions: 80%+

Acceptance tests cover user-facing behavior and don't need coverage metrics.
