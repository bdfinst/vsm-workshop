# Custom React Hooks

Reusable hooks for common functionality across components.

## Available Hooks

### State Management
- **useAppState.js** - Application-wide state and UI management
- **useSimulationState.js** - Simulation state access and management
- **useScenarioManager.js** - Scenario comparison management

### Simulation
- **useSimulation.js** - Main simulation lifecycle (start, pause, stop, reset)
- **useSimulationControls.js** - Simulation control logic

### Validation
- **useStepValidation.js** - Step data validation with error messages
- **useConnectionValidation.js** - Connection validation

### File Operations
- **useFileOperations.js** - Import/export VSM files

## Hook Naming Convention

All hooks must be prefixed with `use`:
- ✅ `useSimulation`
- ✅ `useStepValidation`
- ❌ `simulationHook`
- ❌ `stepValidator`

This is required by React's Rules of Hooks.

## Usage Pattern

```javascript
import { useSimulation } from '../hooks/useSimulation'

function SimulationPanel() {
  const {
    isRunning,
    isPaused,
    currentTick,
    start,
    pause,
    stop,
    reset
  } = useSimulation()

  return (
    <div>
      <p>Status: {isRunning ? 'Running' : 'Stopped'}</p>
      <button onClick={start}>Start</button>
      <button onClick={pause}>Pause</button>
    </div>
  )
}
```

## Hook Responsibilities

### 1. Encapsulate Complex Logic

Hooks should extract complex logic from components:

```javascript
// ❌ BAD - Logic in component
function MyComponent() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/data')
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  // Complex logic...
}

// ✅ GOOD - Logic in hook
function MyComponent() {
  const { data, loading, error } = useDataFetcher()
  // Simple rendering...
}
```

### 2. Manage Side Effects

Hooks handle useEffect, subscriptions, timers:

```javascript
export function useSimulation() {
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (!isRunning) return

    const intervalId = setInterval(() => {
      // Tick simulation
    }, 100)

    return () => clearInterval(intervalId)
  }, [isRunning])

  return { isRunning, start, stop }
}
```

### 3. Share Stateful Logic

Hooks allow sharing logic between components:

```javascript
// Both components can use the same hook
function ComponentA() {
  const validation = useStepValidation(stepData)
  return <div>{validation.errors}</div>
}

function ComponentB() {
  const validation = useStepValidation(otherStep)
  return <div>{validation.errors}</div>
}
```

## Rules of Hooks

**Must follow:**

1. **Only call hooks at top level** (not in loops, conditions, nested functions)
2. **Only call hooks from React functions** (components or custom hooks)
3. **Hooks must start with `use`** (enforced by linter)

```javascript
// ❌ BAD
function MyComponent({ shouldUseHook }) {
  if (shouldUseHook) {
    const data = useData() // Don't do this!
  }
}

// ✅ GOOD
function MyComponent({ shouldUseHook }) {
  const data = useData()

  if (!shouldUseHook) {
    return null
  }

  return <div>{data}</div>
}
```

## Testing Hooks

Use `@testing-library/react-hooks` for isolated hook testing:

```javascript
import { renderHook, act } from '@testing-library/react'
import { useSimulation } from './useSimulation'

describe('useSimulation', () => {
  it('starts and stops simulation', () => {
    const { result } = renderHook(() => useSimulation())

    expect(result.current.isRunning).toBe(false)

    act(() => {
      result.current.start()
    })

    expect(result.current.isRunning).toBe(true)
  })
})
```

## Common Patterns

### Combining Multiple Stores

```javascript
export function useVsmData() {
  const steps = useVsmStore((state) => state.steps)
  const connections = useVsmStore((state) => state.connections)
  const selectedId = useVsmUIStore((state) => state.selectedStepId)

  return { steps, connections, selectedId }
}
```

### Computed Values

```javascript
export function useVsmMetrics() {
  const steps = useVsmStore((state) => state.steps)

  const totalLeadTime = useMemo(
    () => steps.reduce((sum, s) => sum + s.leadTime, 0),
    [steps]
  )

  const flowEfficiency = useMemo(() => {
    const processTime = steps.reduce((sum, s) => sum + s.processTime, 0)
    return totalLeadTime > 0 ? (processTime / totalLeadTime) * 100 : 0
  }, [steps, totalLeadTime])

  return { totalLeadTime, flowEfficiency }
}
```

## See Also

- [React Component Examples](../../.claude/examples/react-components.md#custom-hooks)
- [JavaScript/React Rules](../../.claude/rules/javascript-react.md#hooks)
- [Testing Patterns](../../.claude/examples/testing-patterns.md)
