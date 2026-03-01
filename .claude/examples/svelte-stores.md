# Svelte 5 Store Examples

**State management with Svelte 5 runes in *.svelte.js files.**

---

## Why Svelte 5 Runes?

- Native reactivity with `$state()` and `$derived()`
- No external library needed (replaces Zustand)
- Fine-grained reactivity (only affected components update)
- Simple factory function pattern aligns with project conventions
- Small bundle size (built into Svelte)

---

## Store Structure

The application uses multiple rune stores for separation of concerns:

| Store | Purpose | Persisted? |
|-------|---------|------------|
| `vsmDataStore.svelte.js` | Steps, connections, metadata | Yes (localStorage) |
| `vsmUIStore.svelte.js` | Selection state, editing mode | No (ephemeral) |
| `vsmIOStore.svelte.js` | Import/export, template loading | No |
| `simulationControlStore.svelte.js` | Running/paused state | No (ephemeral) |
| `simulationDataStore.svelte.js` | Work items, queue history, results | No (ephemeral) |
| `scenarioStore.svelte.js` | What-if scenario comparison | No (ephemeral) |

---

## Basic Store Pattern

### Simple Store

```javascript
// src/stores/counterStore.svelte.js

function createCounterStore() {
  let count = $state(0)

  return {
    get count() { return count },
    increment() { count++ },
    decrement() { count-- },
    reset() { count = 0 },
  }
}

export const counterStore = createCounterStore()
```

**Usage in component:**

```svelte
<script>
  import { counterStore } from '../stores/counterStore.svelte.js'
</script>

<div>
  <p>Count: {counterStore.count}</p>
  <button onclick={counterStore.increment}>Increment</button>
</div>
```

---

## VSM Data Store (Persisted)

### Core Pattern

```javascript
// src/stores/vsmDataStore.svelte.js
import { getPersistedValue, persistState } from '../utils/persistedState.svelte.js'

const STORAGE_KEY = 'vsm-data-storage'

const initialState = {
  steps: [],
  connections: [],
  name: '',
  description: '',
}

function createVsmDataStore() {
  const persisted = getPersistedValue(STORAGE_KEY, initialState)
  let steps = $state(persisted.steps)
  let connections = $state(persisted.connections)
  let name = $state(persisted.name)

  // Auto-persist on changes
  $effect(() => {
    persistState(STORAGE_KEY, { steps, connections, name })
  })

  return {
    // Getters (reactive)
    get steps() { return steps },
    get connections() { return connections },
    get name() { return name },

    // Step actions
    addStep(step) {
      steps = [...steps, step]
    },

    updateStep(id, updates) {
      steps = steps.map((s) => (s.id === id ? { ...s, ...updates } : s))
    },

    deleteStep(id) {
      steps = steps.filter((s) => s.id !== id)
      connections = connections.filter(
        (c) => c.source !== id && c.target !== id,
      )
    },

    // Connection actions
    addConnection(connection) {
      connections = [...connections, connection]
    },

    deleteConnection(id) {
      connections = connections.filter((c) => c.id !== id)
    },

    // VSM actions
    setName(newName) { name = newName },

    clearAll() {
      steps = []
      connections = []
      name = ''
    },
  }
}

export const vsmDataStore = createVsmDataStore()
```

---

## Simulation Control Store (Ephemeral)

```javascript
// src/stores/simulationControlStore.svelte.js

function createSimulationControlStore() {
  let isRunning = $state(false)
  let isPaused = $state(false)
  let speed = $state(1)

  return {
    get isRunning() { return isRunning },
    get isPaused() { return isPaused },
    get speed() { return speed },

    start() {
      isRunning = true
      isPaused = false
    },

    pause() { isPaused = true },

    resume() { isPaused = false },

    stop() {
      isRunning = false
      isPaused = false
    },

    setSpeed(newSpeed) { speed = newSpeed },
  }
}

export const simControlStore = createSimulationControlStore()
```

---

## Accessing Stores in Components

### Direct Import (No Subscription Needed)

