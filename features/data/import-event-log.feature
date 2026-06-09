Feature: Import Current State from an Event Log
  As a team facilitator
  I want to import a real event log from my tooling
  So that the value stream is measured from actual timestamps, not guesses

  Scenario: Import a CSV event log into a value stream
    Given the following CSV event log:
      | workItemId | stage | enteredAt            | exitedAt             |
      | 1          | Dev   | 2026-01-01T09:00:00Z | 2026-01-01T10:00:00Z |
      | 1          | Test  | 2026-01-01T10:00:00Z | 2026-01-01T10:30:00Z |
      | 2          | Dev   | 2026-01-01T09:00:00Z | 2026-01-01T11:00:00Z |
      | 2          | Test  | 2026-01-01T11:00:00Z | 2026-01-01T11:30:00Z |
    When I import the event log as "csv"
    Then the imported map has steps "Dev, Test"
    And the "Test" step is a testing step

  Scenario: Rework in the event log becomes a rework connection
    Given the following CSV event log:
      | workItemId | stage | enteredAt            | exitedAt             |
      | 1          | Dev   | 2026-01-01T09:00:00Z | 2026-01-01T10:00:00Z |
      | 1          | Test  | 2026-01-01T10:00:00Z | 2026-01-01T10:30:00Z |
      | 1          | Dev   | 2026-01-01T10:30:00Z | 2026-01-01T11:00:00Z |
      | 2          | Dev   | 2026-01-01T09:00:00Z | 2026-01-01T10:00:00Z |
      | 2          | Test  | 2026-01-01T10:00:00Z | 2026-01-01T10:30:00Z |
    When I import the event log as "csv"
    Then the imported map has a rework connection

  Scenario: An empty event log is rejected
    Given the following CSV event log:
      | workItemId | stage | enteredAt |
    When I import the event log as "csv"
    Then the import is rejected
