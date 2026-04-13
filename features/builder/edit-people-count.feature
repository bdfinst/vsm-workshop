Feature: Edit People Count
  As a team facilitator
  I want to set the number of people working on a process step
  So that the simulation accurately reflects our team capacity

  Scenario: People count field is visible in step editor
    Given I have a step named "Development"
    When I open the step editor
    Then I should see a people count input field

  Scenario: Set people count for a step
    Given I am editing a step with people count of 1
    When I change the people count to 3
    And I save the changes
    Then the step should have a people count of 3

  Scenario: People count defaults to 1
    Given I have just added a new step
    When I open the step editor
    Then the people count should be 1

  Scenario: Validate people count minimum
    Given I am editing a step
    When I set people count to 0
    Then I should see an error "People count must be >= 1"
