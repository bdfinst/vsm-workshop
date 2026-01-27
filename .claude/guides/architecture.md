# Architecture Guide

**Deep dive into system design, data flow, and architectural patterns.**

---

## System Architecture

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

---

## React + Zustand Architecture

### Zustand Store (`vsmStore.js`)

- **Single source of truth** for VSM data
- Contains steps, connections, and simulation state
- Actions for CRUD operations on steps and connections
- Computed selectors for derived metrics
- **No prop drilling required** - components access store directly

See [../examples/zustand-stores.md](../examples/zustand-stores.md) for complete store patterns and examples.

### Component Hierarchy

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

---

## ReactFlow Canvas Integration

### Data Flow: Zustand → ReactFlow

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

### Custom Node Types

| Node Type | Purpose | Display |
|-----------|---------|---------|
| `StepNode` | Process steps | Step name, timing metrics, %C&A |
| `QueueNode` | Work queues | Queue size, wait times |
| `GateNode` | Quality gates | Pass/fail rates |

### Interactions

- **Drag nodes** to reposition in canvas
- **Click node** to edit step details
- **Click edge** to modify connection properties
- **Drag from node handle** to create new connection

---

## Simulation Engine Flow

### Simulation Architecture

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

### Simulation Flow (Tick-Based)

#### 1. Initialization

- Create work items with unique IDs
- Place items in first step's queue
- Initialize step states (current work, queues)

#### 2. Each Tick (Time Slice)

Process each step in order:

1. **Complete current work** - Decrement remaining time
2. **Move completed items** - Transfer to next step's queue
3. **Pull new items from queue** - Respect batch size limits
4. **Apply %C&A probability** - Quality checks
5. **Route failed items** - Send to rework loops
6. **Update metrics** - Cycle time, throughput, WIP
7. **Store state snapshot** - For visualization

#### 3. Completion

- Calculate final metrics
- Identify bottlenecks (steps with largest queues)
- Generate improvement recommendations

### Key Simulation Files

| File | Purpose |
|------|---------|
| `src/utils/simulation/simulationEngine.js` | Core tick logic |
| `src/hooks/useSimulation.js` | React hook wrapper |
| `src/stores/vsmStore.js` | Simulation state storage |

---

## Data Flow Patterns

### User Action → Store → UI Update

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

This unidirectional flow ensures:
- Predictable state updates
- Easy debugging (single source of truth)
- Automatic UI synchronization

### Store → Computed Values → Display

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

**Benefits:**
- No need to manually sync derived state
- Computed values always consistent with source data
- Components subscribe only to needed state slices

### Simulation Updates

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

**Pattern:**
- Tick-based time simulation
- State snapshots for replay/visualization
- Interval-based updates for real-time display

---

## Custom Hooks

Application provides specialized hooks for common operations:

### useSimulation

Manages simulation lifecycle:

```javascript
const {
  isRunning,
  progress,
  results,
  start,
  pause,
  reset
} = useSimulation()
```

**Use for:** Starting, controlling, and monitoring simulations

### useVsmMetrics

Computes all metrics from current VSM:

```javascript
const metrics = useVsmMetrics()
// { flowEfficiency, leadTime, throughput, ... }
```

**Use for:** Displaying metrics in dashboard components

### useStepValidation

Validates step data:

```javascript
const { errors, isValid } = useStepValidation(stepData)
```

**Use for:** Form validation before saving steps

---

## Architecture Decisions

### Why React Flow?

**Reasons:**
- Purpose-built for node-based editors
- Handles pan, zoom, and connections natively
- Extensible custom node types
- Good performance with many nodes
- Strong community and documentation

**Alternatives considered:**
- D3.js (too low-level for our needs)
- Cytoscape.js (primarily for graph algorithms)
- Custom canvas (too much work)

### Why Zustand?

