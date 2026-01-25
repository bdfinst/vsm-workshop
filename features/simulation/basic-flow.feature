Feature: Basic Flow Simulation
  As a team facilitator
  I want to simulate work flowing through the value stream
  So that I can see how items move through our process

  Background:
    Given I have a value stream map with 4 connected steps

  Scenario: Run flow simulation
    When I click the Run Simulation button
    And I set work items to 10
    And the simulation runs to completion
    Then I should see 10 completed items
    And the simulation should show results

  Scenario: Work items move through steps
    When I start the simulation with 5 work items
    Then work items should progress through each step
    And each step should process items based on its process time

  Scenario: Control simulation speed
    Given a running simulation
    When I set simulation speed to 2x
    Then the simulation should run faster
    When I set simulation speed to 0.5x
    Then the simulation should run slower

  Scenario: Pause and resume simulation
    Given a running simulation
    When I click the Pause button
    Then the simulation should be paused
    And work items should stop moving
    When I click the Resume button
    Then the simulation should continue
    And work items should resume moving

  Scenario: Reset simulation
    Given a completed simulation
    When I click the Reset button
    Then the simulation should reset
    And completed count should be 0
    And all work items should be cleared
