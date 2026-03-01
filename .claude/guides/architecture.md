# Architecture Guide

**Deep dive into system design, data flow, and architectural patterns.**

---

## System Architecture

```
App.svelte (Root Component)
├── Header.svelte (Map name, import/export)
├── Sidebar.svelte (Step list, add step)
├── Canvas.svelte (Svelte Flow diagram)
├── EditorPanel.svelte (Step/connection editing)
├── MetricsDashboard.svelte (VSM metrics)
└── SimulationPanel.svelte (Simulation controls/results)
```

All components access Svelte 5 rune stores directly (no prop drilling).

---

## Svelte 5 Runes Store Architecture

### Store Layer (*.svelte.js files)

- **vsmDataStore.svelte.js** - Steps, connections, metadata (persisted to localStorage)
- **vsmUIStore.svelte.js** - Selection state, editing mode (ephemeral)
- **vsmIOStore.svelte.js** - Import/export, template loading
- **simulationControlStore.svelte.js** - Running/paused state
- **simulationDataStore.svelte.js** - Work items, queue history, results
- **scenarioStore.svelte.js** - What-if scenario comparison

Stores use `$state()` for reactive state and expose getters + action methods.

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

## Svelte Flow Canvas Integration

### Data Flow: Store → Svelte Flow

```svelte
<script>
  import { SvelteFlow } from '@xyflow/svelte'
  import { vsmDataStore } from '../stores/vsmDataStore.svelte.js'

  // Derive nodes and edges from store
  let nodes = $derived(vsmDataStore.steps.map(step => ({
    id: step.id,
    type: 'stepNode',
    data: step,
    position: step.position,
  })))

  let edges = $derived(vsmDataStore.connections.map(conn => ({
    id: conn.id,
    source: conn.source,
    target: conn.target,
    type: conn.type === 'rework' ? 'reworkEdge' : 'forwardEdge',
  })))
</script>

<!-- Svelte Flow renders nodes/edges and handles interactions -->
<SvelteFlow
  {nodes}
  {edges}
  on:nodeschange={handleNodesChange}
  on:edgeschange={handleEdgesChange}
  on:connect={handleConnect}
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
┌──────────────────────────┐
│ SimulationService.svelte │
│ (orchestrator)           │
└─────────┬────────────────┘
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
    ┌───────────────────┐
    │ simulationData    │
    │ Store updates     │
    └───────────────────┘
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
  → Calls vsmDataStore.addStep(stepData)
  → Store updates steps array
  → All subscribed components rerender
  → Canvas shows new node
  → Metrics recalculate automatically
```

This unidirectional flow ensures:
- Predictable state updates
- Easy debugging (single source of truth)
- Automatic UI synchronization

### Store → Derived Values → Display

```svelte
<script>
  import { vsmDataStore } from '../stores/vsmDataStore.svelte.js'

  // Metrics are derived from store state
  let totalLeadTime = $derived(
    vsmDataStore.steps.reduce((sum, step) => sum + step.leadTime, 0)
  )

  let flowEfficiency = $derived(() => {
    const processTime = vsmDataStore.steps.reduce((sum, s) => sum + s.processTime, 0)
    const leadTime = vsmDataStore.steps.reduce((sum, s) => sum + s.leadTime, 0)
    return leadTime > 0 ? (processTime / leadTime) * 100 : 0
  })
</script>
```

**Benefits:**
- No need to manually sync derived state
- Computed values always consistent with source data
- Fine-grained reactivity (only affected components update)

### Simulation Updates

```javascript
// SimulationRunner uses requestAnimationFrame for updates
const animate = () => {
  const newState = simulationEngine.tick(currentState)
  callbacks.onTick(newState)

  if (!newState.isRunning) {
    callbacks.onComplete(newState.results)
    return
  }

  animationFrameId = requestAnimationFrame(animate)
}
```

**Pattern:**
- Tick-based time simulation with requestAnimationFrame
- State snapshots for replay/visualization
- SimulationService orchestrates stores and runner

---

## Services

Application provides service modules for complex orchestration:

### SimulationService

