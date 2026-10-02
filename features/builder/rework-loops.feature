Feature: Rework Loops
  As a team facilitator
  I want to map rework loops in my value stream
  So that I can visualize work that returns to earlier steps

  Background:
    Given I have a value stream map with steps "Development" and "Testing"
    And "Development" is connected to "Testing"

  Scenario: Add rework connection
    When I create a connection from "Testing" back to "Development"
    And I mark it as a "Rework" connection
    And I set rework rate to 20%
    Then I should see a rework connection from "Testing" to "Development"
    And it should display "20% rework"

  Scenario: Edit connection type
    Given I have a forward connection from "Development" to "Testing"
    When I click on the forward connection
    Then the connection editor should open
    When I change the connection type to "Rework"
    And I set rework rate to 15%
    And I save the connection
    Then the connection should display as a rework loop
    And it should show "15% rework"

  Scenario: Validate rework rate
    Given I am editing a rework connection
    When I enter a rework rate of 0%
    Then I should see an error "Rework connections need a rate > 0"

  Scenario: Delete rework connection
    Given I have a rework connection from "Testing" to "Development"
    When I click on the rework connection
    And I click delete on the connection
    And I confirm the deletion
    Then the rework connection should be removed
