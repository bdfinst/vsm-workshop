Feature: Create Value Stream Map
  As a team facilitator
  I want to create a new value stream map
  So that I can begin mapping our delivery process

  Scenario: Create a new empty VSM
    Given I am on the home page
    When I click "Create New Map"
    And I enter "Feature Delivery" as the map name
    Then I should see an empty canvas
    And the map name should display "Feature Delivery"

  Scenario: Auto-save map name
    Given I have created a map named "Feature Delivery"
    When I change the map name to "Bug Fix Process"
    Then the map name should update to "Bug Fix Process"

  Scenario: Create map with default name
    Given I am on the home page
    When I click "Create New Map" without entering a name
    Then a map should be created with name "My Value Stream"
