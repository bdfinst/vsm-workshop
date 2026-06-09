Feature: Mark a step as automated or manual
  As a team facilitator
  I want to record whether a step is automated
  So that the CD readiness scorecard can tell whether there is a single automated path to production

  Scenario: New steps default to automated
    Given I have an empty value stream map
    When I add a step named "Build"
    Then the step "Build" is automated

  Scenario: Marking a deploy step as manual and saving persists the choice
    Given a deployment step "Prod Deploy"
    When I open the step editor for "Prod Deploy"
    And I mark the step as not automated
    And I save the step
    Then the step "Prod Deploy" is not automated

  Scenario: The automated flag survives save and reload
    Given a value stream with a manual deployment step "Prod Deploy"
    When the map is saved and reloaded
    Then the step "Prod Deploy" is not automated

  Scenario: A step with no automated property loads as automated
    Given a saved map whose step "Legacy" has no automated property
    When the map is loaded
    Then the step "Legacy" is automated

  Scenario: The automated flag survives export and import
    Given a value stream with a manual deployment step "Prod Deploy"
    When the map is exported and re-imported
    Then the step "Prod Deploy" is not automated
