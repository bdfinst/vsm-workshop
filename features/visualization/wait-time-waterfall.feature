Feature: Wait-Time Waterfall
  As a team facilitator
  I want to see how much of each step's lead time is spent waiting
  So that I can find the hidden queues and handoffs that slow delivery

  Scenario: Empty stream prompts to add steps
    Given an empty value stream map
    When I view the wait-time waterfall
    Then I see a message to add steps for the waterfall

  Scenario: Splits a step into value-add and wait time
    Given a value stream with steps:
      | name | processTime | leadTime |
      | Dev  | 60          | 240      |
    When I view the wait-time waterfall
    Then the wait-time waterfall shows "Dev" as 75% waiting

  Scenario: Flags a wait-dominated step as a hidden queue
    Given a value stream with steps:
      | name   | processTime | leadTime |
      | Review | 10          | 200      |
    When I view the wait-time waterfall
    Then "Review" is flagged as a hidden queue

  Scenario: Does not flag a value-add-dominated step
    Given a value stream with steps:
      | name | processTime | leadTime |
      | Dev  | 180         | 200      |
    When I view the wait-time waterfall
    Then "Dev" is not flagged as a hidden queue

  Scenario: Flags a manual step as a handoff
    Given a manual approval step "Sign-off" with process time 5 and lead time 480
    When I view the wait-time waterfall
    Then "Sign-off" is flagged as a handoff

  Scenario: Summarises the overall wait percentage
    Given a value stream with steps:
      | name | processTime | leadTime |
      | Dev  | 60          | 240      |
      | Test | 40          | 160      |
    When I view the wait-time waterfall
    Then the wait-time summary shows 75% waiting
