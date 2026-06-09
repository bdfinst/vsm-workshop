Feature: Kaizen-Burst Annotations
  As a team facilitator
  I want to tag improvement opportunities on steps and edges
  So that the value stream rolls up into a prioritized improvement backlog

  Background:
    Given a value stream with steps:
      | name   | leadTime |
      | Dev    | 240      |
      | Review | 480      |

  Scenario: Annotate a step with a waste type
    When I annotate the "Review" step with "waiting" waste noted "Long approval queue"
    Then the improvement backlog has 1 kaizen burst
    And the backlog has 1 "waiting" annotation

  Scenario: Roll up annotations by waste type
    When I annotate the "Review" step with "waiting" waste noted "queue"
    And I annotate the "Dev" step with "waiting" waste noted "blocked"
    And I annotate the "Review" step with "rework" waste noted "bounces back"
    Then the backlog has 2 "waiting" annotations
    And the backlog has 1 "rework" annotation

  Scenario: Remove an annotation from the backlog
    When I annotate the "Review" step with "handoff" waste noted "manual"
    And I remove that annotation
    Then the improvement backlog has 0 kaizen bursts

  Scenario: Deleting a step prunes its annotations
    When I annotate the "Review" step with "waiting" waste noted "queue"
    And I delete the "Review" step
    Then the improvement backlog has 0 kaizen bursts

  Scenario: Annotations survive save and reload
    When I annotate the "Review" step with "waiting" waste noted "queue"
    And the map is saved and reloaded
    Then the improvement backlog has 1 kaizen burst