Manages simulation lifecycle (src/services/SimulationService.svelte.js):

```javascript
import { simControlStore } from '../stores/simulationControlStore.svelte.js'
import { simDataStore } from '../stores/simulationDataStore.svelte.js'

// Start simulation
simulationService.startSimulation(steps, connections)

// Control via stores
simControlStore.pause()
simControlStore.resume()
simControlStore.stop()
```

**Use for:** Starting, controlling, and monitoring simulations

### Metrics Calculation

Compute metrics from current VSM data (src/utils/calculations/metrics.js):

```javascript
import { calculateAllMetrics } from '../utils/calculations/metrics'

const metrics = calculateAllMetrics(steps, connections)
// { flowEfficiency, totalLeadTime, bottlenecks, ... }
```

**Use for:** Displaying metrics in dashboard components

---

## Architecture Decisions

### Why Svelte Flow (@xyflow/svelte)?

**Reasons:**
- Purpose-built for node-based editors
- Handles pan, zoom, and connections natively
- Extensible custom node types
- Good performance with many nodes
- Native Svelte integration

**Alternatives considered:**
- D3.js (too low-level for our needs)
- Cytoscape.js (primarily for graph algorithms)
- Custom canvas (too much work)

### Why Svelte 5 Rune Stores?

**Reasons:**
- Native to Svelte 5 (no external dependency)
- Fine-grained reactivity with $state/$derived
- Simple factory function pattern
- No provider wrapper needed
- Small bundle size (built-in)

**Alternatives considered:**
- Zustand (React-centric, not needed with Svelte runes)
- Svelte writable stores (legacy API, runes are more ergonomic)
- Redux (too much boilerplate)

### Why Vite?

**Reasons:**
- Fast HMR for development
- Optimized production builds
- Simple configuration
- Native ES modules support
- Plugin ecosystem

**Alternatives considered:**
- Webpack (more complex configuration)
- Parcel (less ecosystem support)
- SvelteKit (overkill for SPA)

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

### Svelte Optimization Patterns

See [../rules/javascript-svelte.md](../rules/javascript-svelte.md) for details on:

- `$derived()` for computed values (automatically memoized)
- Fine-grained reactivity (only affected DOM nodes update)
- `bind:value` for form inputs

### Store Optimization

- **Getters for reactive access** - Use `get prop()` in stores
- **$derived for computed values** - Cached automatically
- **Separate stores** - Only persist data stores, not UI state
- **Immutable updates** - Reassign arrays/objects to trigger reactivity

### Svelte Flow Optimization

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
// src/utils/persistedState.svelte.js
import { getPersistedValue, persistState } from '../utils/persistedState.svelte.js'

const STORAGE_KEY = 'vsm-data-storage'
const persisted = getPersistedValue(STORAGE_KEY, initialState, sanitize)

// In store factory:
let steps = $state(persisted.steps)

// Auto-persist via $effect
$effect(() => {
  persistState(STORAGE_KEY, { steps, connections, name })
})
```

---

## Error Handling Strategy

### Error Handling

Key error handling points:
- Canvas view (Svelte Flow errors)
- Simulation panel (runtime errors)
- Metrics dashboard (calculation errors)
- File import (FileReader onerror)

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
| **Stores** | Unit | Actions, getters, state updates |
| **Services** | Integration | Service behavior with stores |
| **Components** | E2E | Component + store interactions (Playwright) |
| **Simulation** | Unit + Integration | Tick logic, state progression |
| **End-to-end** | E2E (Playwright) | Complete user flows |

---

## Related Documentation

- [Project Structure](project-structure.md) - Directory layout
- [Workflows](workflows.md) - Common development workflows
- [Svelte Store Examples](../examples/svelte-stores.md) - State management patterns
- [Svelte Component Examples](../examples/svelte-components.md) - Component patterns
- [VSM Domain Rules](../rules/vsm-domain.md) - Business logic and validation

---

**Next Steps:**
- Review [workflows.md](workflows.md) for common development procedures
- Study [examples/](../examples/) for implementation patterns
- Practice with [skills/](../skills/) workflows
