# Quick Start - VSM Workshop Development

**5-minute guide to start contributing effectively.**

---

## 🎯 The Golden Rules

### 1. Tests First, Always

```bash
# NEVER write code before writing tests
# Feature file → Review & Approval → Implementation
```

### 2. No Classes, Only Functions

```javascript
// ✅ CORRECT - Factory function
export const createRunner = () => {
  let state = {}
  return { start: () => {} }
}

// ❌ WRONG - Never use classes
export class Runner { }
```

### 3. Quality Gates Before Every Commit

```bash
pnpm test && pnpm build && pnpm lint
```

All three must pass. No exceptions.

---

## 🚦 Workflow for New Features

### Step 1: Write Feature File

```bash
# Create .feature file in features/ directory
features/builder/my-feature.feature
```

```gherkin
Feature: My new feature
  As a user
  I want to do something
  So that I get value

  Scenario: Happy path
    Given initial state
    When I perform action
    Then I see result
```

### Step 2: Get Approval

**STOP!** Present feature file for review. Do NOT code without approval.

### Step 3: Write Tests (Red Phase)

```bash
# Create step definitions
features/step-definitions/my-feature.steps.js

# Run to verify they fail
pnpm test:acceptance
```

### Step 4: Implement (Green Phase)

Write minimal code to make tests pass.

### Step 5: Refactor

Clean up while keeping tests green.

### Step 6: Quality Check

```bash
pnpm test && pnpm build && pnpm lint
```

---

## 📋 Before Every Commit

Use this checklist:

- [ ] `pnpm test` passes (all tests green)
- [ ] `pnpm build` succeeds
- [ ] `pnpm lint` passes
- [ ] No debugging code (console.log, debugger)
- [ ] No commented-out code
- [ ] PropTypes on all components
- [ ] No ES6 classes (use factory functions)

---

## 🧩 Project Structure

```
src/
├── components/     # React components
│   ├── builder/    # VSM builder wizard
│   ├── canvas/     # React Flow diagrams
│   ├── metrics/    # Metrics dashboard
│   └── ui/         # Shared UI components
├── hooks/          # Custom React hooks (useX)
├── stores/         # Zustand stores
├── utils/          # Utility functions
│   ├── calculations/ # Metrics calculations
│   ├── simulation/   # Simulation logic
│   └── validation/   # Validation utilities
└── data/           # Static data (templates, examples)

tests/
├── unit/           # Unit tests (Vitest)
└── e2e/            # E2E tests (Playwright)

features/
├── builder/        # Feature files
├── simulation/
└── step-definitions/ # Cucumber steps
```

---

## 🎨 Code Style Cheat Sheet

### React Components

```javascript
import { useState } from 'react'
import PropTypes from 'prop-types'

function MyComponent({ title, onClick }) {
  const [count, setCount] = useState(0)

  const handleClick = () => {
    setCount(count + 1)
    onClick(count)
  }

  return (
    <button onClick={handleClick} data-testid="my-button">
      {title}: {count}
    </button>
  )
}

MyComponent.propTypes = {
  title: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
}

export default MyComponent
```

### Factory Functions

```javascript
// Create entities with factory functions
export const createStep = ({ name, processTime, leadTime }) => ({
  id: generateId(),
  name,
  processTime,
  leadTime,
  type: 'development',
  percentCompleteAccurate: 100,
})
```

### Zustand Stores

```javascript
import { create } from 'zustand'

export const useMyStore = create((set, get) => ({
  // State
  items: [],

  // Actions
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),

  // Selectors
  getItemById: (id) => get().items.find(i => i.id === id),
}))
```

---

## 🔍 Common Tasks

### Add a New Component

1. Read [skills/new-component.md](skills/new-component.md)
2. Use functional component + PropTypes
3. Add to appropriate directory in `src/components/`
4. Write unit tests in `tests/unit/components/`

### Add a Calculation

1. Read [skills/add-metric.md](skills/add-metric.md)
2. Create pure function in `src/utils/calculations/`
3. Write unit tests FIRST
4. Integrate into metrics dashboard

### Add a VSM Step Type

1. Read [skills/new-process-step.md](skills/new-process-step.md)
2. Update `src/data/stepTypes.js`
3. Update `StepNode` component styling
4. Write acceptance tests

---

## 📚 Essential Reading

Read these before coding:

1. [rules/javascript-react.md](rules/javascript-react.md) - Code style
2. [rules/atdd-workflow.md](rules/atdd-workflow.md) - TDD process
3. [rules/quality-verification.md](rules/quality-verification.md) - Quality gates

---

## 🆘 Troubleshooting

### Tests Failing

```bash
# Read error message carefully
pnpm test

# Run specific test
pnpm test src/utils/calculations/metrics.test.js

# Watch mode for TDD
pnpm test --watch
```

### Build Failing

```bash
# Check for import errors
pnpm build

# Common issues:
# - Typo in import path
# - Missing export
# - Circular dependency
```

### Lint Failing

```bash
# Show errors
pnpm lint

# Auto-fix many errors
pnpm lint --fix
```

---

## ⚡ Commands Cheat Sheet

```bash
# Development
pnpm dev              # Start dev server (http://localhost:5173)

# Testing
pnpm test             # Unit tests
pnpm test:watch       # Unit tests in watch mode
pnpm test:acceptance  # Acceptance tests (Cucumber)
pnpm test:e2e         # E2E tests (Playwright)
pnpm test:all         # All tests

# Quality (before commit)
pnpm test && pnpm build && pnpm lint

# Build
pnpm build            # Build for production
pnpm preview          # Preview production build
```

---

## 🎓 Next Steps

1. **Read the core rules**
   - [javascript-react.md](rules/javascript-react.md)
   - [atdd-workflow.md](rules/atdd-workflow.md)
   - [quality-verification.md](rules/quality-verification.md)

2. **Explore code examples**
   - [examples/factory-functions.md](examples/factory-functions.md)
   - [examples/react-components.md](examples/react-components.md)
   - [examples/zustand-stores.md](examples/zustand-stores.md)

3. **Pick a task and follow a skill guide**
   - [skills/_GUIDE.md](skills/_GUIDE.md) - Find the right skill
   - [skills/new-feature.md](skills/new-feature.md) - Common starting point

---

**Ready to code?** Remember:
1. Tests first
2. No classes
3. Quality gates before commit

**Questions?** See [INDEX.md](INDEX.md) for full documentation navigation.
