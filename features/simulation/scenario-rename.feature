Feature: Scenario renaming
  As a user
  I want to rename saved what-if scenarios
  So that I can give them meaningful names

  Scenario: Rename a scenario with a valid name
    Given I have a saved scenario named "Scenario 1"
    When I rename the scenario to "Reduced Wait Times"
    Then the scenario name should be "Reduced Wait Times"

  Scenario: Reject empty name when renaming
    Given I have a saved scenario named "Scenario 1"
    When I try to rename the scenario to an empty string
    Then the scenario name should remain "Scenario 1"

  Scenario: Inline edit via double-click
    Given I have a saved scenario in the comparison panel
    When I double-click on the scenario name
    Then an input field should appear for editing
    And pressing Enter should save the new name
    And pressing Escape should cancel the edit
