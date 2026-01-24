# ATDD Workflow Rules

## Core Principle

**No implementation without an approved feature file.**

Every feature must start with a Gherkin specification that is reviewed and approved before any code is written.

## Workflow Steps

### 1. Feature File Creation

When starting any new feature:

1. Create a `.feature` file in the appropriate `features/` subdirectory
2. Write scenarios in Gherkin syntax
3. **STOP** and present for review
4. Wait for explicit approval before proceeding

### 2. Feature File Structure

```gherkin
Feature: [Clear feature name]
  As a [role]
  I want [capability]
  So that [benefit]

  Background:
    Given [common setup steps]

  Scenario: [Happy path description]
    Given [precondition]
    When [action]
    Then [expected result]

  Scenario: [Edge case or alternative path]
    Given [precondition]
    When [action]
    Then [expected result]
```

### 3. Review Checklist

Before presenting a feature file for review, verify:

- [ ] Feature name clearly describes the capability
- [ ] User story captures who, what, and why
- [ ] Happy path scenario is complete
- [ ] Key edge cases are covered
- [ ] Steps are written from user's perspective
- [ ] No implementation details in scenarios
- [ ] Steps are atomic and reusable

### 4. After Approval

Once a feature file is approved:

1. Create step definitions in `features/step-definitions/`
2. Run tests (should fail - red phase)
3. Implement minimum code to pass (green phase)
4. Refactor while keeping tests green

### 5. Step Definition Guidelines

```javascript
// features/step-definitions/builder.steps.js

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

// Steps should be reusable across scenarios
Given('I have an empty value stream map', function () {
  this.vsm = { steps: [], connections: [] };
});

// Use regex for flexible matching
When(/^I add a step named "([^"]*)"$/, function (name) {
  // implementation
});

// Data tables for complex inputs
Given('a value stream with the following steps:', function (dataTable) {
  const rows = dataTable.hashes();
  this.vsm.steps = rows.map(row => ({
    name: row.name,
    processTime: parseInt(row.processTime),
    leadTime: parseInt(row.leadTime)
  }));
});
```

## File Organization

```
features/
├── builder/
│   ├── add-step.feature
│   ├── edit-step.feature
│   └── connect-steps.feature
├── visualization/
│   ├── display-map.feature
│   └── metrics-dashboard.feature
├── simulation/
│   ├── basic-flow.feature
│   └── bottleneck-detection.feature
└── step-definitions/
    ├── builder.steps.js
    ├── visualization.steps.js
    ├── simulation.steps.js
    └── common.steps.js
```

## Scenario Guidelines

### Good Scenarios

```gherkin
Scenario: Calculate flow efficiency
  Given a value stream with total process time of 120 minutes
  And total lead time of 480 minutes
  When I view the metrics dashboard
  Then the flow efficiency should show "25%"
```

### Bad Scenarios (Avoid)

```gherkin
# Too implementation-focused
Scenario: Flow efficiency calculation
  Given the flowEfficiency function receives processTime=120 and leadTime=480
  When I call calculateFlowEfficiency()
  Then it returns 0.25

# Too vague
Scenario: Metrics work
  Given some data
  When I do something
  Then it works
```

## Running Tests

```bash
# Run all acceptance tests
pnpm test:acceptance

# Run specific feature
pnpm test:acceptance -- features/builder/add-step.feature

# Run with tags
pnpm test:acceptance -- --tags @wip

# Watch mode during development
pnpm test:acceptance --watch
```

## Tags

Use tags to organize and filter scenarios:

```gherkin
@wip
Scenario: Work in progress scenario

@smoke
Scenario: Critical path scenario for smoke testing

@slow
Scenario: Performance-intensive scenario
```

## Definition of Done

A feature is complete when:

- [ ] All scenarios pass
- [ ] No pending or skipped steps
- [ ] Code is refactored and clean
- [ ] Unit tests exist for complex calculations
- [ ] Feature file serves as living documentation
