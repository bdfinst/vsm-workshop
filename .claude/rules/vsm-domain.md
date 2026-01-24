# VSM Domain Modeling Rules

## Core Data Structures

Always use these canonical structures for VSM data:

```javascript
// Process Step
const step = {
  id: 'step-uuid',           // Unique identifier
  name: 'Development',       // Display name
  type: 'development',       // Step type constant
  description: '',           // Optional description

  // Timing (always in minutes)
  processTime: 60,           // Actual work time
  leadTime: 240,             // Total elapsed time including wait

  // Quality
  percentCompleteAccurate: 95, // 0-100

  // Flow
  queueSize: 5,              // Items waiting to enter
  batchSize: 1,              // Items processed together

  // Resources
  peopleCount: 2,
  tools: ['IDE', 'Git'],

  // Position (for React Flow)
  position: { x: 100, y: 100 }
};

// Connection between steps
const connection = {
  id: 'conn-uuid',
  source: 'step-1-id',       // Source step ID
  target: 'step-2-id',       // Target step ID
  type: 'forward',           // 'forward' or 'rework'
  reworkRate: 15             // 0-100, only for rework connections
};

// Complete Value Stream Map
const valueStreamMap = {
  id: 'vsm-uuid',
  name: 'Feature Delivery',
  description: 'End-to-end feature delivery process',
  steps: [],                 // Array of steps
  connections: [],           // Array of connections
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z'
};
```

## Time Units

- Store all times in **minutes** internally
- Display in human-readable format based on magnitude

```javascript
/**
 * Format duration for display
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration string
 */
function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 480) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(minutes / 480); // 8-hour workday
  const h = Math.floor((minutes % 480) / 60);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}
```

## Percentage Conventions

- Store percentages as numbers 0-100 (not 0-1)
- Display with `%` symbol
- %C&A represents quality passing to next step

## Metric Calculations

### Flow Efficiency

```javascript
// flowEfficiency = totalProcessTime / totalLeadTime
// Express as percentage (0-100%)
// Good: > 25%, Excellent: > 40%
```

### Total Lead Time

```javascript
// totalLeadTime = sum of all step lead times + queue wait times
```

### Throughput

```javascript
// throughput = completedItems / timePeriod
// Express in items per day/week as appropriate
```

### First Pass Yield

```javascript
// firstPassYield = product of all (%C&A / 100)
// Represents probability an item flows through without rework
```

## Step Types

```javascript
// src/data/stepTypes.js

export const STEP_TYPES = {
  PLANNING: 'planning',
  DEVELOPMENT: 'development',
  CODE_REVIEW: 'code_review',
  TESTING: 'testing',
  QA: 'qa',
  STAGING: 'staging',
  DEPLOYMENT: 'deployment',
  MONITORING: 'monitoring',
  CUSTOM: 'custom'
};
```

## Validation Rules

1. Lead time must be >= process time
2. Percentages must be 0-100
3. Queue size and batch size must be >= 0
4. Every step except first must have at least one incoming connection
5. Every step except last must have at least one outgoing connection
6. Rework connections must point to an earlier step in the flow

## Validation Function

```javascript
/**
 * Validate a value stream map
 * @param {Object} vsm - Value stream map to validate
 * @returns {Object} Validation result with errors array
 */
function validateVSM(vsm) {
  const errors = [];

  vsm.steps.forEach((step, index) => {
    if (step.leadTime < step.processTime) {
      errors.push({
        stepId: step.id,
        field: 'leadTime',
        message: 'Lead time must be >= process time'
      });
    }

    if (step.percentCompleteAccurate < 0 || step.percentCompleteAccurate > 100) {
      errors.push({
        stepId: step.id,
        field: 'percentCompleteAccurate',
        message: '%C&A must be between 0 and 100'
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}
```

## Educational Content

When displaying VSM concepts, provide context via tooltips:

| Term | Explanation |
|------|-------------|
| Lead Time | Total time from when work is requested to when it's delivered |
| Process Time | Actual hands-on-keyboard time doing the work |
| %C&A | Percentage of work that doesn't need to come back for fixes |
| Flow Efficiency | How much of the time work is actually being worked on vs waiting |
| Queue | Work items waiting to enter a process step |
| Batch Size | Number of items processed together before moving to next step |
| Rework | Work that returns to an earlier step for corrections |
