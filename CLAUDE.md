# VSM Workshop - Claude Development Guide

## Project Overview

**VSM Workshop** is a Value Stream Mapping (VSM) tool specifically designed for visualizing and optimizing software delivery processes. This interactive web application guides software development teams through creating comprehensive value stream maps that visualize their current state, simulate work flow with realistic scenarios, identify bottlenecks, and prioritize improvement opportunities based on data-driven insights.

## Technology Stack

- **Framework**: React 18+ (JavaScript, no TypeScript)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Diagramming**: React Flow for interactive node-based diagrams
- **State Management**: Zustand for global state
- **Charts/Visualization**: Recharts for metrics dashboards
- **Testing**: Vitest (unit tests) + Playwright (E2E tests) + Cucumber.js (BDD/ATDD)
- **Code Formatting**: Prettier (single quotes, no semicolons)
- **Package Manager**: pnpm

## Development Workflow: Test-First (TDD/ATDD)

**Tests must always come before code.**

This project follows strict **Test-Driven Development**:

1. **Write Tests First**: Before implementing any code, write the tests that define the expected behavior
2. **Feature File First**: For new features, create a Gherkin feature file describing the behavior
3. **Review**: Feature files must be reviewed and approved before implementation begins
4. **Red Phase**: Run tests and verify they fail for the expected reason
5. **Green Phase**: Write the minimum code to make tests pass
6. **Refactor**: Clean up while keeping tests green

This applies to all levels:

- **Acceptance tests** (Cucumber) - Write feature files before features
- **Unit tests** (Vitest) - Write test cases before implementing functions
- **Integration tests** - Write tests before wiring components

## Coding Standards (MANDATORY)

### React Conventions
- **Components:** Always use functional components with hooks (never class components)
- **Type Checking:** Use PropTypes for runtime type checking on all components
- **Exports:** Prefer default exports for components, named exports for utilities
- **Hooks:** Prefix all custom hooks with `use` (e.g., `useSimulation`, `useVsmMetrics`)
- **State Management:** Use Zustand stores for global state, React state (`useState`) for local component state

### JavaScript Conventions
- **Error Handling:** Every `try/catch` must log to `ApplicationInsights` if it's a critical failure.
- **Naming:** camelCase for variables/functions, PascalCase for components/classes
- **Async:** Never use `fs.sync` or `callback` patterns; always use `fs.promises` or `async/await`
- **Security:** Sanitize all inputs using `zod` schemas. No `eval()` or `unsafe-inner-html`
- **Modern Syntax:** Use ES6+ features (arrow functions, destructuring, spread operator, template literals)

## Pre-Commit Review Checklist

Before any commit, you (the agent) must verify:

1. `npm run lint` passes without errors.
2. All new functions have an associated unit tests in `tests/`.
3. No secrets (API Keys, Azure Connection Strings) are in the code.
4. All tests pass before committing.

### Workflow Commands

```bash
# Create a new feature file (use /new-feature skill)
# Review feature file with stakeholder
# Run acceptance tests (will fail initially)
pnpm test:acceptance

# Implement until tests pass
pnpm test:acceptance --watch
```

## Project Structure

```
vsm-workshop/
├── src/
│   ├── components/         # React components
│   │   ├── builder/        # VSM builder wizard components
│   │   ├── canvas/         # React Flow canvas and nodes
│   │   │   └── nodes/      # Custom node types
│   │   ├── metrics/        # Metrics dashboard components
│   │   ├── simulation/     # Work flow simulation components
│   │   └── ui/             # Shared UI components
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # Zustand stores
│   ├── utils/              # Utility functions
│   │   ├── calculations/   # Metrics calculations
│   │   ├── simulation/     # Simulation logic
│   │   └── validation/     # Validation utilities
│   ├── infrastructure/     # Infrastructure concerns
│   ├── services/           # Service layer
│   ├── data/               # Static data (templates, examples)
│   └── App.jsx
├── features/               # Gherkin feature files
│   ├── builder/            # VSM builder features
│   ├── data/               # Data management features
│   ├── simulation/         # Simulation features
│   ├── visualization/      # Map display features
│   └── step-definitions/   # Cucumber step definitions
│       └── helpers/        # Step definition helpers
├── public/
├── tests/
│   ├── unit/               # Unit tests
│   │   ├── calculations/   # Calculation tests
│   │   ├── simulation/     # Simulation tests
│   │   └── stores/         # Store tests
│   └── e2e/                # End-to-end tests (Playwright)
└── package.json
```

