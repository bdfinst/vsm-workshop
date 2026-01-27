# Domain Models

Factory functions for creating domain objects.

## Why Factory Functions?

This project uses **functional programming** exclusively - NO ES6 classes allowed.

Factory functions provide:
- Encapsulation via closures
- No `this` binding issues
- Easy composition
- Better testability
- Simpler mental model

## Files

- **StepFactory.js** - Create VSM step objects
- **ConnectionFactory.js** - Create connection objects

## Usage

```javascript
import { createStep } from './models/StepFactory'

const step = createStep({
  name: 'Development',
  processTime: 60,
  leadTime: 240
})
// Returns: { id: 'generated', name: 'Development', processTime: 60, ... }
```

## Pattern

All factories follow the same pattern:

```javascript
export const createEntity = ({
  // Required params
  requiredField,
  // Optional params with defaults
  optionalField = defaultValue
}) => ({
  // Generate unique ID
  id: generateId(),
  // Spread provided values
  requiredField,
  optionalField,
  // Add computed fields
  createdAt: Date.now()
})
```

## Type Definitions

All models follow VSM domain rules (see `.claude/rules/vsm-domain.md`):

### Step Object
```javascript
{
  id: string,              // Auto-generated unique ID
  name: string,            // Step name
  type: string,            // Step type constant
  processTime: number,     // Active work time (minutes)
  leadTime: number,        // Total elapsed time (minutes)
  percentCompleteAccurate: number, // Quality (0-100)
  queueSize: number,       // Items waiting
  batchSize: number,       // Items processed together
  peopleCount: number,     // Resources available
  tools: string[],         // Tools/technologies
  position: {x, y}         // Canvas position
}
```

### Connection Object
```javascript
{
  id: string,              // Auto-generated unique ID
  source: string,          // Source step ID
  target: string,          // Target step ID
  type: 'forward'|'rework', // Connection type
  reworkRate: number       // Percentage (0-100, only for rework)
}
```

## Domain Rules

When creating objects, these rules are enforced:

1. **Times in minutes** (not seconds or hours)
2. **Percentages as 0-100** (not 0-1 decimals)
3. **Lead time >= Process time** (validated by validators)
4. **IDs are auto-generated** (don't provide custom IDs unless importing)

## Validation

Models are created without validation. Use validators before persisting:

```javascript
import { createStep } from './models/StepFactory'
import { validateStep } from './utils/validation/stepValidator'

const step = createStep({ name: 'Dev', processTime: 60, leadTime: 240 })
const { valid, errors } = validateStep(step)

if (valid) {
  vsmStore.getState().addStep(step)
} else {
  console.error('Invalid step:', errors)
}
```

## Testing

Factory functions are pure and easy to test:

```javascript
import { describe, it, expect } from 'vitest'
import { createStep } from './StepFactory'

describe('createStep', () => {
  it('generates unique IDs', () => {
    const step1 = createStep({ name: 'Step 1' })
    const step2 = createStep({ name: 'Step 2' })
    expect(step1.id).not.toBe(step2.id)
  })

  it('applies default values', () => {
    const step = createStep({ name: 'Test' })
    expect(step.percentCompleteAccurate).toBe(100)
    expect(step.batchSize).toBe(1)
  })
})
```

## See Also

- [Factory Function Examples](../../.claude/examples/factory-functions.md)
- [VSM Domain Rules](../../.claude/rules/vsm-domain.md)
- [Testing Patterns](../../.claude/examples/testing-patterns.md)
