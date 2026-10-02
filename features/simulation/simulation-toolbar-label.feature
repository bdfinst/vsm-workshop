Feature: Simulation Toolbar Differentiation
  As a team facilitator
  I want the simulation toolbar to be visually distinct from the builder toolbar
  So that I can immediately tell which mode I am in

  Scenario: Simulation toolbar has distinct background
    Given I am on the simulation view
    Then the simulation toolbar should have a gray background
    And the simulation toolbar should display a "Simulation" label