## Key Domain Concepts

### Value Stream Mapping Terms

- **Lead Time**: Total elapsed time from request to delivery (includes waiting)
- **Process Time**: Actual work time (hands-on-keyboard)
- **Flow Efficiency**: Process Time / Lead Time (expressed as percentage)
- **%C&A (Percent Complete and Accurate)**: Quality metric - percentage of work that passes to the next step without rework
- **Queue**: Work items waiting to enter a process step
- **Batch Size**: Number of items processed together
- **Rework Loop**: When work returns to an earlier step for corrections
- **WIP (Work in Progress)**: Items currently being worked on

### Data Model

A VSM consists of:

1. **Steps** - Individual process stages with timing metrics
2. **Connections** - Flow between steps (forward and rework loops)
3. **Queues** - Work waiting between steps
4. **Gates** - Quality checkpoints and approval stages

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run unit tests (Vitest)
pnpm test

# Run acceptance tests (Cucumber BDD)
pnpm test:acceptance

# Run E2E tests (Playwright)
pnpm test:e2e

# Run all tests (unit + acceptance)
pnpm test:all

# Linting
pnpm lint

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Common Workflows

### Committing Changes

1. **Stage files for commit**
   ```bash
   git add <file1> <file2>
   # Or add all changes
   git add .
   ```

2. **Run pre-commit checks**
   ```bash
   pnpm lint
   pnpm test
   pnpm test:acceptance
   ```

3. **Create commit**
   ```bash
   git commit -m "feat: add new feature"
   # Follow conventional commits format
   # Types: feat, fix, docs, style, refactor, test, chore
   ```

4. **Push to remote**
   ```bash
   git push origin <branch-name>
   ```

### Running Tests

```bash
# Run unit tests
pnpm test

# Run unit tests in watch mode
pnpm test --watch

# Run acceptance tests
pnpm test:acceptance

# Run specific feature file
pnpm test:acceptance -- features/builder/add-step.feature

# Run E2E tests
pnpm test:e2e

# Run all tests
pnpm test:all
```

### Building and Previewing

```bash
# Build for production
pnpm build

# Preview production build locally
pnpm preview

# Check build output
ls -lh dist/
```

### Adding a New Step Type

1. **Update step types definition**
   - Edit `src/data/stepTypes.js`
   - Add new constant to `STEP_TYPES` object
   ```javascript
   export const STEP_TYPES = {
     // ... existing types
     NEW_TYPE: 'new_type',
   }
   ```

2. **Update StepNode component**
   - Edit `src/components/canvas/nodes/StepNode.jsx`
   - Add visual styling for new step type
   ```javascript
   const stepTypeStyles = {
     // ... existing styles
     new_type: 'border-color-400',
   }
   ```

3. **Update step form**
   - Edit `src/components/builder/StepForm.jsx`
   - Add new type to dropdown options

4. **Write tests**
   - Add unit tests in `tests/unit/components/StepNode.test.js`
   - Add acceptance test scenarios in `features/builder/`

### Adding New Metrics

1. **Write metric calculation function**
   - Create or edit `src/utils/calculations/metrics.js`
   ```javascript
   /**
    * Calculate new metric
    * @param {Object} vsm - Value stream map
    * @returns {number} Calculated metric value
    */
   export function calculateNewMetric(vsm) {
     // Implementation
   }
   ```

2. **Write unit tests first**
   - Create `tests/unit/calculations/newMetric.test.js`
   ```javascript
   describe('calculateNewMetric', () => {
     it('calculates metric correctly', () => {
       const vsm = createMockVSM()
       const result = calculateNewMetric(vsm)
       expect(result).toBe(expectedValue)
     })
   })
   ```

