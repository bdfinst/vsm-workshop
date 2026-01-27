# Code Improvement Tasks for Claude

**Purpose:** Make the codebase easier for Claude to understand and work with by adding documentation, type hints, and contextual information.

**Status:** Not yet implemented - these are planned improvements

**Estimated effort:** 4-6 hours

---

## Priority 1: JSDoc on Public Functions (HIGH VALUE)

### Goal
Add JSDoc comments to all public functions in utils/, models/, and services/

### Locations

#### utils/calculations/
- [ ] Add JSDoc to all metric calculation functions
- [ ] Include @param with type information
- [ ] Include @returns with type and description
- [ ] Add @example for complex calculations

**Example:**
```javascript
/**
 * Calculate flow efficiency as ratio of process time to lead time
 * @param {Object} vsm - Value stream map
 * @param {Array<Object>} vsm.steps - Process steps with timing data
 * @param {number} vsm.steps[].processTime - Active work time in minutes
 * @param {number} vsm.steps[].leadTime - Total elapsed time in minutes
 * @returns {number} Flow efficiency percentage (0-100)
 * @example
 * const vsm = { steps: [{ processTime: 60, leadTime: 240 }] }
 * calculateFlowEfficiency(vsm) // Returns: 25
 */
export const calculateFlowEfficiency = (vsm) => {
  // implementation
}
```

#### utils/simulation/
- [ ] Document simulationEngine.js exports
- [ ] Add JSDoc to tick() function
- [ ] Document work item processing logic
- [ ] Add examples for common simulation scenarios

#### utils/validation/
- [ ] Document validation functions
- [ ] Specify validation rules in JSDoc
- [ ] Include error return types

#### models/
- [ ] Document all factory functions (createStep, createConnection, etc.)
- [ ] Use @typedef for object shapes
- [ ] Link to domain documentation

**Example:**
```javascript
/**
 * @typedef {Object} Step
 * @property {string} id - Unique identifier
 * @property {string} name - Step name
 * @property {number} processTime - Active work time (minutes)
 * @property {number} leadTime - Total elapsed time (minutes)
 * @property {number} percentCompleteAccurate - Quality metric (0-100)
 * @property {number} queueSize - Items waiting to enter
 * @property {number} batchSize - Items processed together
 */

/**
 * Create a step object for VSM
 * Factory function pattern - see .claude/examples/factory-functions.md
 * @param {Object} config - Step configuration
 * @param {string} config.name - Step name
 * @param {number} config.processTime - Active work time in minutes
 * @param {number} config.leadTime - Total elapsed time in minutes
 * @returns {Step} Step object with generated ID
 */
export const createStep = ({ name, processTime, leadTime }) => {
  // implementation
}
```

#### services/
- [ ] Document all service layer functions
- [ ] Specify business logic rules
- [ ] Add usage examples

#### hooks/
- [ ] Document all custom hooks
- [ ] Specify hook dependencies
- [ ] Add usage examples for components

**Example:**
```javascript
/**
 * Manages simulation lifecycle (start, pause, stop, reset)
 *
 * @returns {Object} Simulation controls
 * @returns {boolean} returns.isRunning - Whether simulation is active
 * @returns {boolean} returns.isPaused - Whether simulation is paused
 * @returns {number} returns.currentTick - Current simulation tick
 * @returns {Function} returns.start - Start simulation with config
 * @returns {Function} returns.pause - Pause/unpause simulation
 * @returns {Function} returns.stop - Stop simulation
 * @returns {Function} returns.reset - Reset simulation state
 *
 * @example
 * function SimulationPanel() {
 *   const { isRunning, start, pause, stop } = useSimulation()
 *
 *   return (
 *     <button onClick={() => start({ workItemCount: 10 })}>
 *       Start
 *     </button>
 *   )
 * }
 */
export function useSimulation() {
  // implementation
}
```

---

## Priority 2: File Headers on Complex Modules (MEDIUM VALUE)

### Goal
Add explanatory headers to complex files to provide context

### Target Files

#### src/utils/simulation/simulationEngine.js
```javascript
/**
 * SimulationEngine - Core tick-based simulation logic
 *
 * This engine processes work items through VSM steps, applying:
 * - Queue limits and waiting times
 * - Batch processing rules
 * - %C&A quality checks
 * - Rework loops for failed quality checks
 * - Resource contention (people limits)
 *
 * Architecture: Tick-based discrete event simulation
 * Each tick represents a time slice (typically 1 minute)
 *
 * See: .claude/guides/architecture.md#simulation-engine-flow
 *
 * @module simulationEngine
 */
```

