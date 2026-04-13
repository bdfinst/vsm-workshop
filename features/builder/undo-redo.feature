Feature: Undo and redo value stream map changes
  As a VSM practitioner
  I want to undo and redo changes to my value stream map
  So that I can experiment freely and recover from mistakes

  Background:
    Given I have a value stream map named "Test Map"

  Scenario: Undo adding a step
    Given the map has no steps
    When I add a step named "Development"
    And I undo the last change
    Then the map should have no steps

  Scenario: Redo after undoing a step addition
    Given the map has no steps
    When I add a step named "Development"
    And I undo the last change
    And I redo the last undone change
    Then the map should have 1 step

  Scenario: Undo deleting a step
    Given the map has a step named "Development"
    When I delete the step "Development"
    And I undo the last change
    Then the map should have a step named "Development"

  Scenario: Undo updating a step
    Given the map has a step named "Development" with process time 60
    When I update step "Development" process time to 120
    And I undo the last change
    Then step "Development" should have process time 60

  Scenario: Undo adding a connection
    Given the map has steps "Development" and "Testing"
    And a forward connection from "Development" to "Testing"
    When I undo the last change
    Then there should be no connections

  Scenario: Undo deleting a connection
    Given the map has steps "Development" and "Testing"
    And a forward connection from "Development" to "Testing"
    When I delete the connection from "Development" to "Testing"
    And I undo the last change
    Then there should be a connection from "Development" to "Testing"

  Scenario: Undo updating a connection
    Given the map has steps "Development" and "Testing"
    And a rework connection from "Testing" to "Development" with rate 15
    When I update the connection rework rate to 25
    And I undo the last change
    Then the connection rework rate should be 15

  Scenario: Redo stack clears on new mutation after undo
    Given the map has no steps
    When I add a step named "Development"
    And I undo the last change
    And I add a step named "Testing"
    Then redo should not be available

  Scenario: Keyboard shortcut Ctrl+Z triggers undo
    Given the map has a step named "Development"
    When I press Ctrl+Z
    Then the map should have no steps

  Scenario: Keyboard shortcut Ctrl+Shift+Z triggers redo
    Given the map has a step named "Development"
    When I press Ctrl+Z
    And I press Ctrl+Shift+Z
    Then the map should have 1 step

  Scenario: Maximum undo depth is 20
    Given I have made 25 changes to the map
    Then the undo stack should have at most 20 entries