3. **Add to metrics dashboard**
   - Edit `src/components/metrics/MetricsDashboard.jsx`
   - Create new metric card component or add to existing
   ```javascript
   const newMetric = calculateNewMetric(vsm)
   ```

4. **Update useVsmMetrics hook**
   - Edit `src/hooks/useVsmMetrics.js`
   - Include new metric in returned object

### Extending Simulation Engine

1. **Identify simulation logic location**
   - Core logic: `src/utils/simulation/simulationEngine.js`
   - Hook wrapper: `src/hooks/useSimulation.js`
   - State management: `src/stores/vsmStore.js`

2. **Write tests first**
   - Add tests in `tests/unit/simulation/simulationEngine.test.js`
   ```javascript
   describe('new simulation behavior', () => {
     it('handles new scenario correctly', () => {
       const state = createSimulationState()
       const result = simulationEngine.tick(state)
       expect(result).toMatchObject(expectedState)
     })
   })
   ```

3. **Modify simulation engine**
   - Edit `src/utils/simulation/simulationEngine.js`
   - Add new logic to `tick()` function or create new helper functions
   ```javascript
   function tick(currentState) {
     // ... existing logic
     // Add new behavior
     const updatedState = applyNewBehavior(currentState)
     return updatedState
   }
   ```

4. **Update simulation state if needed**
   - Edit `src/stores/vsmStore.js`
   - Add new state properties for simulation tracking

5. **Update UI components**
   - Edit `src/components/simulation/SimulationVisualizer.jsx`
   - Display new simulation behavior

### Creating a New Feature

1. **Write feature file**
   - Create `features/<category>/<feature-name>.feature`
   - Write Gherkin scenarios
   - Present for review and approval

2. **Create step definitions**
   - Add steps to `features/step-definitions/<category>.steps.js`
   - Run tests to verify they fail (red phase)

3. **Implement feature**
   - Write minimal code to pass tests (green phase)
   - Refactor while keeping tests green

4. **Document if needed**
   - Update relevant sections in CLAUDE.md
   - Update README.md if user-facing

## Development Guidelines

### Feature Development Process

1. **Tests first, always** - Write tests before writing any implementation code
2. **Never implement without a feature file** - All features start with Gherkin
3. **Unit tests before functions** - Write unit tests before implementing utility functions
4. **Review before coding** - Feature files require approval
5. **Small increments** - One scenario at a time
6. **Tests drive design** - Let tests guide the implementation

### Component Patterns

- **Always use functional components with hooks** (never class components)
- **PropTypes required** on all components for runtime type checking
- **Keep components focused** on single-responsibility
- **Extract business logic** into custom hooks (prefix with `use`)
- **Default exports** for components, named exports for utilities
- **Event handlers** should be prefixed with `handle` (e.g., `handleClick`, `handleSubmit`)
- **Access Zustand stores** directly in components using hooks (no prop drilling for global state)

#### Performance Optimization Patterns

**Use React.memo() for expensive renders**

Wrap components that render frequently or perform expensive calculations:

```javascript
import { memo } from 'react'
import PropTypes from 'prop-types'

const StepNode = memo(function StepNode({ data, isSelected }) {
  // Expensive rendering logic
  return (
    <div className={`step-node ${isSelected ? 'selected' : ''}`}>
      {/* Complex visualization */}
    </div>
  )
})

StepNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  isSelected: PropTypes.bool,
}

export default StepNode
```

**Use useCallback for event handlers**

Memoize event handlers passed to child components to prevent unnecessary rerenders:

```javascript
import { useCallback } from 'react'

function StepEditor({ stepId, onUpdate }) {
  const handleNameChange = useCallback((e) => {
    onUpdate(stepId, { name: e.target.value })
  }, [stepId, onUpdate])

  const handleProcessTimeChange = useCallback((e) => {
    onUpdate(stepId, { processTime: parseInt(e.target.value) })
  }, [stepId, onUpdate])

  return (
    <form>
      <input onChange={handleNameChange} />
      <input type="number" onChange={handleProcessTimeChange} />
    </form>
  )
}
```

**Use useMemo for derived state**

Memoize expensive calculations and derived values:

```javascript
import { useMemo } from 'react'

function MetricsDashboard({ steps }) {
  const totalLeadTime = useMemo(() => {
    return steps.reduce((sum, step) => sum + step.leadTime, 0)
  }, [steps])

  const flowEfficiency = useMemo(() => {
    const processTime = steps.reduce((sum, s) => sum + s.processTime, 0)
    const leadTime = steps.reduce((sum, s) => sum + s.leadTime, 0)
    return leadTime > 0 ? (processTime / leadTime) * 100 : 0
  }, [steps])

  return (
    <div>
      <div>Total Lead Time: {totalLeadTime}m</div>
      <div>Flow Efficiency: {flowEfficiency.toFixed(1)}%</div>
    </div>
  )
}
```

**Controlled forms in editors**

Always use controlled components for form inputs:

```javascript
import { useState } from 'react'
import PropTypes from 'prop-types'

function StepForm({ step, onSave }) {
  const [name, setName] = useState(step?.name || '')
  const [processTime, setProcessTime] = useState(step?.processTime || 0)
  const [leadTime, setLeadTime] = useState(step?.leadTime || 0)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...step,
      name,
      processTime,
      leadTime,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        data-testid="step-name-input"
      />
      <input
        type="number"
        value={processTime}
        onChange={(e) => setProcessTime(parseInt(e.target.value) || 0)}
        data-testid="process-time-input"
      />
      <input
        type="number"
        value={leadTime}
        onChange={(e) => setLeadTime(parseInt(e.target.value) || 0)}
        data-testid="lead-time-input"
      />
      <button type="submit">Save</button>
    </form>
  )
}

StepForm.propTypes = {
  step: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    processTime: PropTypes.number,
    leadTime: PropTypes.number,
  }),
  onSave: PropTypes.func.isRequired,
}

export default StepForm
```

### State Management

- Use Zustand stores for global VSM data
- Use React state for local component state
- Keep derived values as computed selectors

#### Zustand Store Patterns

**Store Structure**

The application uses multiple Zustand stores for separation of concerns:

- `vsmStore.js` - VSM data and UI state (persisted)
- `simulationStore.js` - Simulation runtime state (ephemeral)

**vsmStore - VSM Data & UI State**

```javascript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useVsmStore = create(
  persist(
    (set, get) => ({
      // State
      steps: [],
      connections: [],
      selectedStepId: null,

      // Actions
      addStep: (step) => set((state) => ({
        steps: [...state.steps, step]
      })),

      updateStep: (id, updates) => set((state) => ({
        steps: state.steps.map(s =>
          s.id === id ? { ...s, ...updates } : s
        )
      })),

      deleteStep: (id) => set((state) => ({
        steps: state.steps.filter(s => s.id !== id),
        connections: state.connections.filter(c =>
          c.source !== id && c.target !== id
        )
      })),

      // Selectors
      getStepById: (id) => get().steps.find(s => s.id === id),

      getTotalLeadTime: () => get().steps.reduce(
        (sum, step) => sum + step.leadTime, 0
      )
    }),
    {
      name: 'vsm-storage', // localStorage key
      partialize: (state) => ({
        steps: state.steps,
        connections: state.connections
        // Exclude UI state like selectedStepId from persistence
      })
    }
  )
)
```

**simulationStore - Simulation Runtime**

```javascript
import { create } from 'zustand'

export const useSimulationStore = create((set, get) => ({
  // State
  isRunning: false,
  currentTick: 0,
  workItems: [],
  stepStates: [],
  results: null,

  // Actions
  startSimulation: () => set({ isRunning: true }),
  pauseSimulation: () => set({ isRunning: false }),
  resetSimulation: () => set({
    isRunning: false,
    currentTick: 0,
    workItems: [],
    stepStates: [],
    results: null
  }),

  tick: () => set((state) => ({
    currentTick: state.currentTick + 1
  })),

  updateWorkItems: (items) => set({ workItems: items })
}))
```

**Accessing Stores in Components**