**Reasons:**
- Simple API, minimal boilerplate
- Easy to create multiple stores
- Built-in devtools support
- No provider wrapper needed
- TypeScript-friendly (if we add it later)
- Small bundle size

**Alternatives considered:**
- Redux (too much boilerplate)
- Context API (performance concerns with frequent updates)
- MobX (opinionated, larger learning curve)

### Why Vite?

**Reasons:**
- Fast HMR for development
- Optimized production builds
- Simple configuration
- Native ES modules support
- Plugin ecosystem

**Alternatives considered:**
- Create React App (slower, less flexible)
- Webpack (more complex configuration)
- Parcel (less ecosystem support)

### Why ATDD?

**Reasons:**
- Ensures shared understanding of requirements
- Living documentation that stays updated
- Catches requirement issues early
- Builds confidence in the system
- Forces thinking from user perspective

**Alternatives considered:**
- Pure TDD (misses user acceptance criteria)
- Manual testing (not repeatable, slow)
- No testing (unacceptable for quality)

---

## Performance Considerations

### React Optimization Patterns

See [../rules/javascript-react.md](../rules/javascript-react.md) for details on:

- `React.memo()` for expensive renders
- `useCallback()` for event handlers
- `useMemo()` for derived state
- Controlled forms in editors

### Zustand Optimization

- **Selective subscriptions** - Only subscribe to needed state slices
- **Computed selectors** - Define getters in store for derived values
- **Partialize persistence** - Only persist data, not UI state
- **getState() for one-time reads** - Avoid unnecessary subscriptions

### ReactFlow Optimization

- **Node memoization** - Use `React.memo()` on custom node components
- **Edge batching** - Update multiple edges at once
- **Viewport optimization** - ReactFlow handles off-screen node rendering

---

## State Persistence

### What Gets Persisted

**Persisted (localStorage):**
- Steps array
- Connections array
- VSM metadata (name, description)

**Not Persisted (ephemeral):**
- UI state (selected step, panel visibility)
- Simulation runtime state
- Undo/redo history

### Persistence Implementation

```javascript
// vsmStore.js
export const useVsmStore = create(
  persist(
    (set, get) => ({
      // store definition
    }),
    {
      name: 'vsm-storage', // localStorage key
      partialize: (state) => ({
        steps: state.steps,
        connections: state.connections
        // Exclude ephemeral UI state
      })
    }
  )
)
```

---

## Error Handling Strategy

### Error Boundaries

Wrap major sections in error boundaries:
- Canvas view (React Flow errors)
- Simulation panel (runtime errors)
- Metrics dashboard (calculation errors)

### Validation Layers

1. **Input validation** - Form level (zod schemas)
2. **Business logic validation** - Domain rules (see [vsm-domain.md](../rules/vsm-domain.md))
3. **Store validation** - Before persisting state

### Logging

Critical failures log to Application Insights (when configured).

---

## Testing Strategy

See [../rules/testing.md](../rules/testing.md) for complete testing guidelines.

### Architecture Testing

| Layer | Test Type | What to Test |
|-------|-----------|--------------|
| **Stores** | Unit | Actions, selectors, state updates |
| **Hooks** | Integration | Hook behavior with mocked stores |
| **Components** | Integration | Component + store interactions |
| **Simulation** | Unit + Integration | Tick logic, state progression |
| **End-to-end** | E2E (Playwright) | Complete user flows |

---

## Related Documentation

- [Project Structure](project-structure.md) - Directory layout
- [Workflows](workflows.md) - Common development workflows
- [Zustand Store Examples](../examples/zustand-stores.md) - State management patterns
- [React Component Examples](../examples/react-components.md) - Component patterns
- [VSM Domain Rules](../rules/vsm-domain.md) - Business logic and validation

---

**Next Steps:**
- Review [workflows.md](workflows.md) for common development procedures
- Study [examples/](../examples/) for implementation patterns
- Practice with [skills/](../skills/) workflows