#### src/components/canvas/VSMCanvas.jsx
```javascript
/**
 * VSMCanvas - React Flow integration for VSM visualization
 *
 * This component wraps React Flow and provides:
 * - Custom node types (StepNode, QueueNode, GateNode)
 * - Custom edge types (ForwardEdge, ReworkEdge)
 * - Zustand store integration for VSM data
 * - Pan/zoom controls
 * - Node positioning and layout
 *
 * See: .claude/guides/architecture.md#reactflow-canvas-integration
 *
 * @component
 */
```

#### src/components/simulation/SimulationVisualizer.jsx
```javascript
/**
 * SimulationVisualizer - Real-time simulation display
 *
 * Visualizes work items flowing through VSM steps during simulation:
 * - Animated work item movement
 * - Queue visualization
 * - Step state (active work, waiting items)
 * - Real-time metrics
 *
 * Updates every tick via useSimulation hook
 *
 * @component
 */
```

#### src/stores/vsmStore.js
```javascript
/**
 * vsmStore - Primary Zustand store for VSM data
 *
 * Manages:
 * - Steps array (persisted)
 * - Connections array (persisted)
 * - VSM metadata (persisted)
 * - UI state like selectedStepId (ephemeral)
 *
 * Persistence: localStorage via persist middleware
 * Key: 'vsm-storage'
 *
 * See: .claude/examples/zustand-stores.md
 *
 * @module vsmStore
 */
```

#### src/stores/simulationStore.js
```javascript
/**
 * simulationStore - Zustand store for simulation runtime state
 *
 * Manages ephemeral simulation state:
 * - isRunning, isPaused flags
 * - currentTick counter
 * - workItems array (current positions)
 * - stepStates array (queues, active work)
 * - results (final metrics)
 * - history (state snapshots)
 *
 * NOT persisted - cleared on page refresh
 *
 * See: .claude/examples/zustand-stores.md
 *
 * @module simulationStore
 */
```

### Checklist
- [ ] Add header to simulationEngine.js
- [ ] Add header to VSMCanvas.jsx
- [ ] Add header to SimulationVisualizer.jsx
- [ ] Add header to vsmStore.js
- [ ] Add header to simulationStore.js
- [ ] Add headers to other complex components in canvas/nodes/
- [ ] Add headers to services/ files

---

## Priority 3: Mini-READMEs in Key Directories (MEDIUM VALUE)

### Goal
Create README.md files in complex directories to explain structure and purpose

### Locations

#### src/utils/simulation/README.md

```markdown
# Simulation Utilities

Tick-based discrete event simulation for VSM work flow.

## Architecture

The simulation engine processes work items through VSM steps in discrete time slices (ticks).

**Core concept:** Each tick represents 1 minute of elapsed time.

## Files

- **simulationEngine.js** - Core tick processing logic
- **workItemFactory.js** - Creates work item objects
- **queueManager.js** - Manages step queues and batch processing
- **metrics.js** - Calculates simulation results

## How It Works

1. **Initialization:** Create work items, place in first step's queue
2. **Tick processing:**
   - Process each step in order
   - Move completed work to next step
   - Apply quality checks (%C&A)
   - Route failures to rework loops
3. **Completion:** Calculate metrics, identify bottlenecks

## Usage

```javascript
import { createSimulationEngine } from './simulationEngine'

const engine = createSimulationEngine(steps, {
  workItemCount: 10,
  maxTicks: 1000
})

engine.start()
while (!engine.isComplete()) {
  engine.tick()
}

const results = engine.getResults()
```

## See Also

- [Architecture Guide](../../.claude/guides/architecture.md#simulation-engine-flow)
- [Simulation Skill](../../.claude/skills/run-simulation.md)
```

#### src/components/canvas/README.md

```markdown
# Canvas Components

React Flow integration for VSM visualization.

## Structure

```
canvas/
├── VSMCanvas.jsx         # Main React Flow container
├── nodes/                # Custom node components
│   ├── StepNode.jsx      # Process step visualization
│   ├── QueueNode.jsx     # Queue visualization
│   └── GateNode.jsx      # Quality gate visualization
└── edges/                # Custom edge components
    ├── ForwardEdge.jsx   # Standard flow connections
    └── ReworkEdge.jsx    # Rework loop connections (dashed)
```

## Custom Nodes

Each node type displays different VSM elements:

- **StepNode:** Step name, timing metrics, %C&A
- **QueueNode:** Queue size, wait times
- **GateNode:** Pass/fail rates

## Data Flow

```
vsmStore (steps, connections)
    ↓
VSMCanvas transforms to nodes/edges
    ↓