```javascript
// Hook-based access (component rerenders on state change)
function MetricsDashboard() {
  const steps = useVsmStore((state) => state.steps)
  const totalLeadTime = useVsmStore((state) => state.getTotalLeadTime())

  return <div>{totalLeadTime} minutes</div>
}

// Action dispatch (no subscription)
function StepEditor() {
  const addStep = useVsmStore((state) => state.addStep)

  const handleSave = () => {
    addStep({ name: 'New Step', processTime: 60 })
  }

  return <button onClick={handleSave}>Add Step</button>
}

// Direct access via getState() (outside React)
import { useVsmStore } from './stores/vsmStore'

function exportToJSON() {
  const { steps, connections } = useVsmStore.getState()
  return JSON.stringify({ steps, connections })
}
```

**Store Best Practices**

1. **Persist only data, not UI state** - Use `partialize` to exclude ephemeral state
2. **Use selectors for computed values** - Define getters in the store for derived data
3. **Actions should be pure** - No side effects in state updates
4. **Subscribe to minimal state** - Only select the state slices you need
5. **Use getState() for one-time reads** - Avoid unnecessary subscriptions

### Testing Pyramid

1. **Acceptance Tests** (Cucumber): User-facing behavior
2. **Integration Tests**: Component interactions
3. **Unit Tests**: Utility functions and calculations

### Testing Strategy

This project employs a multi-layered testing approach to ensure quality at every level:

#### Unit Tests (Vitest)

**What to test:**
- Utility functions in `src/utils/` (calculations, validation, simulation logic)
- Store actions and selectors
- Custom hooks (in isolation)
- Pure functions and business logic

**Testing approach:**
```javascript
// Example: Testing metric calculations
import { describe, it, expect } from 'vitest'
import { calculateFlowEfficiency } from './metrics'

describe('calculateFlowEfficiency', () => {
  it('returns correct ratio for valid VSM', () => {
    const vsm = { steps: [{ processTime: 60, leadTime: 240 }] }
    expect(calculateFlowEfficiency(vsm)).toBe(0.25)
  })
})
```

**Mock Zustand stores in tests:**
```javascript
import { vi } from 'vitest'

// Mock the store
vi.mock('../stores/vsmStore', () => ({
  useVsmStore: vi.fn((selector) => selector({
    steps: mockSteps,
    addStep: vi.fn(),
    updateStep: vi.fn()
  }))
}))
```

#### E2E Tests (Playwright)

**What to test:**
- Complete user flows (end-to-end journeys)
- Cross-browser compatibility
- Visual regression (optional)
- Performance benchmarks

**Testing approach:**
```javascript
// Example: Testing complete VSM creation flow
import { test, expect } from '@playwright/test'

test('user can create and visualize a complete VSM', async ({ page }) => {
  await page.goto('/')
  await page.click('[data-testid="create-vsm-button"]')
  await page.fill('[data-testid="vsm-name-input"]', 'Feature Delivery')

  // Add steps
  await page.click('[data-testid="add-step-button"]')
  await page.fill('[data-testid="step-name-input"]', 'Development')
  await page.click('[data-testid="save-step-button"]')

  // Verify visualization
  await expect(page.locator('[data-testid="canvas-view"]')).toBeVisible()
  await expect(page.locator('.react-flow__node')).toHaveCount(1)
})
```

#### BDD/Acceptance Tests (Cucumber)

**What to test:**
- Business scenarios and requirements
- Feature acceptance criteria
- User stories translated to executable specifications

**Testing approach:**
```gherkin
Feature: Calculate flow efficiency
  Scenario: Display flow efficiency for a value stream
    Given a value stream with the following steps:
      | name        | processTime | leadTime |
      | Development | 60          | 240      |
      | Testing     | 30          | 120      |
    When I view the metrics dashboard
    Then the flow efficiency should show "25%"
```

**Step definitions with mocked stores:**
```javascript
import { Given, When, Then } from '@cucumber/cucumber'
import { render, screen } from '@testing-library/react'
import { useVsmStore } from '../../src/stores/vsmStore'

Given('a value stream with the following steps:', function (dataTable) {
  // Initialize store with test data
  const steps = dataTable.hashes().map(row => ({
    name: row.name,
    processTime: parseInt(row.processTime),
    leadTime: parseInt(row.leadTime)
  }))

  useVsmStore.setState({ steps })
})
```

#### Testing Best Practices

