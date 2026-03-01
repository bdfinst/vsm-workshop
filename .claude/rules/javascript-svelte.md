# JavaScript & Svelte Coding Standards

> **Note:** This project uses Svelte 5 with runes ($state, $derived, $props).
> All UI components are .svelte files. Business logic is in plain .js files.
> There are NO React dependencies - ignore any legacy React references below.

## Code Formatting

This project uses **Prettier** with the following configuration:

- Single quotes (`'`) instead of double quotes
- No semicolons
- 2-space indentation
- Trailing commas in ES5 contexts

Prettier runs automatically on save and pre-commit. Do not manually format code.

## JavaScript

### Functional Programming Style

**CRITICAL: This project uses functional programming style exclusively.**

- **NEVER use ES6 classes** - Use factory functions that return objects with methods
- **Use closures for state management** - Encapsulate state in function scope
- **Use pure functions** - Functions should not mutate arguments or have side effects
- **Prefer composition over inheritance** - Build complex behavior by combining simple functions

#### Factory Function Pattern

Instead of classes, use factory functions:

```javascript
// ❌ BAD - Do not use classes
export class SimulationRunner {
  constructor() {
    this.state = {}
  }

  start() {
    // ...
  }
}

// ✅ GOOD - Use factory functions
export const createSimulationRunner = () => {
  let state = {}

  const start = () => {
    // ...
  }

  return {
    start,
  }
}
```

### Modern ES6+ Syntax

- Use `const` by default, `let` when reassignment is needed
- Never use `var`
- Use arrow functions for callbacks
- Use template literals for string interpolation
- Use destructuring for objects and arrays
- Use spread operator for immutable updates

### Naming Conventions

- PascalCase for React components
- camelCase for variables, functions, and properties
- SCREAMING_SNAKE_CASE for constants
- Factory functions: prefix with `create` (e.g., `createSimulationRunner`)
- Prefix props interfaces with component name in comments

### JSDoc Comments

Use JSDoc for function documentation:

```javascript
/**
 * Calculate flow efficiency for a value stream
 * @param {Object} vsm - The value stream map
 * @param {Array} vsm.steps - Array of process steps
 * @returns {number} Flow efficiency as decimal (0-1)
 */
function calculateFlowEfficiency(vsm) {
  // implementation
}
```

## Svelte Components

### Component Structure

1. `<script>` block: imports, props, state, derived, handlers
2. Template markup with Svelte syntax
3. Optional `<style>` block (prefer Tailwind classes)

### Example Component

```svelte
<script>
  import { vsmDataStore } from '../../stores/vsmDataStore.svelte.js'

  let { step = null, onupdate } = $props()

  let name = $state(step?.name || '')
  let processTime = $state(step?.processTime || 0)

  function handleSubmit(e) {
    e.preventDefault()
    onupdate({ ...step, name, processTime })
  }
</script>

<form onsubmit={handleSubmit} data-testid="step-editor">
  <label>
    Step Name
    <input bind:value={name} data-testid="step-name-input" />
  </label>
  <button type="submit">Save</button>
</form>
```

### Props

Use Svelte 5 `$props()` rune for component props:

```svelte
<script>
  // Required props (no default)
  let { title, onclick } = $props()

  // Optional props with defaults
  let { count = 0, step = null, steps = [], status = 'good' } = $props()
</script>
```

### Reactivity

- Use `$state()` for mutable reactive state
- Use `$derived()` for computed values
- Use `$effect()` sparingly (prefer derived state)

### Event Handlers

- Prefix with `handle`: `handleClick`, `handleSubmit`

### Svelte Stores (*.svelte.js)

Stores use `$state()` in module-level factory functions:

```javascript
function createMyStore() {
  let value = $state(0)
  return {
    get value() { return value },
    increment() { value++ },
  }
}
export const myStore = createMyStore()
```

## Imports

Use relative imports with clear paths:

```javascript
// External imports first
import { SvelteFlow } from '@xyflow/svelte'

// Internal imports
import { vsmDataStore } from '../stores/vsmDataStore.svelte.js'
import { calculateMetrics } from '../utils/calculations/metrics'
import StepNode from './canvas/nodes/StepNode.svelte'
```

## Data Testability

Always add `data-testid` attributes for acceptance testing:

```jsx
<button data-testid="add-step-button">Add Step</button>
<div data-testid="metrics-dashboard">...</div>
<input data-testid="process-time-input" />
```
