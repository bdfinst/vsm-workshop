# Feature File Review Checklist

**Use this checklist when reviewing Gherkin feature files before implementation.**

---

## 📋 Feature File Structure

### Feature Header

- [ ] Feature name clearly describes the capability
- [ ] User story included (As a... I want... So that...)
- [ ] User story captures who, what, and why
- [ ] Benefit is clear and measurable

**Good example:**
```gherkin
Feature: Calculate flow efficiency
  As a team lead
  I want to see my team's flow efficiency
  So that I can identify improvement opportunities
```

**Bad example:**
```gherkin
Feature: Metrics
  To see metrics
```

---

## 🎯 Scenarios

### Happy Path

- [ ] At least one happy path scenario included
- [ ] Happy path scenario is complete
- [ ] Expected behavior is clear

### Edge Cases

- [ ] Key edge cases covered
- [ ] Error conditions handled
- [ ] Boundary conditions tested

**Examples of edge cases to consider:**
- Empty data
- Zero values
- Maximum values
- Invalid input
- Network errors (if applicable)

---

## ✍️ Step Quality

### Step Writing

- [ ] Steps written from user's perspective
- [ ] No implementation details in steps
- [ ] Steps are atomic and focused
- [ ] Steps are reusable across scenarios
- [ ] No UI element references (buttons, inputs) unless necessary

**Good example:**
```gherkin
When I add a step with process time 60 minutes
```

**Bad example:**
```gherkin
When I click the #add-step-button and type "60" into the process-time-input field
```

### Gherkin Keywords

- [ ] Proper use of Given/When/Then
  - **Given** - Setup/preconditions
  - **When** - Action/event
  - **Then** - Expected outcome
- [ ] No misuse of keywords

---

## 📊 Data Tables

### Table Structure

- [ ] Tables used for complex data
- [ ] Column headers are clear
- [ ] Data is realistic
- [ ] All required fields included

**Example:**
```gherkin
Given a value stream with the following steps:
  | name        | processTime | leadTime | %C&A |
  | Development | 60          | 240      | 95   |
  | Testing     | 30          | 120      | 90   |
```

---

## 🏷️ Tags (If Used)

- [ ] Appropriate tags applied
  - `@wip` - Work in progress
  - `@smoke` - Critical path tests
  - `@slow` - Performance-intensive tests
- [ ] Tags are consistent with project conventions

---

## 📝 Language and Clarity

### Readability

- [ ] Scenarios read like English
- [ ] No jargon or acronyms (unless domain-specific)
- [ ] Stakeholders can understand without technical knowledge
- [ ] Grammar and spelling correct

### Specificity

- [ ] Concrete values used (not "some", "a few")
- [ ] Quantifiable assertions
- [ ] No ambiguous terms

**Good example:**
```gherkin
Then the flow efficiency should be 25%
```

**Bad example:**
```gherkin
Then the flow efficiency should be good
```

---

## 🔄 Scenario Independence

- [ ] Each scenario can run independently
- [ ] No dependencies between scenarios
- [ ] Background section used for common setup
- [ ] Clean state between scenarios

---

## ✅ Acceptance Criteria

### Completeness

- [ ] All acceptance criteria covered
- [ ] Definition of "done" is clear
- [ ] Success conditions explicit

### Testability

- [ ] All scenarios are testable
- [ ] Expected results are verifiable
- [ ] No untestable requirements

---

## 🚨 Red Flags

Watch out for these issues:

❌ Scenarios testing implementation instead of behavior
❌ Too many scenarios (may need to split feature)
❌ Vague or ambiguous language
❌ Missing edge cases
❌ UI-dependent steps (fragile tests)
❌ No Background section when setup is repeated
❌ Scenarios that are too long (>10 steps)

---

## 📋 Review Process

### 1. Initial Review

- [ ] Read through entire feature file
- [ ] Understand the feature's purpose
- [ ] Identify any confusion or questions

### 2. Detailed Review

- [ ] Check each item in this checklist
- [ ] Note any issues or suggestions
- [ ] Consider alternative scenarios

### 3. Approval

- [ ] All checklist items pass
- [ ] Feature aligns with project goals
- [ ] Stakeholders agree on behavior
- [ ] **Give explicit approval before implementation begins**

---

## 💬 Providing Feedback

### Good Feedback

✅ "The scenario 'Add step with invalid data' should test what happens when lead time < process time"
✅ "Consider adding a scenario for zero values"
✅ "The step 'When I save the step' should be 'When I add a step named "Development"' for clarity"

### Poor Feedback

❌ "This is wrong"
❌ "I don't like this"
❌ "Fix it"

---

## 🔗 Example Review

### Before Approval

```gherkin
Feature: Add step
  Scenario: Add step
    When I add a step
    Then it works
```

**Issues:**
- No user story
- Scenario too vague
- No concrete values
- What does "works" mean?

### After Revision

```gherkin
Feature: Add step to value stream map
  As a VSM creator
  I want to add steps to my value stream
  So that I can visualize my process flow

  Scenario: Add a development step successfully
    Given I have an empty value stream map
    When I add a step with the following details:
      | field       | value       |
      | name        | Development |
      | processTime | 60          |
      | leadTime    | 240         |
    Then the VSM should contain 1 step
    And the step "Development" should be visible in the canvas

  Scenario: Reject step with invalid lead time
    Given I have an empty value stream map
    When I try to add a step with process time 100 and lead time 50
    Then I should see an error "Lead time must be >= process time"
    And the step should not be added
```

**Improvements:**
- Added user story
- Concrete scenarios with specific values
- Clear expected outcomes
- Edge case coverage

---

## Related Documentation

- [ATDD Workflow](../rules/atdd-workflow.md) - Complete ATDD process
- [Testing Rules](../rules/testing.md) - Testing strategy
- [Scenario Guidelines](../rules/atdd-workflow.md#scenario-guidelines) - Writing good scenarios

---

**Remember:** Feature files are living documentation. They must be clear, complete, and approved before any implementation begins.