1. **Mocking Zustand Stores**
   - Use `zustand/middleware/immer` for easier test setup
   - Reset store state between tests
   - Mock only what's necessary for the test

2. **Test Data Builders**
   - Create helper functions for common test fixtures
   - Keep test data in `tests/fixtures/` directory
   ```javascript
   // tests/fixtures/vsmBuilder.js
   export function createMockVSM({ stepCount = 3, ...overrides } = {}) {
     return {
       steps: Array.from({ length: stepCount }, (_, i) => ({
         id: `step-${i}`,
         name: `Step ${i + 1}`,
         processTime: 60,
         leadTime: 240
       })),
       connections: [],
       ...overrides
     }
   }
   ```

3. **Test Organization**
   - Mirror source structure in test directories
   - Name test files with `.test.js` suffix
   - Group related tests in `describe` blocks

4. **Continuous Testing**
   - Run unit tests in watch mode during development
   - Run full test suite before commits (pre-commit hook)
   - Run E2E tests in CI/CD pipeline

## Current Phase: MVP (Phase 1)

Focus areas for MVP:

- Basic VSM builder with manual step entry
- Simple visualization of process flow using React Flow
- Basic metrics calculation (lead time, process time, flow efficiency)
- Single-user experience
- Export to image/PDF

## Architecture and Data Flow

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         App.jsx                              │
│                    (Root Component)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
  ┌─────────┐  ┌─────────┐  ┌──────────┐
  │ Builder │  │ Canvas  │  │ Metrics  │
  │ Wizard  │  │ View    │  │Dashboard │
  └────┬────┘  └────┬────┘  └────┬─────┘
       │            │            │
       └────────────┼────────────┘
                    │
                    ▼
           ┌────────────────┐
           │  Zustand Store │
           │   (vsmStore)   │
           └────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
   ┌────────┐  ┌────────┐  ┌──────────┐
   │ Steps  │  │Connect │  │Simulation│
   │        │  │ions    │  │ State    │
   └────────┘  └────────┘  └──────────┘
```

### React + Zustand Architecture

**Zustand Store (`vsmStore.js`)**
- Single source of truth for VSM data
- Contains steps, connections, and simulation state
- Actions for CRUD operations on steps and connections
- Computed selectors for derived metrics
- No prop drilling required - components access store directly

**Component Hierarchy**

```
App
├── BuilderWizard (src/components/builder/)
│   ├── StepForm - Add/edit individual steps
│   ├── ConnectionForm - Define flow between steps
│   └── ValidationSummary - Show data quality issues
│
├── CanvasView (src/components/canvas/)
│   ├── VSMCanvas - React Flow container
│   ├── nodes/
│   │   ├── StepNode - Custom node for process steps
│   │   ├── QueueNode - Visual queue representation
│   │   └── GateNode - Quality gates
│   └── edges/
│       ├── ForwardEdge - Standard process flow
│       └── ReworkEdge - Rework loops (dashed)
│
├── MetricsDashboard (src/components/metrics/)
│   ├── FlowEfficiencyCard - Key metric display
│   ├── LeadTimeBreakdown - Timeline visualization
│   ├── BottleneckIndicator - Identify constraints
│   └── QualityMetrics - %C&A and first pass yield
│
└── SimulationPanel (src/components/simulation/)
    ├── SimulationControls - Start/pause/reset
    ├── SimulationVisualizer - Animated work item flow
    └── SimulationResults - Statistics and insights
```

### ReactFlow Canvas Integration

**Data Flow: Zustand → ReactFlow**

```javascript
// vsmStore provides nodes and edges
const nodes = useVsmStore((state) => state.steps.map(step => ({
  id: step.id,
  type: 'stepNode',
  data: step,
  position: step.position
})))

const edges = useVsmStore((state) => state.connections.map(conn => ({
  id: conn.id,
  source: conn.source,
  target: conn.target,
  type: conn.type === 'rework' ? 'reworkEdge' : 'forwardEdge'
})))

// ReactFlow renders nodes/edges and handles interactions
<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={handleNodesChange}
  onEdgesChange={handleEdgesChange}
  onConnect={handleConnect}
