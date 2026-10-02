Feature: WIP and Batch-Size Levers
  As a team facilitator
  I want to apply Little's Law and project batch-size changes
  So that I can reason about WIP and small batches as flow levers

  Scenario: Estimate WIP from Little's Law
    Given a value stream with steps:
      | name | leadTime |
      | Dev  | 960      |
    When the team throughput is 2 items per day
    Then the estimated work in progress is 4 items

  Scenario: Halving a step's batch size shortens its lead time
    Given a step "Build" with process time 60, lead time 240, and batch size 4
    When I project halving the batch size of "Build"
    Then the projected lead time for "Build" is 150 minutes

  Scenario: Growing a step's batch size lengthens its lead time
    Given a step "Build" with process time 60, lead time 240, and batch size 4
    When I project doubling the batch size of "Build"
    Then the projected lead time for "Build" is greater than 240 minutes