React Flow renders and handles interactions
    ↓
User actions update vsmStore
```

## See Also

- [Architecture Guide](../../.claude/guides/architecture.md#reactflow-canvas-integration)
- [UI Patterns](../../.claude/rules/ui-patterns.md#react-flow-styling)
```

#### features/README.md

```markdown
# Feature Files (BDD/ATDD)

Gherkin-style acceptance tests that drive development.

## Organization

```
features/
├── builder/          # VSM builder features
├── visualization/    # Map display features
├── simulation/       # Simulation features
├── data/            # Data management features
└── step-definitions/ # Cucumber step implementations
```

## Workflow

1. **Write feature file** in appropriate subdirectory
2. **Review with stakeholder** - get approval
3. **Create step definitions** in step-definitions/
4. **Run tests** - verify they fail (red)
5. **Implement feature** - make tests pass (green)
6. **Refactor** - clean up while tests stay green

## Feature File Structure

```gherkin
Feature: [Capability name]
  As a [role]
  I want [capability]
  So that [benefit]

  Background:
    Given [common setup]

  Scenario: [Happy path]
    Given [precondition]
    When [action]
    Then [expected result]
```

## Running Tests

```bash
# All features
pnpm test:acceptance

# Specific feature
pnpm test:acceptance -- features/builder/add-step.feature

# With tags
pnpm test:acceptance -- --tags @smoke
```

## See Also

- [ATDD Workflow](../.claude/rules/atdd-workflow.md)
- [Feature Review Checklist](../.claude/checklists/feature-review.md)
- [New Feature Skill](../.claude/skills/new-feature.md)
```

#### src/models/README.md

```markdown
# Domain Models

Factory functions for creating domain objects.

## Why Factory Functions?

This project uses **functional programming** exclusively - NO ES6 classes allowed.

Factory functions provide:
- Encapsulation via closures
- No `this` binding issues
- Easy composition
- Testability

## Files

- **StepFactory.js** - Create VSM step objects
- **ConnectionFactory.js** - Create connection objects
- **WorkItemFactory.js** - Create work items for simulation

## Usage

```javascript
import { createStep } from './models/StepFactory'

const step = createStep({
  name: 'Development',
  processTime: 60,
  leadTime: 240
})
// Returns: { id: 'generated', name: 'Development', ... }
```

## Type Definitions

All models follow VSM domain rules (see `.claude/rules/vsm-domain.md`):

- Times in **minutes**
- Percentages as **0-100** (not 0-1)
- Lead time must be >= Process time

## See Also

- [Factory Function Examples](../../.claude/examples/factory-functions.md)
- [VSM Domain Rules](../../.claude/rules/vsm-domain.md)
```

### Checklist
- [ ] Create src/utils/simulation/README.md
- [ ] Create src/components/canvas/README.md
- [ ] Create features/README.md
- [ ] Create src/models/README.md
- [ ] Create src/hooks/README.md (if needed)
- [ ] Create src/services/README.md (if needed)

---

## Priority 4: Type Hints in Comments (MEDIUM VALUE)

### Goal
Use JSDoc @typedef to document data shapes throughout the codebase

### Common Type Definitions

Create a shared types file or add to relevant modules:

#### src/types.js (or in relevant modules)

```javascript
/**
 * @typedef {Object} Step
 * @property {string} id - Unique identifier
 * @property {string} name - Step name
 * @property {string} type - Step type constant from STEP_TYPES
 * @property {string} description - Optional description
 * @property {number} processTime - Active work time (minutes)
 * @property {number} leadTime - Total elapsed time (minutes)
 * @property {number} percentCompleteAccurate - Quality metric (0-100)
 * @property {number} queueSize - Items waiting to enter
 * @property {number} batchSize - Items processed together
 * @property {number} peopleCount - Resources available
 * @property {string[]} tools - Tools/technologies used
 * @property {{x: number, y: number}} position - Canvas position
 */

/**
 * @typedef {Object} Connection
 * @property {string} id - Unique identifier
 * @property {string} source - Source step ID
 * @property {string} target - Target step ID
 * @property {'forward'|'rework'} type - Connection type
 * @property {number} reworkRate - Percentage routed to rework (0-100)
 */

/**
 * @typedef {Object} VSM
 * @property {string} id - Unique identifier
 * @property {string} name - VSM name
 * @property {string} description - Description
 * @property {Step[]} steps - Process steps
 * @property {Connection[]} connections - Step connections
 * @property {Object} metadata - VSM metadata
 * @property {number} metadata.createdAt - Creation timestamp
 * @property {number} metadata.updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} WorkItem
 * @property {number} id - Unique identifier
 * @property {number} currentStep - Current step index
 * @property {number} remainingTime - Time left in current step
 * @property {boolean} isActive - Whether actively being processed
 * @property {boolean} isComplete - Whether finished all steps
 * @property {Object[]} history - Movement history
 */

/**
 * @typedef {Object} SimulationConfig
 * @property {number} workItemCount - Number of work items to simulate
 * @property {number} maxTicks - Maximum simulation ticks
 * @property {boolean} enableResourceContention - Apply people limits
 * @property {boolean} enableQueueLimits - Apply queue size limits
 */

/**
 * @typedef {Object} SimulationResults
 * @property {number} completedItems - Items that finished
 * @property {number} averageCycleTime - Average time per item
 * @property {number} throughput - Items per day
 * @property {Object[]} bottlenecks - Identified bottlenecks
 * @property {number} totalTicks - Simulation duration
 */
```

