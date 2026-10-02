Feature: Save and Load Map
  As a team facilitator
  I want to save my value stream map
  So that I can continue working on it later

  Scenario: Auto-save to browser storage
    Given I have created a value stream map
    When I add a step
    Then the map should be automatically saved to browser storage

  Scenario: Load map on page refresh
    Given I have saved a map with 3 steps
    When I refresh the page
    Then I should see my map with 3 steps

  Scenario: Export map as JSON
    Given I have a completed value stream map
    When I click "Export"
    And I select "Export as JSON"
    Then a JSON file should download

  Scenario: Import map from JSON
    Given I have a JSON file of a value stream map
    When I click "Import"
    And I select the JSON file
    Then the map should load on the canvas

  Scenario: Create new map clears current
    Given I have a map with steps
    When I click "New Map"
    And I confirm
    Then I should see the welcome screen
