Feature: What-If Scenarios
  As a team facilitator
  I want to test different scenarios
  So that I can see the impact of potential improvements

  Scenario: Create a what-if scenario
    Given I have a value stream map
    When I click the Create Scenario button
    Then a copy of the current map should be created
    And I should be able to modify the scenario

  Scenario: Compare batch size changes
    Given a value stream with batch size 5 at deployment
    When I create a scenario with batch size 1 at deployment
    And I run both simulations
    Then I should see a comparison of results
    And the smaller batch scenario should show lower lead time

  Scenario: Test adding capacity
    Given a value stream with a bottleneck step
    And the bottleneck step has 1 worker
    When I create a scenario with 2 workers at the bottleneck
    And I run both simulations
    Then I should see improved throughput in the 2-worker scenario
    And the bottleneck should be reduced or eliminated

  Scenario: Compare improvement percentages
    Given two completed scenario simulations
    When I view the comparison
    Then I should see the percentage improvement in lead time
    And I should see the percentage improvement in throughput

  Scenario: Save and load scenarios
    Given I have created a what-if scenario
    When I save the scenario
    Then the scenario should be persisted
    And I should be able to load it later
