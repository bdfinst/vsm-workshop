Feature: Welcome screen template card improvements
  As a user
  I want template cards to show step counts and be visually distinct
  So that I can quickly understand what each template offers

  Scenario: Template cards display step count badges
    Given I am on the welcome screen
    Then each template card should show the number of steps it contains
    And the step count should be displayed as a badge

  Scenario: Template cards use distinct colors
    Given I am on the welcome screen
    Then the template cards should use visually distinct colors
    And each template should be distinguishable at a glance
