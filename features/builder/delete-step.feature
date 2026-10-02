Feature: Delete Process Step
  As a team facilitator
  I want to remove process steps
  So that I can correct mistakes in my map

  Scenario: Delete a step via editor
    Given I have a value stream map with steps "Dev" and "Test"
    When I open the editor for "Dev"
    And I click "Delete"
    And I confirm the deletion
    Then the canvas should only show "Test"

  Scenario: Delete a step via keyboard
    Given I have a step selected
    When I press the Delete key
    And I confirm the deletion
    Then the step should be removed

  Scenario: Cancel deletion
    Given I have a step named "Development"
    When I click delete on the step
    And I cancel the confirmation
    Then the step should still exist

  Scenario: Deleting a step removes its connections
    Given "Development" is connected to "Testing"
    When I delete "Development"
    Then the connection should also be removed
