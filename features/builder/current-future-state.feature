Feature: Current vs Future State
  As a team facilitator
  I want to capture a baseline and compare an improved map against it
  So that I can quantify the projected improvement of my future state

  Background:
    Given a value stream with steps:
      | name | processTime | leadTime |
      | Dev  | 60          | 600      |

  Scenario: No comparison until a baseline is captured
    When I view the state comparison
    Then there is no state comparison

  Scenario: Reducing wait time shows an improved lead time
    When I capture the current state as the baseline
    And I reduce the lead time of "Dev" to 300
    Then the future-state total lead time delta is -300 minutes
    And the future-state total lead time is improved

  Scenario: The captured baseline survives save and reload
    When I capture the current state as the baseline
    And I reduce the lead time of "Dev" to 300
    And the map is saved and reloaded
    Then the future-state total lead time delta is -300 minutes
