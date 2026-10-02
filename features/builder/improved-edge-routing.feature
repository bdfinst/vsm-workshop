Feature: Clear edge routing without node overlap
  As a value stream mapping practitioner
  I want connection lines that route clearly around process steps
  So that I can read the map without visual clutter

  Scenario: Forward edges route without crossing nodes
    Given a value stream with steps "Dev", "Test", "Deploy" in sequence
    When I view the canvas
    Then the forward connection lines should not visually overlap any step nodes

  Scenario: Rework edges route above or below nodes
    Given a value stream with steps "Dev", "Test", "Deploy"
    And a rework connection from "Test" back to "Dev"
    When I view the canvas
    Then the rework line should route around the nodes between source and target

  Scenario: Multiple rework loops do not overlap each other
    Given a value stream with steps "Dev", "Code Review", "Test", "Deploy"
    And a rework connection from "Code Review" back to "Dev"
    And a rework connection from "Deploy" back to "Test"
    When I view the canvas
    Then each rework line should be visually distinct and not overlap the other

  Scenario: Edge labels remain readable
    Given a value stream with a rework connection showing "15% rework"
    When I view the canvas
    Then the rework label should not overlap any step node
