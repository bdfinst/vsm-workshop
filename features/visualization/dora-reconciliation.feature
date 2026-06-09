Feature: DORA Reconciliation
  As a team facilitator running a Phase 0 assessment
  I want to record our DORA metrics and compare actual lead time to the map
  So that I can find the hidden queue the value stream does not yet show

  Scenario: Reconciliation is unknown until an actual lead time is recorded
    Given a value stream with steps:
      | name | leadTime |
      | Dev  | 480      |
    When I view the DORA panel
    Then the lead-time reconciliation status is "unknown"

  Scenario: A much larger actual lead time reveals a hidden queue
    Given a value stream with steps:
      | name | leadTime |
      | Dev  | 480      |
    When I record an actual lead time for changes of 4800 minutes
    Then the lead-time reconciliation status is "hidden-queue"
    And the lead-time reconciliation shows a hidden queue of 4320 minutes

  Scenario: A close actual lead time is aligned
    Given a value stream with steps:
      | name | leadTime |
      | Dev  | 1000     |
    When I record an actual lead time for changes of 1100 minutes
    Then the lead-time reconciliation status is "aligned"

  Scenario: Classifies elite performance
    Given an empty value stream map
    When I record the following DORA metrics:
      | deploymentFrequencyPerDay | 5   |
      | leadTimeForChangesMinutes | 600 |
      | changeFailureRatePct      | 10  |
      | mttrMinutes               | 30  |
    Then the "leadTimeForChanges" DORA metric is rated "elite"
    And the "changeFailureRate" DORA metric is rated "elite"

  Scenario: DORA metrics survive save and reload
    Given a value stream with steps:
      | name | leadTime |
      | Dev  | 480      |
    And I record an actual lead time for changes of 4800 minutes
    When the map is saved and reloaded
    Then the lead-time reconciliation shows a hidden queue of 4320 minutes
