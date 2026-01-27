# Zustand Store Examples

**State management patterns for VSM Workshop.**

---

## Why Zustand?

- Simple API with minimal boilerplate
- No provider wrapper needed
- Built-in devtools support
- Easy to create multiple stores
- TypeScript-friendly (if we add it later)
- Small bundle size

---

## Store Structure

The application uses multiple Zustand stores for separation of concerns:

| Store | Purpose | Persisted? |
|-------|---------|------------|
| `vsmStore.js` | VSM data and UI state | Yes (localStorage) |
| `simulationStore.js` | Simulation runtime state | No (ephemeral) |

---

## Basic Store Pattern

### Simple Store

```javascript
import { create } from 'zustand'

export const useCounterStore = create((set, get) => ({
  // State
  count: 0,

  // Actions
  increment: () => set((state) => ({ count: state.count + 1 })),

  decrement: () => set((state) => ({ count: state.count - 1 })),

  reset: () => set({ count: 0 }),

  // Selectors
  getCount: () => get().count
}))
```

**Usage in component:**

```javascript
function Counter() {
  const count = useCounterStore((state) => state.count)
  const increment = useCounterStore((state) => state.increment)

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  )
}
```

---

## VSM Store (Persisted)

### Complete vsmStore.js

```javascript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useVsmStore = create(
  persist(
    (set, get) => ({
      // ===== STATE =====
      steps: [],
      connections: [],
      selectedStepId: null,
      vsmMetadata: {
        name: '',
        description: '',
        createdAt: null,
        updatedAt: null
      },

      // ===== STEP ACTIONS =====
      addStep: (step) => set((state) => ({
        steps: [...state.steps, step],
        vsmMetadata: {
          ...state.vsmMetadata,
          updatedAt: Date.now()
        }
      })),

      updateStep: (id, updates) => set((state) => ({
        steps: state.steps.map(s =>
          s.id === id ? { ...s, ...updates } : s
        ),
        vsmMetadata: {
          ...state.vsmMetadata,
          updatedAt: Date.now()
        }
      })),

      deleteStep: (id) => set((state) => ({
        steps: state.steps.filter(s => s.id !== id),
        connections: state.connections.filter(c =>
          c.source !== id && c.target !== id
        ),
        selectedStepId: state.selectedStepId === id ? null : state.selectedStepId,
        vsmMetadata: {
          ...state.vsmMetadata,
          updatedAt: Date.now()
        }
      })),

      // ===== CONNECTION ACTIONS =====
      addConnection: (connection) => set((state) => ({
        connections: [...state.connections, connection],
        vsmMetadata: {
          ...state.vsmMetadata,
          updatedAt: Date.now()
        }
      })),

      updateConnection: (id, updates) => set((state) => ({
        connections: state.connections.map(c =>
          c.id === id ? { ...c, ...updates } : c
        ),
        vsmMetadata: {
          ...state.vsmMetadata,
          updatedAt: Date.now()
        }
      })),

      deleteConnection: (id) => set((state) => ({
        connections: state.connections.filter(c => c.id !== id),
        vsmMetadata: {
          ...state.vsmMetadata,
          updatedAt: Date.now()
        }
      })),

      // ===== UI STATE ACTIONS =====
      setSelectedStep: (stepId) => set({ selectedStepId: stepId }),

      clearSelection: () => set({ selectedStepId: null }),

      // ===== VSM ACTIONS =====
      setVsmMetadata: (metadata) => set((state) => ({
        vsmMetadata: { ...state.vsmMetadata, ...metadata }
      })),

      clearVsm: () => set({
        steps: [],
        connections: [],
        selectedStepId: null,
        vsmMetadata: {
          name: '',
          description: '',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      }),

      loadVsm: (vsm) => set({
        steps: vsm.steps || [],
        connections: vsm.connections || [],
        vsmMetadata: vsm.metadata || {},
        selectedStepId: null
      }),

      // ===== SELECTORS =====
      getStepById: (id) => get().steps.find(s => s.id === id),

      getConnectionsByStep: (stepId) => {
        const state = get()
        return {
          incoming: state.connections.filter(c => c.target === stepId),
          outgoing: state.connections.filter(c => c.source === stepId)
        }
      },

      getTotalLeadTime: () => get().steps.reduce(
        (sum, step) => sum + step.leadTime, 0
      ),

      getTotalProcessTime: () => get().steps.reduce(
        (sum, step) => sum + step.processTime, 0
      ),

      getFlowEfficiency: () => {
        const state = get()
        const processTime = state.getTotalProcessTime()
        const leadTime = state.getTotalLeadTime()
        return leadTime > 0 ? (processTime / leadTime) * 100 : 0
      }
    }),
    {
      name: 'vsm-storage', // localStorage key
      partialize: (state) => ({
        // Only persist data, not UI state
        steps: state.steps,
        connections: state.connections,
        vsmMetadata: state.vsmMetadata
        // Exclude: selectedStepId (ephemeral UI state)
      })
    }
  )
)
```

