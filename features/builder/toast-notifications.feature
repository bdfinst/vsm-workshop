Feature: Toast Notifications
  As a user
  I want to see non-blocking toast notifications instead of browser alerts
  So that my workflow is not interrupted by modal dialogs

  Scenario: Error notification appears for invalid file import
    Given I have a value stream map
    When I import an invalid file
    Then a toast notification should appear with an error message
    And the toast should have a dismiss button

  Scenario: Info notification auto-dismisses
    Given I have a value stream map
    When an info notification is triggered
    Then the notification should automatically disappear after a timeout

  Scenario: Multiple notifications stack vertically
    Given I have a value stream map
    When multiple notifications are triggered
    Then the notifications should stack vertically in the bottom-right
