Feature: Canvas Visualization
  As a team facilitator
  I want to see my value stream as a visual diagram
  So that I can understand the flow at a glance

  Scenario: Display steps on canvas
    Given I have steps "Plan", "Dev", "Test", "Deploy"
    Then each step should be visible on the canvas
    And each step should show its metrics

  # Scenario: Pan the canvas
  #   Given I have a value stream map
  #   When I drag the canvas background
  #   Then the view should pan

  # Scenario: Zoom the canvas
  #   Given I have a value stream map
  #   When I use the mouse wheel to zoom
  #   Then the canvas should zoom in or out

  # Scenario: Use canvas controls
  #   Given I have a value stream map
  #   When I click the zoom in button
  #   Then the canvas should zoom in
  #   When I click the fit view button
  #   Then all steps should be visible

  Scenario: Select a step
    Given I have a step on the canvas
    When I click on the step
    Then the step should be highlighted as selected
