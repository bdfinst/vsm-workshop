Feature: Connect Process Steps
  As a team facilitator
  I want to connect steps to show workflow
  So that I can visualize how work flows through our process

  Scenario: Connect two steps
    Given I have steps "Development" and "Testing"
    When I drag from the output handle of "Development"
    And I drop on the input handle of "Testing"
    Then a connection should appear between the steps

  Scenario: Remove a connection
    Given "Development" is connected to "Testing"
    When I click on the connection
    And I confirm deletion
    Then the connection should be removed

  Scenario: Cannot create duplicate connections
    Given "Development" is connected to "Testing"
    When I try to connect "Development" to "Testing" again
    Then no new connection should be created
