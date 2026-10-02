Feature: Guided backwards mapping workflow
  As a value stream mapping practitioner
  I want guidance to start mapping from production and work backwards
  So that I follow the canonical right-to-left mapping practice

  Background:
    Given I am on the welcome screen

  Scenario: Blank map shows guidance to start from production
    When I create a blank map named "My Delivery Process"
    Then I should see a guidance prompt suggesting to start with the final delivery step
    And the guidance should indicate that steps will be added to the left

  Scenario: First step is positioned on the right side of the canvas
    When I create a blank map named "My Delivery Process"
    And I add a step named "Deploy to Production"
    Then the step should be positioned on the right side of the canvas

  Scenario: Second step is positioned to the left of the first
    Given I have a blank map with one step "Deploy to Production"
    When I add a step named "Staging QA"
    Then "Staging QA" should be positioned to the left of "Deploy to Production"

  Scenario: User can dismiss the guidance
    When I create a blank map named "My Delivery Process"
    And I dismiss the mapping guidance
    Then the guidance prompt should no longer be visible

  Scenario: Guidance does not appear for template maps
    When I load the "Software Delivery Pipeline" template
    Then I should not see the backwards mapping guidance

  Scenario: Guidance does not reappear after being dismissed
    When I create a blank map named "My Delivery Process"
    And I dismiss the mapping guidance
    And I add a step named "Deploy"
    Then the guidance prompt should not reappear
