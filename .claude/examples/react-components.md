# React Component Examples

**Functional components with hooks - NO CLASSES.**

---

## Basic Component Structure

### Minimal Component

```javascript
function Greeting({ name }) {
  return <h1>Hello, {name}!</h1>
}

export default Greeting
```

### With PropTypes

```javascript
import PropTypes from 'prop-types'

function Greeting({ name }) {
  return <h1>Hello, {name}!</h1>
}

Greeting.propTypes = {
  name: PropTypes.string.isRequired
}

export default Greeting
```

---

## Complete Component Template

```javascript
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useVsmStore } from '../../stores/vsmStore'

function StepEditor({ stepId, onSave, onCancel }) {
  // ===== HOOKS =====
  // Store access
  const step = useVsmStore((state) => state.getStepById(stepId))
  const updateStep = useVsmStore((state) => state.updateStep)

  // Local state
  const [name, setName] = useState(step?.name || '')
  const [processTime, setProcessTime] = useState(step?.processTime || 0)
  const [leadTime, setLeadTime] = useState(step?.leadTime || 0)
  const [errors, setErrors] = useState({})

  // Effects
  useEffect(() => {
    if (step) {
      setName(step.name)
      setProcessTime(step.processTime)
      setLeadTime(step.leadTime)
    }
  }, [step])

  // ===== EVENT HANDLERS =====
  const handleSubmit = (e) => {
    e.preventDefault()

    // Validation
    const newErrors = {}
    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (leadTime < processTime) {
      newErrors.leadTime = 'Lead time must be >= process time'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Save
    const stepData = {
      ...step,
      name,
      processTime,
      leadTime
    }

    updateStep(stepId, stepData)
    onSave(stepData)
  }

  const handleCancel = () => {
    setName(step?.name || '')
    setProcessTime(step?.processTime || 0)
    setLeadTime(step?.leadTime || 0)
    setErrors({})
    onCancel()
  }

  // ===== RENDER =====
  if (!step) {
    return <div>Step not found</div>
  }

  return (
    <form onSubmit={handleSubmit} data-testid="step-editor">
      <div className="form-group">
        <label htmlFor="step-name">Step Name</label>
        <input
          id="step-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="step-name-input"
          className="form-input"
        />
        {errors.name && (
          <span className="error-message">{errors.name}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="process-time">Process Time (minutes)</label>
        <input
          id="process-time"
          type="number"
          min="0"
          value={processTime}
          onChange={(e) => setProcessTime(parseInt(e.target.value) || 0)}
          data-testid="process-time-input"
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="lead-time">Lead Time (minutes)</label>
        <input
          id="lead-time"
          type="number"
          min="0"
          value={leadTime}
          onChange={(e) => setLeadTime(parseInt(e.target.value) || 0)}
          data-testid="lead-time-input"
          className="form-input"
        />
        {errors.leadTime && (
          <span className="error-message">{errors.leadTime}</span>
        )}
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn-primary"
          data-testid="save-button"
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="btn-secondary"
          data-testid="cancel-button"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ===== PROPTYPES =====
StepEditor.propTypes = {
  stepId: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
}

export default StepEditor
```

---

## PropTypes Patterns

### Common PropTypes

```javascript
import PropTypes from 'prop-types'

MyComponent.propTypes = {
  // Primitives
  title: PropTypes.string.isRequired,
  count: PropTypes.number,
  isActive: PropTypes.bool,

  // Functions
  onClick: PropTypes.func.isRequired,
  onUpdate: PropTypes.func,

  // Arrays
  items: PropTypes.array,
  names: PropTypes.arrayOf(PropTypes.string),

  // Objects
  step: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    processTime: PropTypes.number
  }),

  // One of specific values
  status: PropTypes.oneOf(['pending', 'active', 'completed']),

  // One of several types
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),

  // Children
  children: PropTypes.node,

  // Any type
  data: PropTypes.any
}

MyComponent.defaultProps = {
  count: 0,
  isActive: false,
  items: [],
  status: 'pending'
}
```

