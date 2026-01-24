Feature: Edit Process Step
  As a team facilitator
  I want to edit process step details
  So that I can refine our metrics as we learn more

  Scenario: Open step editor
    Given I have a step named "Development"
    When I double-click on the step
    Then the step editor should open

  Scenario: Edit step name
    Given I have the step editor open for "Development"
    When I change the step name to "Backend Development"
    And I save the changes
    Then the step should display "Backend Development"

  Scenario: Edit step metrics
    Given I have a step with process time 60 and lead time 240
    When I edit the step
    And I change process time to 90
    And I change lead time to 300
    Then the step should show PT: 90m and LT: 300m

  Scenario: Validate lead time >= process time
    Given I am editing a step
    When I enter process time of 120 minutes
    And I enter lead time of 60 minutes
    Then I should see an error "Lead time must be >= process time"
    And the save button should be disabled

  Scenario: Edit percent complete and accurate
    Given I have a step with %C&A of 100
    When I edit the step
    And I change %C&A to 85
    Then the step should show %C&A: 85%