```svelte
<script>
  import { vsmDataStore } from '../stores/vsmDataStore.svelte.js'
  import { simControlStore } from '../stores/simulationControlStore.svelte.js'

  // Reactive - re-renders automatically when store changes
  let stepCount = $derived(vsmDataStore.steps.length)
</script>

<div>
  <p>Steps: {stepCount}</p>
  <p>Running: {simControlStore.isRunning}</p>
</div>
```

### Derived Computations

```svelte
<script>
  import { vsmDataStore } from '../stores/vsmDataStore.svelte.js'

  let totalLeadTime = $derived(
    vsmDataStore.steps.reduce((sum, step) => sum + step.leadTime, 0),
  )

  let flowEfficiency = $derived(() => {
    const processTime = vsmDataStore.steps.reduce((sum, s) => sum + s.processTime, 0)
    const leadTime = vsmDataStore.steps.reduce((sum, s) => sum + s.leadTime, 0)
    return leadTime > 0 ? (processTime / leadTime) * 100 : 0
  })
</script>

<div>
  <p>Total Lead Time: {totalLeadTime} minutes</p>
  <p>Flow Efficiency: {flowEfficiency.toFixed(1)}%</p>
</div>
```

---

## Store Best Practices

### 1. Persist Only Data, Not UI State

```javascript
// vsmDataStore.svelte.js - Persisted
let steps = $state(persisted.steps)     // ✅ Persist

// vsmUIStore.svelte.js - Ephemeral
let selectedStepId = $state(null)       // ❌ Don't persist
```

### 2. Use Getters for Reactive Access

```javascript
// ✅ GOOD - Getter allows reactive tracking
return {
  get steps() { return steps },
}

// ❌ BAD - Direct property won't be reactive
return {
  steps,  // Not reactive when reassigned
}
```

### 3. Actions Should Be Immutable

```javascript
// ✅ GOOD - Immutable update
addStep(step) {
  steps = [...steps, step]
}

// ❌ BAD - Direct mutation
addStep(step) {
  steps.push(step)  // Won't trigger reactivity
}
```

### 4. Use $derived for Computed Values

```svelte
<script>
  // ✅ GOOD - Computed once, cached
  let total = $derived(store.steps.reduce((sum, s) => sum + s.leadTime, 0))

  // ❌ BAD - Recomputed every render in template
  // {store.steps.reduce((sum, s) => sum + s.leadTime, 0)}
</script>
```

### 5. Keep Stores Focused

```javascript
// ✅ GOOD - Single responsibility
// vsmDataStore.svelte.js → VSM data only
// vsmUIStore.svelte.js → UI state only
// simulationControlStore.svelte.js → Simulation controls only

// ❌ BAD - God store with everything
// store.svelte.js → steps, connections, UI, simulation, etc.
```

---

## Testing Stores

### Testing Store Actions

```javascript
import { describe, it, expect } from 'vitest'

describe('vsmDataStore', () => {
  it('adds step correctly', () => {
    const store = createVsmDataStore()
    store.addStep({ id: '1', name: 'Test Step', processTime: 60 })

    expect(store.steps).toHaveLength(1)
    expect(store.steps[0].name).toBe('Test Step')
  })

  it('deletes step and related connections', () => {
    const store = createVsmDataStore()
    store.addStep({ id: '1', name: 'Step 1' })
    store.addStep({ id: '2', name: 'Step 2' })
    store.addConnection({ id: 'c1', source: '1', target: '2' })

    store.deleteStep('1')

    expect(store.steps).toHaveLength(1)
    expect(store.connections).toHaveLength(0)
  })
})
```

---

## Related Documentation

- [Architecture Guide](../guides/architecture.md) - State management architecture
- [Svelte Component Examples](svelte-components.md) - Using stores in components
- [Factory Function Examples](factory-functions.md) - Creating store data
- [Testing Patterns](testing-patterns.md) - Testing with stores

---

**Remember:** Svelte 5 rune stores are the single source of truth for application state. Import stores directly — no providers or context needed.