---

## Custom Hooks

### useSimulation Hook

```javascript
import { useState, useEffect, useCallback } from 'react'
import { useSimulationStore } from '../stores/simulationStore'
import { useVsmStore } from '../stores/vsmStore'
import { createSimulationEngine } from '../utils/simulation/simulationEngine'

export function useSimulation() {
  const { isRunning, isPaused, currentTick } = useSimulationStore()
  const steps = useVsmStore((state) => state.steps)
  const [engine, setEngine] = useState(null)

  const start = useCallback((config) => {
    const newEngine = createSimulationEngine(steps, config)
    setEngine(newEngine)
    useSimulationStore.getState().startSimulation(config)
  }, [steps])

  const pause = useCallback(() => {
    useSimulationStore.getState().pauseSimulation()
  }, [])

  const stop = useCallback(() => {
    useSimulationStore.getState().stopSimulation()
    setEngine(null)
  }, [])

  const reset = useCallback(() => {
    useSimulationStore.getState().resetSimulation()
    setEngine(null)
  }, [])

  useEffect(() => {
    if (!isRunning || isPaused || !engine) return

    const intervalId = setInterval(() => {
      const newState = engine.tick()
      useSimulationStore.getState().tick()

      if (newState.isComplete) {
        useSimulationStore.getState().setResults(newState.results)
        clearInterval(intervalId)
      }
    }, 100)

    return () => clearInterval(intervalId)
  }, [isRunning, isPaused, engine])

  return {
    isRunning,
    isPaused,
    currentTick,
    start,
    pause,
    stop,
    reset
  }
}
```

---

## Performance Optimization

### React.memo()

```javascript
import { memo } from 'react'
import PropTypes from 'prop-types'

const StepNode = memo(function StepNode({ data, isSelected }) {
  console.log('StepNode rendered')

  return (
    <div className={`step-node ${isSelected ? 'selected' : ''}`}>
      <h3>{data.name}</h3>
      <p>Process Time: {data.processTime}m</p>
      <p>Lead Time: {data.leadTime}m</p>
    </div>
  )
})

StepNode.propTypes = {
  data: PropTypes.shape({
    name: PropTypes.string.isRequired,
    processTime: PropTypes.number.isRequired,
    leadTime: PropTypes.number.isRequired
  }).isRequired,
  isSelected: PropTypes.bool
}

export default StepNode
```

### useCallback()

```javascript
import { useCallback } from 'react'

function StepList({ steps }) {
  const updateStep = useVsmStore((state) => state.updateStep)

  // Memoize callback to prevent child rerenders
  const handleStepUpdate = useCallback((stepId, updates) => {
    updateStep(stepId, updates)
  }, [updateStep])

  return (
    <div>
      {steps.map(step => (
        <StepItem
          key={step.id}
          step={step}
          onUpdate={handleStepUpdate}
        />
      ))}
    </div>
  )
}
```

### useMemo()

```javascript
import { useMemo } from 'react'

function MetricsDashboard() {
  const steps = useVsmStore((state) => state.steps)

  // Memoize expensive calculation
  const flowEfficiency = useMemo(() => {
    const processTime = steps.reduce((sum, s) => sum + s.processTime, 0)
    const leadTime = steps.reduce((sum, s) => sum + s.leadTime, 0)
    return leadTime > 0 ? (processTime / leadTime) * 100 : 0
  }, [steps])

  return (
    <div>
      <h2>Flow Efficiency: {flowEfficiency.toFixed(1)}%</h2>
    </div>
  )
}
```

---

## Related Documentation

- [JavaScript/React Rules](../rules/javascript-react.md) - Complete code standards
- [Zustand Store Examples](zustand-stores.md) - State management
- [Factory Function Examples](factory-functions.md) - No classes pattern
- [UI Patterns](../rules/ui-patterns.md) - Styling guidelines
