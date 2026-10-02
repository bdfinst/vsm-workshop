Feature: Add Process Step
  As a team facilitator
  I want to add process steps to my value stream
  So that I can represent each stage of our delivery process

  Scenario: Add a step from the sidebar
    Given I have an empty value stream map
    When I click the "Add Step" button
    Then I should see a "New Step" step on the canvas
    And the step should have default process time and lead time

  Scenario: Add multiple steps
    Given I have a value stream map with a "Development" step
    When I click the "Add Step" button
    Then I should see 2 steps on the canvas

  Scenario: Steps are positioned sequentially
    Given I have an empty value stream map
    When I add 3 steps
    Then the steps should be arranged left to right
