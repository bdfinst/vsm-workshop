Feature: Advanced Metrics
  As a team facilitator
  I want to see additional performance metrics
  So that I can better understand our delivery performance

  Scenario: Display activity ratio
    Given a value stream with steps:
      | name   | processTime |
      | Dev    | 60          |
      | Test   | 30          |
      | Deploy | 15          |
    When I view the metrics dashboard
    Then average process time should show "35m"

  Scenario: Display effective lead time with rework
    Given a value stream with total lead time of 300 minutes
    And a rework loop with 20% rework rate
    When I view the metrics dashboard
    Then effective lead time should be greater than base lead time
    And rework multiplier should show "1.25x"

  Scenario: Display rework impact status
    Given a rework loop with 5% rework rate
    Then the rework impact should show good status
    Given a rework loop with 20% rework rate
    Then the rework impact should show warning status
    Given a rework loop with 35% rework rate
    Then the rework impact should show critical status

  Scenario: Effective lead time hidden without rework
    Given a value stream with no rework connections
    When I view the metrics dashboard
    Then I should not see effective lead time metric
