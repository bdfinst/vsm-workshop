Feature: Queue Chart Dynamic Scaling
  As a team facilitator
  I want the queue size bar chart to scale dynamically
  So that I can visually compare relative queue sizes across steps

  Scenario: Bars scale relative to the largest queue
    Given a simulation has completed with peak queues of 5, 20, and 8
    Then the bar for the step with peak queue 20 should fill 100% width
    And the bar for the step with peak queue 5 should fill 25% width
    And the bar for the step with peak queue 8 should fill 40% width

  Scenario: All queues are zero
    Given a simulation has completed with all peak queues at 0
    Then all queue bars should show 0% width

  Scenario: Single step with non-zero queue
    Given a simulation has completed with a single step peak queue of 7
    Then the bar should fill 100% width
