# Factory Function Examples

**NO CLASSES ALLOWED! Use factory functions for object creation.**

---

## Why Factory Functions?

This project uses **functional programming style exclusively**. Factory functions:

- ✅ Encapsulate state using closures
- ✅ Avoid `this` binding issues
- ✅ Enable composition over inheritance
- ✅ Support private variables/methods naturally
- ✅ Are easier to test and reason about

---

## Basic Factory Function

### Simple Object Factory

```javascript
/**
 * Create a step object for VSM
 * @param {Object} config - Step configuration
 * @returns {Object} Step object
 */
export const createStep = ({ name, processTime, leadTime }) => ({
  id: generateId(),
  name,
  processTime,
  leadTime,
  type: 'development',
  percentCompleteAccurate: 100,
  queueSize: 0,
  batchSize: 1,
})

// Usage
const step = createStep({
  name: 'Development',
  processTime: 60,
  leadTime: 240
})
```

### With Default Values

```javascript
export const createConnection = ({
  source,
  target,
  type = 'forward',
  reworkRate = 0
}) => ({
  id: generateId(),
  source,
  target,
  type,
  reworkRate: type === 'rework' ? reworkRate : 0
})

// Usage
const connection = createConnection({
  source: 'step-1',
  target: 'step-2'
  // type defaults to 'forward'
  // reworkRate defaults to 0
})
```

---

## Factory with Methods

### Encapsulating Behavior

```javascript
/**
 * Create a work item for simulation
 * @param {number} id - Unique identifier
 * @returns {Object} Work item with methods
 */
export const createWorkItem = (id) => {
  let currentStep = 0
  let remainingTime = 0
  let history = []

  const moveToStep = (stepIndex, processTime) => {
    currentStep = stepIndex
    remainingTime = processTime
    history.push({ step: stepIndex, timestamp: Date.now() })
  }

  const tick = () => {
    if (remainingTime > 0) {
      remainingTime -= 1
    }
    return remainingTime === 0
  }

  const getCurrentStep = () => currentStep

  const getHistory = () => [...history]

  const getRemainingTime = () => remainingTime

  return {
    id,
    moveToStep,
    tick,
    getCurrentStep,
    getHistory,
    getRemainingTime
  }
}

// Usage
const workItem = createWorkItem(1)
workItem.moveToStep(0, 60)
const isComplete = workItem.tick() // false
console.log(workItem.getRemainingTime()) // 59
```

**Benefits:**
- Private state (`currentStep`, `remainingTime`, `history`)
- Exposed methods control access
- No need for `this` keyword

---

## Factory with Private Methods

### Hiding Implementation Details

```javascript
/**
 * Create a simulation runner
 * @returns {Object} Simulation runner with public methods
 */
export const createSimulationRunner = () => {
  let state = {
    isRunning: false,
    currentTick: 0,
    workItems: []
  }

  // Private helper function
  const processWorkItems = () => {
    state.workItems.forEach(item => {
      const isComplete = item.tick()
      if (isComplete) {
        moveToNextStep(item)
      }
    })
  }

  // Private helper function
  const moveToNextStep = (item) => {
    const nextStep = item.getCurrentStep() + 1
    if (nextStep < state.steps.length) {
      item.moveToStep(nextStep, state.steps[nextStep].processTime)
    }
  }

  // Public methods
  const start = (workItems, steps) => {
    state = {
      isRunning: true,
      currentTick: 0,
      workItems,
      steps
    }
  }

  const tick = () => {
    if (!state.isRunning) return

    state.currentTick += 1
    processWorkItems()
  }

  const pause = () => {
    state.isRunning = false
  }

  const getState = () => ({
    isRunning: state.isRunning,
    currentTick: state.currentTick,
    itemCount: state.workItems.length
  })

  // Return public API
  return {
    start,
    tick,
    pause,
    getState
  }
}

// Usage
const runner = createSimulationRunner()
runner.start(workItems, steps)
runner.tick()
console.log(runner.getState()) // { isRunning: true, currentTick: 1, itemCount: 10 }
runner.pause()
```

**Key Points:**
- `processWorkItems` and `moveToNextStep` are private (not returned)
- Only public methods are exposed in returned object
- State is encapsulated using closure

---

## Factory with Configuration

### Parameterized Factories

```javascript
/**
 * Create a validator with custom rules
 * @param {Object} rules - Validation rules
 * @returns {Object} Validator
 */
export const createValidator = (rules) => {
  const errors = []

  const validate = (data) => {
    errors.length = 0 // Clear previous errors

    Object.keys(rules).forEach(field => {
      const rule = rules[field]
      const value = data[field]

      if (rule.required && !value) {
        errors.push({
          field,
          message: `${field} is required`
        })
      }

      if (rule.min && value < rule.min) {
        errors.push({
          field,
          message: `${field} must be at least ${rule.min}`
        })
      }

      if (rule.max && value > rule.max) {
        errors.push({
          field,
          message: `${field} must be at most ${rule.max}`
        })
      }
    })

    return errors.length === 0
  }

  const getErrors = () => [...errors]

  return {
    validate,
    getErrors
  }
}

// Usage
const stepValidator = createValidator({
  processTime: { required: true, min: 1 },
  leadTime: { required: true, min: 1 },
  percentCompleteAccurate: { min: 0, max: 100 }
})

const isValid = stepValidator.validate({
  processTime: 60,
  leadTime: 240,
  percentCompleteAccurate: 95
})

if (!isValid) {
  console.error(stepValidator.getErrors())
}
```