---

## Simulation Store (Ephemeral)

### Complete simulationStore.js

```javascript
import { create } from 'zustand'

export const useSimulationStore = create((set, get) => ({
  // ===== STATE =====
  isRunning: false,
  isPaused: false,
  currentTick: 0,
  maxTicks: 1000,
  workItems: [],
  stepStates: [],
  results: null,
  history: [],

  // ===== ACTIONS =====
  startSimulation: (config) => set({
    isRunning: true,
    isPaused: false,
    currentTick: 0,
    workItems: config.workItems,
    stepStates: config.initialStepStates,
    results: null,
    history: [],
    maxTicks: config.maxTicks || 1000
  }),

  pauseSimulation: () => set((state) => ({
    isPaused: !state.isPaused
  })),

  stopSimulation: () => set({
    isRunning: false,
    isPaused: false
  }),

  resetSimulation: () => set({
    isRunning: false,
    isPaused: false,
    currentTick: 0,
    workItems: [],
    stepStates: [],
    results: null,
    history: []
  }),

  tick: () => set((state) => {
    if (state.isPaused || !state.isRunning) return state

    const newTick = state.currentTick + 1

    // Check if simulation should complete
    if (newTick >= state.maxTicks) {
      return {
        ...state,
        currentTick: newTick,
        isRunning: false
      }
    }

    return {
      ...state,
      currentTick: newTick
    }
  }),

  updateWorkItems: (items) => set({ workItems: items }),

  updateStepStates: (states) => set((state) => ({
    stepStates: states,
    history: [...state.history, { tick: state.currentTick, states }]
  })),

  setResults: (results) => set({
    results,
    isRunning: false
  }),

  // ===== SELECTORS =====
  getProgress: () => {
    const state = get()
    return state.maxTicks > 0
      ? (state.currentTick / state.maxTicks) * 100
      : 0
  },

  getActiveWorkItems: () => {
    const state = get()
    return state.workItems.filter(item => item.isActive)
  },

  getCompletedWorkItems: () => {
    const state = get()
    return state.workItems.filter(item => item.isComplete)
  },

  getStepState: (stepId) => {
    const state = get()
    return state.stepStates.find(s => s.stepId === stepId)
  }
}))
```

---

## Accessing Stores in Components

### Subscribing to State

```javascript
// Hook-based access (component rerenders on state change)
function MetricsDashboard() {
  // Subscribe to specific state slices
  const steps = useVsmStore((state) => state.steps)
  const totalLeadTime = useVsmStore((state) => state.getTotalLeadTime())
  const flowEfficiency = useVsmStore((state) => state.getFlowEfficiency())

  return (
    <div>
      <p>Steps: {steps.length}</p>
      <p>Total Lead Time: {totalLeadTime} minutes</p>
      <p>Flow Efficiency: {flowEfficiency.toFixed(1)}%</p>
    </div>
  )
}
```

### Action Dispatch (No Subscription)

```javascript
// Access actions without subscribing to state
function StepEditor() {
  const addStep = useVsmStore((state) => state.addStep)
  const updateStep = useVsmStore((state) => state.updateStep)

  const handleSave = (stepData) => {
    if (stepData.id) {
      updateStep(stepData.id, stepData)
    } else {
      addStep(stepData)
    }
  }

  return <button onClick={() => handleSave({ name: 'New Step' })}>Save</button>
}
```

### Selecting Multiple Values

```javascript
// Use selector function to get multiple values
function StepDetails({ stepId }) {
  const { step, connections } = useVsmStore((state) => ({
    step: state.getStepById(stepId),
    connections: state.getConnectionsByStep(stepId)
  }))

  if (!step) return <div>Step not found</div>

  return (
    <div>
      <h2>{step.name}</h2>
      <p>Incoming: {connections.incoming.length}</p>
      <p>Outgoing: {connections.outgoing.length}</p>
    </div>
  )
}
```

---

## Direct Access Outside React

### Using getState()

For accessing store state outside React components (utility functions, event handlers):

```javascript
import { useVsmStore } from './stores/vsmStore'

// Export function (not a component)
export function exportToJSON() {
  const { steps, connections, vsmMetadata } = useVsmStore.getState()

  return JSON.stringify({
    steps,
    connections,
    metadata: vsmMetadata
  }, null, 2)
}

// Analytics tracking
export function trackMetrics() {
  const flowEfficiency = useVsmStore.getState().getFlowEfficiency()
  const stepCount = useVsmStore.getState().steps.length

  analytics.track('metrics_viewed', {
    flowEfficiency,
    stepCount
  })
}
```

### Using setState()

Directly update store from outside React:

```javascript
import { useVsmStore } from './stores/vsmStore'

// Import handler
export function importFromJSON(jsonString) {
  const data = JSON.parse(jsonString)

  useVsmStore.setState({
    steps: data.steps,
    connections: data.connections,
    vsmMetadata: data.metadata
  })
}
```

