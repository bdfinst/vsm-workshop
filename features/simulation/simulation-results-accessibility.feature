Feature: Simulation results accessibility
  As a user who relies on assistive technology
  I want simulation results to be announced when they appear
  So that I am aware of updated metrics without needing to visually scan the page

  Scenario: Simulation results container has aria-live region
    Given I have run a simulation to completion
    When the simulation results are displayed
    Then the results container should have aria-live set to "polite"
    And the results container should have role set to "status"
