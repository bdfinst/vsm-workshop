Feature: Confirmation Popover
  As a user
  I want to see an inline confirmation popover instead of browser confirm dialogs
  So that destructive actions feel integrated and non-disruptive

  Scenario: Popover appears for destructive actions
    Given I am editing a step
    When I click the delete button
    Then a confirmation popover should appear near the button
    And the popover should display a confirmation message

  Scenario: Cancel preserves the item
    Given a confirmation popover is visible
    When I click Cancel
    Then the popover should close
    And the item should not be deleted

  Scenario: Confirm deletes the item
    Given a confirmation popover is visible
    When I click Confirm
    Then the item should be deleted
    And the popover should close