### Usage in Functions

```javascript
/**
 * Validate a VSM step
 * @param {Step} step - Step to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export const validateStep = (step) => {
  // implementation
}

/**
 * Run simulation with given configuration
 * @param {VSM} vsm - Value stream map to simulate
 * @param {SimulationConfig} config - Simulation configuration
 * @returns {SimulationResults} Simulation results and metrics
 */
export const runSimulation = (vsm, config) => {
  // implementation
}
```

### Checklist
- [ ] Create shared type definitions
- [ ] Add @typedef to all models
- [ ] Add @param types to all functions
- [ ] Add @returns types to all functions
- [ ] Document complex nested structures
- [ ] Link to VSM domain documentation

---

## Priority 5: Doc Links in Code (LOW VALUE, QUICK WINS)

### Goal
Add comments linking code to relevant documentation

### Patterns

#### Factory Functions
```javascript
// Factory function pattern - see .claude/examples/factory-functions.md
export const createSimulationRunner = () => {
  // implementation
}
```

#### Zustand Stores
```javascript
// Store pattern - see .claude/examples/zustand-stores.md
export const useVsmStore = create(/* ... */)
```

#### Validation Rules
```javascript
// Domain rules - see .claude/rules/vsm-domain.md#validation-rules
if (step.leadTime < step.processTime) {
  errors.push('Lead time must be >= process time')
}
```

#### Component Patterns
```javascript
// Component structure - see .claude/rules/javascript-react.md#component-structure
function StepEditor({ stepId, onSave, onCancel }) {
  // implementation
}
```

#### Test Patterns
```javascript
// Testing pattern - see .claude/examples/testing-patterns.md
describe('calculateFlowEfficiency', () => {
  // tests
})
```

### Target Areas
- [ ] Add links in factory functions (models/)
- [ ] Add links in store definitions (stores/)
- [ ] Add links in validation logic (utils/validation/)
- [ ] Add links in complex components
- [ ] Add links in test files

---

## Implementation Order

### Phase 1: High-Impact, Quick Wins (2 hours)
1. Create mini-READMEs (Priority 3)
2. Add file headers to 5 most complex files (Priority 2)
3. Add doc links throughout codebase (Priority 5)

### Phase 2: Type Safety (2 hours)
4. Create shared type definitions (Priority 4)
5. Add @typedef to all models (Priority 4)
6. Add @param and @returns to key functions (Priority 1)

### Phase 3: Complete Documentation (2 hours)
7. Add JSDoc to all public functions (Priority 1)
8. Add remaining file headers (Priority 2)
9. Complete type hints (Priority 4)

---

## Testing the Improvements

After implementation, verify:

- [ ] All links in comments resolve correctly
- [ ] JSDoc renders properly in IDE tooltips
- [ ] Type hints provide useful information
- [ ] READMEs are discoverable and helpful
- [ ] No broken documentation links

---

## Benefits for Claude

**Before improvements:**
- Must read implementation to understand function purpose
- No quick context on file purpose
- Unclear data structures
- Hard to navigate complex directories

**After improvements:**
- Function purpose clear from JSDoc
- File headers provide immediate context
- Type definitions document data shapes
- READMEs explain directory structure
- Links connect code to documentation

**Estimated impact:** 30-40% faster comprehension of unfamiliar code

---

## Related Documentation

- [.claude/INDEX.md](.claude/INDEX.md) - Main documentation entry point
- [.claude/examples/](examples/) - Code pattern examples
- [.claude/guides/architecture.md](guides/architecture.md) - System architecture

---

**Created:** 2026-01-27
**Status:** Planned (not yet implemented)
**Owner:** To be assigned to Claude in future session
