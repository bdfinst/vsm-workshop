Feature: Replace native browser dialogs
  As a user
  I want inline confirmation popovers and toast notifications instead of native dialogs
  So that my experience feels modern and non-disruptive

  Background:
    Given I have a value stream map with steps

  Scenario: Delete step shows confirmation popover then cancels
    Given I am editing a step
    When I click the delete button
    Then a confirmation popover should appear
    When I click Cancel on the popover
    Then the step should still exist

  Scenario: Delete step shows confirmation popover then confirms
    Given I am editing a step
    When I click the delete button
    Then a confirmation popover should appear
    When I click Delete on the popover
    Then the step should be removed

  Scenario: File import error shows toast notification
    When I import an invalid file via the header
    Then a toast notification should appear with an error message
    And no native alert dialog should appear

  Scenario: New map shows confirmation popover
    When I click the New Map button
    Then a confirmation popover should appear
    When I click Cancel on the popover
    Then the current map should still exist
