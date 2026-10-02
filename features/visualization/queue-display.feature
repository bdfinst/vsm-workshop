Feature: Queue Visualization
  As a team facilitator
  I want to see queue sizes on process steps
  So that I can identify where work piles up

  Scenario: Display queue badge on step
    Given I have a step "Development" with queue size of 5
    When I view the canvas
    Then I should see a queue badge showing "5" on the step

  Scenario: No queue badge when queue is zero
    Given I have a step "Development" with queue size of 0
    When I view the canvas
    Then I should not see a queue badge on the step

  Scenario: Highlight high queue as bottleneck
    Given I have a step with queue size of 10
    When I view the canvas
    Then the queue badge should be highlighted as high
    And the step should be marked as a potential bottleneck

  Scenario: Display total queue in metrics
    Given a value stream with steps:
      | name        | queueSize |
      | Development | 5         |
      | Testing     | 3         |
      | Deploy      | 2         |
    When I view the metrics dashboard
    Then total queue should show "10"
