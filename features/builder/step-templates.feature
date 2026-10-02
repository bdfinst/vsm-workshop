Feature: Step Templates
  As a team facilitator
  I want to use pre-defined step templates
  So that I can quickly build common process patterns

  Scenario: View template library in sidebar
    Given I have created a value stream map
    When I view the sidebar
    Then I should see a "Step Templates" section
    And I should see template categories

  Scenario: Add step from template
    Given I have created a value stream map
    When I expand the "Software Development" template category
    And I click on the "Development" template
    Then a "Development" step should be added to the canvas
    And it should have pre-configured process time and lead time

  Scenario: Start with map template
    Given I am on the home page
    When I click on "Software Delivery Pipeline" template
    Then a new map should be created with multiple steps
    And the steps should be connected

  Scenario: Start with support ticket template
    Given I am on the home page
    When I click on "Support Ticket Flow" template
    Then a new map should be created with support workflow steps
