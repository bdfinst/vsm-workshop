# ATDD Workflow Rules

## Core Principle

**Tests come before code. Always.**

1. **No implementation without tests first** - Write failing tests before any implementation code
2. **No feature without approved scenarios** - Gherkin scenarios are specification text and must be reviewed and approved before coding
3. **Red-Green-Refactor** - Follow the TDD cycle strictly

Scenarios live in the plan or spec as Gherkin text. Each scenario becomes one test whose title is the scenario name.

## Where Scenarios Become Tests

- **Logic-only scenarios** (calculations, stores, codecs, validation) are Vitest tests in `tests/unit/`.
- **UI scenarios** are Playwright specs in `tests/e2e/`.
- An outline becomes one test per example row, titled with the row values.

## Workflow Steps

### 1. Scenario Creation

When starting any new feature:

1. Write scenarios in Gherkin syntax in the plan or spec
2. **STOP** and present for review
3. Wait for explicit approval before proceeding

### 2. Scenario Structure

```gherkin
Scenario: [Happy path description]
  Given [precondition]
  When [action]
  Then [expected result]
```

Use `Background:` and `Scenario Outline:` with `Examples:` where they remove repetition.

### 3. Review Checklist

Before presenting scenarios for review, verify:

- [ ] Capability is clearly named and the user story captures who, what, and why
- [ ] Happy path scenario is complete
- [ ] Key edge cases are covered
- [ ] Steps are written from user's perspective
- [ ] No implementation details in scenarios
- [ ] Steps are atomic and reusable

### 4. After Approval

Once scenarios are approved:

1. Write one failing test per scenario, titled with the scenario name (red phase)
2. Implement minimum code to pass (green phase)
3. Refactor while keeping tests green

### 5. Test Guidelines

```javascript
// tests/e2e/add-step.spec.js
import { test, expect } from '@playwright/test'

test('Add a step to the map', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('new-map-name-input').fill('Test Map')
  await page.getByTestId('create-map-button').click()
  await page.getByRole('button', { name: 'Add Step' }).click()
  await page.getByTestId('step-name-input').fill('Development')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.locator('.vsm-node')).toBeVisible()
})
```

- Drive the page by role, label, and `data-testid`.
- Share setup through Playwright fixtures (`test.extend`) or helper modules, not copy-paste.
- Use retrying `expect` assertions for anything asynchronous.

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
# Run all acceptance tests (builds first)
npm run test:acceptance

# Run one spec
npm run test:acceptance -- tests/e2e/canvas.spec.js

# Filter by test title
npm run test:acceptance -- -g "Add a step"

# Unit and acceptance together
npm run test:all
```

## Definition of Done

A feature is complete when:

- [ ] Every approved scenario has a passing test
- [ ] No skipped or `test.fixme` tests
- [ ] Code is refactored and clean
- [ ] Unit tests exist for complex calculations
- [ ] Scenario text in the plan or spec matches the test titles
