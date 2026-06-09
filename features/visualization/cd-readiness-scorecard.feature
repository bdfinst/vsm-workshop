Feature: CD Readiness Scorecard
  As a team facilitator running a Phase 0 assessment
  I want the value stream map to auto-score our MinimumCD practices and flag likely gaps
  So that I can find delivery constraints without filling in a checklist by hand

  # Grounded in beyond.minimumcd.org (the MinimumCD Practice Guide). Phase 0 Assess says to
  # map the stream AND self-assess practices together. This scorecard pre-fills likely
  # practice gaps from data the VSM already stores per step, pins each gap to the offending
  # step, and lets the facilitator confirm or override the inferred status.

  Background:
    Given I have a value stream map open

  Scenario: Scorecard lists the nine MinimumCD practices
    Given a value stream with steps:
      | name | processTime | leadTime |
      | Dev  | 60          | 240      |
    When I open the CD readiness scorecard
    Then the scorecard should list 9 MinimumCD practices

  Scenario: Empty value stream prompts the user to add steps
    Given an empty value stream map
    When I open the CD readiness scorecard
    Then I should see a message to add steps before assessing readiness

  # --- Auto-inferred gaps: each finding maps to a practice signal and pins to a step ---

  Scenario: Long step lead time flags a work decomposition gap
    Given a value stream with steps:
      | name        | processTime | leadTime |
      | Development  | 120         | 1200     |
    When I open the CD readiness scorecard
    Then the "Work Decomposition" practice should be flagged as a gap
    And the gap should be pinned to the "Development" step
    And the gap should explain that work items should be completable within 2 days

  Scenario: Slow test step flags a testing fundamentals gap
    Given a value stream with steps:
      | name | type    | processTime | leadTime |
      | QA   | testing | 45          | 120      |
    When I open the CD readiness scorecard
    Then the "Testing Fundamentals" practice should be flagged as a gap
    And the gap should be pinned to the "QA" step
    And the gap should explain that test suites should run in under 10 minutes

  Scenario: Multiple manual deploy steps flag a single path to production gap
    Given a value stream with steps:
      | name              | type       | processTime | leadTime |
      | Manual QA Deploy  | deployment | 30          | 120      |
      | Manual Prod Deploy| deployment | 30          | 240      |
    When I open the CD readiness scorecard
    Then the "Single Path to Production" practice should be flagged as a gap
    And the gap should explain that there should be one automated path to production

  Scenario: Low percent complete and accurate flags a definition of deployable gap
    Given a value stream with steps:
      | name        | processTime | leadTime | percentCompleteAccurate |
      | Development  | 120         | 240      | 60                      |
    When I open the CD readiness scorecard
    Then the "Definition of Deployable" practice should be flagged as a gap
    And the gap should be pinned to the "Development" step

  Scenario: A bottleneck queue flags constrained work in progress
    Given a value stream with steps:
      | name   | processTime | leadTime | queueSize |
      | Dev    | 60          | 240      | 2         |
      | Review | 30          | 480      | 25        |
    When I open the CD readiness scorecard
    Then the "Work In Progress Limits" practice should be flagged as a gap
    And the gap should be pinned to the "Review" step

  Scenario: Wait-dominated flow flags queue-dominated waste
    Given total process time is 100 minutes
    And total lead time is 1000 minutes
    When I open the CD readiness scorecard
    Then the "Small Batches" practice should be flagged as a gap
    And the gap should explain that flow is dominated by waiting rather than work

  Scenario: No deployment step flags a rollback gap
    Given a value stream with steps:
      | name        | type        | processTime | leadTime |
      | Development  | development | 120         | 240      |
      | Code Review  | code_review | 30          | 120      |
    When I open the CD readiness scorecard
    Then the "Rollback" practice should be flagged as a gap

  # --- Practices that cannot be inferred from VSM data default to needing manual review ---

  Scenario: Practices with no VSM signal default to needs review
    Given a value stream with steps:
      | name | processTime | leadTime |
      | Dev  | 60          | 240      |
    When I open the CD readiness scorecard
    Then the "Trunk-Based Development" practice should show status "needs review"
    And the "Immutable Artifacts" practice should show status "needs review"

  # --- Healthy stream: thresholds met means the practice passes ---

  Scenario: A healthy step does not flag a work decomposition gap
    Given a value stream with steps:
      | name        | processTime | leadTime |
      | Development  | 120         | 360      |
    When I open the CD readiness scorecard
    Then the "Work Decomposition" practice should show status "met"

  # --- User can confirm or override an inferred status ---

  Scenario: Confirming an inferred gap keeps it flagged
    Given a value stream with steps:
      | name        | processTime | leadTime |
      | Development  | 120         | 1200     |
    And I open the CD readiness scorecard
    And the "Work Decomposition" practice is flagged as a gap
    When I confirm the "Work Decomposition" gap
    Then the "Work Decomposition" practice should show status "gap"
    And the "Work Decomposition" practice should be marked as confirmed by me

  Scenario: Overriding an inferred gap marks the practice as met
    Given a value stream with steps:
      | name        | processTime | leadTime |
      | Development  | 120         | 1200     |
    And I open the CD readiness scorecard
    And the "Work Decomposition" practice is flagged as a gap
    When I override the "Work Decomposition" practice to "met"
    Then the "Work Decomposition" practice should show status "met"
    And the "Work Decomposition" practice should be marked as overridden by me

  # --- Roll-up summary ---

  Scenario: Scorecard summarizes overall readiness
    Given a value stream with steps:
      | name        | type        | processTime | leadTime | percentCompleteAccurate |
      | Development  | development | 120         | 1200     | 60                      |
      | QA           | testing     | 45          | 120      | 90                      |
    When I open the CD readiness scorecard
    Then the scorecard should show a count of practices met and practices with gaps
