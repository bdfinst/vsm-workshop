# Feature Files (BDD/ATDD)

Gherkin-style acceptance tests that drive development.

## Organization

```
features/
├── builder/          # VSM builder features
├── visualization/    # Map display features
├── simulation/       # Simulation features
├── data/            # Data management features
└── step-definitions/ # Cucumber step implementations
```

## Workflow

1. **Write feature file** in appropriate subdirectory
2. **Review with stakeholder** - get approval
3. **Create step definitions** in step-definitions/
4. **Run tests** - verify they fail (red)
5. **Implement feature** - make tests pass (green)
6. **Refactor** - clean up while tests stay green

## Feature File Structure

```gherkin
Feature: [Capability name]
  As a [role]
  I want [capability]
  So that [benefit]

  Background:
    Given [common setup]

  Scenario: [Happy path]
    Given [precondition]
    When [action]
    Then [expected result]
```

## Writing Good Features

### Do's ✅
- Write from user's perspective
- Focus on behavior, not implementation
- Use concrete values (not "some", "a few")
- Test both happy path and edge cases
- Keep scenarios independent

### Don'ts ❌
- Reference UI elements directly (buttons, IDs)
- Include implementation details
- Make scenarios depend on each other
- Use vague language
- Test internal APIs directly

## Running Tests

```bash
# All features
pnpm test:acceptance

# Specific feature
pnpm test:acceptance -- features/builder/add-step.feature

# With tags
pnpm test:acceptance -- --tags @smoke

# Watch mode
pnpm test:acceptance --watch
```

## Step Definitions

Step definitions live in `step-definitions/` and connect Gherkin to code:

```javascript
import { Given, When, Then } from '@cucumber/cucumber'

Given('I have an empty VSM', function () {
  this.vsm = { steps: [], connections: [] }
})

When('I add a step named {string}', function (name) {
  this.vsm.steps.push({ name })
})

Then('the VSM should contain {int} step(s)', function (count) {
  expect(this.vsm.steps).toHaveLength(count)
})
```

## Tags

Use tags to organize and filter scenarios:

- `@wip` - Work in progress (skip in CI)
- `@smoke` - Critical path tests
- `@slow` - Performance-intensive tests

```gherkin
@smoke
Scenario: Add a step to VSM
  Given I have an empty VSM
  ...
```

## Best Practices

1. **Test behavior, not implementation**
   - Good: "When I add a development step"
   - Bad: "When I call addStep() with type='development'"

2. **Use data tables for complex input**
   ```gherkin
   When I add a step with the following details:
     | field       | value       |
     | name        | Development |
     | processTime | 60          |
   ```

3. **Keep scenarios focused**
   - Each scenario tests one thing
   - 5-10 steps maximum

4. **Use Background for common setup**
   ```gherkin
   Background:
     Given I have an empty VSM
     And I am on the builder page
   ```

## See Also

- [ATDD Workflow](../.claude/rules/atdd-workflow.md)
- [Feature Review Checklist](../.claude/checklists/feature-review.md)
- [New Feature Skill](../.claude/skills/new-feature.md)
- [Testing Patterns](../.claude/examples/testing-patterns.md)
