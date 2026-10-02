Feature: Batch Size Display
  As a team facilitator
  I want to see batch sizes on process steps
  So that I can identify batch processing delays

  Scenario: Display batch badge on step
    Given I have a step "Deployment" with batch size of 5
    When I view the canvas
    Then I should see a batch badge showing "5x" on the step

  Scenario: No batch badge when batch size is 1
    Given I have a step "Development" with batch size of 1
    When I view the canvas
    Then I should not see a batch badge on the step

  Scenario: Edit batch size
    Given I have a step with batch size of 1
    When I edit the step
    And I change batch size to 3
    And I save the changes
    Then the step should show a batch badge "3x"
