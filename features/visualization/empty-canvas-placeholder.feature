Feature: Empty canvas placeholder
  As a user
  I want to see a helpful placeholder on an empty canvas
  So that I know how to get started with mapping

  Scenario: Show placeholder on empty canvas instead of guidance banner
    Given I have created a new blank map
    And the canvas has no steps
    Then I should see an empty canvas placeholder
    And I should not see the guidance banner
    And the placeholder should contain "Add your first step"

  Scenario: Hide placeholder after adding a step
    Given I have created a new blank map
    And I can see the empty canvas placeholder
    When I add a step to the map
    Then the empty canvas placeholder should be hidden

  Scenario: Show guidance banner only when force-shown
    Given I have created a new blank map with no steps
    When guidance has not been dismissed
    Then the placeholder should be shown instead of the banner
