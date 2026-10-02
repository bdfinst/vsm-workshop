Feature: Bottleneck Detection
  As a team facilitator
  I want to identify bottlenecks during simulation
  So that I can see where work queues up

  Scenario: Highlight bottleneck during simulation
    Given a value stream with a slow step
    And the slow step has process time twice the average
    When I run the simulation with 10 work items
    Then work should queue up before the slow step
    And the slow step should be highlighted as a bottleneck

  Scenario: Detect multiple bottlenecks
    Given a value stream with two slow steps
    When I run the simulation
    Then both slow steps should be highlighted as bottlenecks

  Scenario: Bottleneck clears when queue reduces
    Given a simulation with an active bottleneck
    When the queue at the bottleneck step reduces below threshold
    Then the step should no longer be highlighted as a bottleneck

  Scenario: Show queue buildup over time
    Given a completed simulation with bottleneck data
    When I view the simulation results
    Then I should see a chart of queue sizes over time
    And the bottleneck step should have the highest peak queue

  Scenario: Display bottleneck metrics
    Given a completed simulation
    When I view the simulation results
    Then I should see which steps were bottlenecks
    And I should see the peak queue size for each bottleneck
