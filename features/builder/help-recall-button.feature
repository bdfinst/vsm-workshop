Feature: Help Recall Button
  As a user
  I want a help button in the sidebar that re-shows the guidance banner
  So that I can recall mapping instructions after dismissing them

  Scenario: Help button re-shows guidance banner
    Given I have a value stream map with steps
    And the guidance banner has been dismissed
    When I click the help button in the sidebar
    Then the guidance banner should reappear

  Scenario: Dismissing recalled guidance hides it again
    Given the guidance banner was re-shown via the help button
    When I dismiss the guidance banner
    Then the guidance banner should disappear
