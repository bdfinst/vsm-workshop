Feature: Monte-Carlo Lead Time
  As a team facilitator
  I want to simulate lead-time variability across many trials
  So that I can see the realistic range of delivery times, not a single number

  Scenario: Zero variability reproduces the deterministic lead time
    Given a value stream with steps:
      | name | leadTime |
      | Dev  | 240      |
      | Test | 120      |
    When I run a Monte-Carlo simulation with 0% variability
    Then the P50 lead time is 360 minutes

  Scenario: Variability widens the percentile spread
    Given a value stream with steps:
      | name | leadTime |
      | Dev  | 240      |
      | Test | 120      |
    When I run a Monte-Carlo simulation with 40% variability
    Then the P95 lead time is at least the P50 lead time
    And the simulation is reproducible for the same seed
