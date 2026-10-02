Feature: Scrollable simulation panel
  As a user
  I want the simulation panel to be scrollable
  So that it does not push other content off screen when results are large

  Scenario: Simulation panel has constrained height
    Given I have a value stream map with steps
    When the simulation panel displays results
    Then the simulation panel should be scrollable
    And the panel should not exceed 40% of the viewport height
