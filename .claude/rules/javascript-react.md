# JavaScript & React Coding Standards

## Code Formatting

This project uses **Prettier** with the following configuration:

- Single quotes (`'`) instead of double quotes
- No semicolons
- 2-space indentation
- Trailing commas in ES5 contexts

Prettier runs automatically on save and pre-commit. Do not manually format code.

## JavaScript

### Modern ES6+ Syntax

- Use `const` by default, `let` when reassignment is needed
- Never use `var`
- Use arrow functions for callbacks
- Use template literals for string interpolation
- Use destructuring for objects and arrays
- Use spread operator for immutable updates

### Naming Conventions

- PascalCase for components and classes
- camelCase for variables, functions, and properties
- SCREAMING_SNAKE_CASE for constants
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

## React

### Component Structure

1. Imports (external, then internal)
2. Component function
3. Hooks (useState, useEffect, custom hooks)
4. Event handlers
5. Render logic
6. PropTypes definition
7. Default props
8. Export

### Example Component

```javascript
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

function StepEditor({ step, onUpdate }) {
  const [name, setName] = useState(step?.name || '')
  const [processTime, setProcessTime] = useState(step?.processTime || 0)

  useEffect(() => {
    if (step) {
      setName(step.name)
      setProcessTime(step.processTime)
    }
  }, [step])

  const handleSubmit = (e) => {
    e.preventDefault()
    onUpdate({ ...step, name, processTime })
  }

  return (
    <form onSubmit={handleSubmit} data-testid="step-editor">
      <label>
        Step Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="step-name-input"
        />
      </label>
      <button type="submit">Save</button>
    </form>
  )
}

StepEditor.propTypes = {
  step: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    processTime: PropTypes.number,
  }),
  onUpdate: PropTypes.func.isRequired,
}

StepEditor.defaultProps = {
  step: null,
}

export default StepEditor
```

### PropTypes

Always define PropTypes for components:

```javascript
import PropTypes from 'prop-types'

MyComponent.propTypes = {
  // Required string
  title: PropTypes.string.isRequired,

  // Optional number with default
  count: PropTypes.number,

  // Required function
  onClick: PropTypes.func.isRequired,

  // Object with specific shape
  step: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    processTime: PropTypes.number,
  }),

  // Array of objects
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
    })
  ),

  // One of specific values
  status: PropTypes.oneOf(['good', 'warning', 'critical']),

  // Children
  children: PropTypes.node,
}

MyComponent.defaultProps = {
  count: 0,
  step: null,
  steps: [],
  status: 'good',
}
```

### Hooks

- Always follow Rules of Hooks
- Extract complex logic into custom hooks in `src/hooks/`
- Name custom hooks with `use` prefix

### Event Handlers

- Prefix with `handle`: `handleClick`, `handleSubmit`

### Memoization

- Use `useMemo` for expensive calculations
- Use `useCallback` for handlers passed to memoized children
- Don't over-memoize - measure before optimizing

## Imports

Use relative imports with clear paths:

```javascript
// External imports first
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

// Internal imports
import { useVsmStore } from '../stores/vsmStore'
import { calculateMetrics } from '../utils/calculations/metrics'
import StepNode from './canvas/nodes/StepNode'
```

## Data Testability

Always add `data-testid` attributes for acceptance testing:

```jsx
<button data-testid="add-step-button">Add Step</button>
<div data-testid="metrics-dashboard">...</div>
<input data-testid="process-time-input" />
```