---

## Composition Pattern

### Composing Factories

```javascript
// Base factory
export const createEntity = () => ({
  id: generateId(),
  createdAt: Date.now()
})

// Composed factory
export const createStep = (config) => {
  const entity = createEntity()

  return {
    ...entity,
    name: config.name,
    processTime: config.processTime,
    leadTime: config.leadTime,
    type: config.type || 'development'
  }
}

// Usage
const step = createStep({
  name: 'Development',
  processTime: 60,
  leadTime: 240
})
// step has: id, createdAt, name, processTime, leadTime, type
```

### Mixin Pattern

```javascript
// Reusable behaviors
const withTimestamps = (obj) => ({
  ...obj,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  touch: function() {
    this.updatedAt = Date.now()
  }
})

const withValidation = (obj, rules) => ({
  ...obj,
  validate: function() {
    // Validation logic using rules
    return true
  }
})

// Composed factory
export const createStep = (config) => {
  const base = {
    id: generateId(),
    name: config.name,
    processTime: config.processTime,
    leadTime: config.leadTime
  }

  const rules = {
    processTime: { min: 1 },
    leadTime: { min: 1 }
  }

  return withValidation(
    withTimestamps(base),
    rules
  )
}

// Usage
const step = createStep({
  name: 'Development',
  processTime: 60,
  leadTime: 240
})

step.touch() // Updates updatedAt
const isValid = step.validate() // true
```

---

## Anti-Patterns to Avoid

### ❌ NEVER Use Classes

```javascript
// ❌ BAD - Do not do this
export class SimulationRunner {
  constructor() {
    this.state = {}
  }

  start() {
    this.state.isRunning = true
  }
}
```

### ❌ NEVER Use `new` Keyword

```javascript
// ❌ BAD
const runner = new SimulationRunner()
```

### ✅ ALWAYS Use Factory Functions

```javascript
// ✅ GOOD
export const createSimulationRunner = () => {
  let state = {}

  const start = () => {
    state.isRunning = true
  }

  return { start }
}

const runner = createSimulationRunner()
runner.start()
```

---

## Testing Factory Functions

Factory functions are easy to test:

```javascript
import { describe, it, expect } from 'vitest'
import { createWorkItem } from '../../../src/models/WorkItemFactory'

describe('createWorkItem', () => {
  it('creates work item with correct initial state', () => {
    const item = createWorkItem(1)

    expect(item.id).toBe(1)
    expect(item.getCurrentStep()).toBe(0)
    expect(item.getRemainingTime()).toBe(0)
  })

  it('moves to next step correctly', () => {
    const item = createWorkItem(1)
    item.moveToStep(0, 60)

    expect(item.getCurrentStep()).toBe(0)
    expect(item.getRemainingTime()).toBe(60)
  })

  it('decrements remaining time on tick', () => {
    const item = createWorkItem(1)
    item.moveToStep(0, 60)

    const isComplete = item.tick()

    expect(isComplete).toBe(false)
    expect(item.getRemainingTime()).toBe(59)
  })
})
```

---

## Real-World Examples from Codebase

### StepFactory (src/models/StepFactory.js)

```javascript
export const createStep = ({
  id = null,
  name = '',
  type = 'development',
  processTime = 0,
  leadTime = 0,
  percentCompleteAccurate = 100,
  queueSize = 0,
  batchSize = 1,
  peopleCount = 1,
  tools = [],
  description = '',
  position = { x: 0, y: 0 }
}) => ({
  id: id || `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name,
  type,
  processTime,
  leadTime,
  percentCompleteAccurate,
  queueSize,
  batchSize,
  peopleCount,
  tools,
  description,
  position
})
```

### ConnectionFactory (src/models/ConnectionFactory.js)

```javascript
export const createConnection = ({
  id = null,
  source,
  target,
  type = 'forward',
  reworkRate = 0
}) => ({
  id: id || `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  source,
  target,
  type,
  reworkRate: type === 'rework' ? reworkRate : 0
})
```

---

## Related Documentation

- [JavaScript/React Rules](../rules/javascript-react.md) - Code style guidelines
- [React Component Examples](react-components.md) - Component patterns
- [Zustand Store Examples](zustand-stores.md) - State management with factories
- [Testing Patterns](testing-patterns.md) - Testing factory functions

---

**Remember:** Factory functions are the ONLY way to create objects with behavior in this codebase. Never use ES6 classes.