---

## Store Best Practices

### 1. Persist Only Data, Not UI State

```javascript
persist(
  (set, get) => ({
    // ... store definition
  }),
  {
    name: 'vsm-storage',
    partialize: (state) => ({
      steps: state.steps,
      connections: state.connections
      // ❌ Don't persist: selectedStepId, isPanelOpen, etc.
    })
  }
)
```

### 2. Use Selectors for Computed Values

```javascript
// ✅ GOOD - Define computed values as selectors
getTotalLeadTime: () => get().steps.reduce(
  (sum, step) => sum + step.leadTime, 0
)

// ❌ BAD - Computing in component every render
function Component() {
  const steps = useVsmStore((state) => state.steps)
  const total = steps.reduce((sum, s) => sum + s.leadTime, 0)
}
```

### 3. Actions Should Be Pure

```javascript
// ✅ GOOD - Pure state update
deleteStep: (id) => set((state) => ({
  steps: state.steps.filter(s => s.id !== id)
}))

// ❌ BAD - Side effects in action
deleteStep: (id) => {
  fetch('/api/steps/' + id, { method: 'DELETE' }) // ❌ Side effect
  set((state) => ({
    steps: state.steps.filter(s => s.id !== id)
  }))
}
```

### 4. Subscribe to Minimal State

```javascript
// ✅ GOOD - Subscribe only to what you need
const stepCount = useVsmStore((state) => state.steps.length)

// ❌ BAD - Subscribe to entire store
const store = useVsmStore()
const stepCount = store.steps.length
```

### 5. Use getState() for One-Time Reads

```javascript
// ✅ GOOD - One-time read without subscription
function handleExport() {
  const { steps } = useVsmStore.getState()
  exportToPDF(steps)
}

// ❌ BAD - Unnecessary subscription
function ExportButton() {
  const steps = useVsmStore((state) => state.steps)

  const handleExport = () => {
    exportToPDF(steps)
  }

  return <button onClick={handleExport}>Export</button>
}
```

---

## Testing Stores

### Mocking Zustand Store in Tests

```javascript
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock the store
vi.mock('../stores/vsmStore', () => ({
  useVsmStore: vi.fn((selector) => selector({
    steps: [
      { id: '1', name: 'Step 1', processTime: 60, leadTime: 240 },
      { id: '2', name: 'Step 2', processTime: 30, leadTime: 120 }
    ],
    addStep: vi.fn(),
    updateStep: vi.fn(),
    getTotalLeadTime: () => 360
  }))
}))

describe('MetricsDashboard', () => {
  it('displays total lead time', () => {
    render(<MetricsDashboard />)
    expect(screen.getByText('360 minutes')).toBeInTheDocument()
  })
})
```

### Testing Store Actions

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { useVsmStore } from '../stores/vsmStore'

describe('vsmStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useVsmStore.setState({
      steps: [],
      connections: [],
      selectedStepId: null
    })
  })

  it('adds step correctly', () => {
    const { addStep, steps } = useVsmStore.getState()

    addStep({ id: '1', name: 'Test Step', processTime: 60 })

    const updatedSteps = useVsmStore.getState().steps
    expect(updatedSteps).toHaveLength(1)
    expect(updatedSteps[0].name).toBe('Test Step')
  })

  it('deletes step and related connections', () => {
    const { addStep, addConnection, deleteStep } = useVsmStore.getState()

    addStep({ id: '1', name: 'Step 1' })
    addStep({ id: '2', name: 'Step 2' })
    addConnection({ id: 'c1', source: '1', target: '2' })

    deleteStep('1')

    const { steps, connections } = useVsmStore.getState()
    expect(steps).toHaveLength(1)
    expect(connections).toHaveLength(0)
  })
})
```

---

## Advanced Patterns

### Combining Stores

```javascript
function CombinedData() {
  // Access multiple stores
  const steps = useVsmStore((state) => state.steps)
  const workItems = useSimulationStore((state) => state.workItems)

  // Derive combined data
  const stepsWithWorkItems = steps.map(step => ({
    ...step,
    workItemCount: workItems.filter(item =>
      item.currentStep === step.id
    ).length
  }))

  return <div>{/* Render combined data */}</div>
}
```

### Middleware Pattern

```javascript
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export const useVsmStore = create(
  devtools(
    persist(
      (set, get) => ({
        // ... store definition
      }),
      { name: 'vsm-storage' }
    ),
    { name: 'VSM Store' }
  )
)
```

---

## Related Documentation

- [Architecture Guide](../guides/architecture.md) - State management architecture
- [React Component Examples](react-components.md) - Using stores in components
- [Factory Function Examples](factory-functions.md) - Creating store data
- [Testing Patterns](testing-patterns.md) - Testing with mocked stores

---

**Remember:** Zustand stores are the single source of truth for application state. Use them instead of prop drilling.
