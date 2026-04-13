Feature: Keyboard shortcuts overlay
  As a user
  I want to see available keyboard shortcuts
  So that I can work more efficiently

  Scenario: Open keyboard shortcuts overlay with ? key
    Given I have a value stream map open
    When I press the "?" key
    Then I should see the keyboard shortcuts overlay
    And it should list "Delete/Backspace" for removing selected step
    And it should list "?" for showing the overlay

  Scenario: Close keyboard shortcuts overlay with Escape
    Given the keyboard shortcuts overlay is open
    When I press the "Escape" key
    Then the keyboard shortcuts overlay should close

  Scenario: Do not open overlay when typing in input
    Given I am focused on a text input field
    When I press the "?" key
    Then the keyboard shortcuts overlay should not appear