/>
```

**Custom Node Types**
- `StepNode`: Displays step name, timing metrics, and %C&A
- `QueueNode`: Shows queue size and wait times
- `GateNode`: Quality checkpoints with pass/fail rates

**Interactions**
- Drag nodes to reposition
- Click node to edit details
- Click edge to modify connection
- Drag from node handle to create connection

### Simulation Engine Flow

**Simulation Architecture**

```
User triggers simulation
        │
        ▼
┌────────────────────┐
│ useSimulation hook │
│ (orchestrator)     │
└─────────┬──────────┘
          │
          ▼
┌──────────────────────┐
│ simulationEngine.js  │
│ (core logic)         │
└─────────┬────────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌────────┐  ┌─────────┐
│ Work   │  │ State   │
│ Items  │  │ Updates │
└────────┘  └─────────┘
    │           │
    └─────┬─────┘
          │
          ▼
    ┌──────────┐
    │ vsmStore │
    │ updates  │
    └──────────┘
          │
          ▼
    UI rerenders
```

**Simulation Flow (Tick-Based)**

1. **Initialization**
   - Create work items with unique IDs
   - Place items in first step's queue
   - Initialize step states (current work, queues)

2. **Each Tick (Time Slice)**
   - Process each step in order:
     - Complete current work (decrement remaining time)
     - Move completed items to next step's queue
     - Pull new items from queue (respecting batch size)
     - Apply %C&A probability for quality checks
     - Route failed quality checks to rework loops
   - Update metrics (cycle time, throughput, WIP)
   - Store state snapshot for visualization

3. **Completion**
   - Calculate final metrics
   - Identify bottlenecks (steps with largest queues)
   - Generate improvement recommendations

**Key Simulation Files**

- `src/utils/simulation/simulationEngine.js` - Core tick logic
- `src/hooks/useSimulation.js` - React hook wrapper
- `src/stores/vsmStore.js` - Simulation state storage

### Data Flow Patterns

**User Action → Store → UI Update**

```javascript
// Example: Adding a new step
User clicks "Add Step"
  → StepForm component captures input
  → Calls vsmStore.addStep(stepData)
  → Store updates steps array
  → All subscribed components rerender
  → Canvas shows new node
  → Metrics recalculate automatically
```

**Store → Computed Values → Display**

```javascript
// Metrics are derived from store state
const totalLeadTime = useVsmStore((state) =>
  state.steps.reduce((sum, step) => sum + step.leadTime, 0)
)

const flowEfficiency = useVsmStore((state) => {
  const processTime = state.steps.reduce((sum, s) => sum + s.processTime, 0)
  const leadTime = state.steps.reduce((sum, s) => sum + s.leadTime, 0)
  return leadTime > 0 ? (processTime / leadTime) * 100 : 0
})
```

**Simulation Updates**

```javascript
// Animation loop updates store at regular intervals
const runSimulation = () => {
  const intervalId = setInterval(() => {
    const newState = simulationEngine.tick(currentState)
    vsmStore.updateSimulationState(newState)

    if (newState.completed) {
      clearInterval(intervalId)
      vsmStore.setSimulationResults(newState.metrics)
    }
  }, 100) // 10 ticks per second
}
```

### Custom Hooks

**useSimulation** - Manages simulation lifecycle
```javascript
const { isRunning, progress, results, start, pause, reset } = useSimulation()
```

**useVsmMetrics** - Computes all metrics from current VSM
```javascript
const metrics = useVsmMetrics() // { flowEfficiency, leadTime, throughput, ... }
```

**useStepValidation** - Validates step data
```javascript
const { errors, isValid } = useStepValidation(stepData)
```

## Architecture Decisions

### Why React Flow?

- Purpose-built for node-based editors
- Handles pan, zoom, and connections natively
- Extensible custom node types
- Good performance with many nodes

### Why Zustand?

- Simple API, minimal boilerplate
- Easy to create multiple stores
- Built-in devtools support

### Why Vite?

- Fast HMR for development
- Optimized production builds
- Simple configuration

### Why ATDD?

- Ensures shared understanding of requirements
- Living documentation
- Catches requirement issues early
- Builds confidence in the system
