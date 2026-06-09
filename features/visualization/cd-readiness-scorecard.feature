Feature: CD Readiness Scorecard
  As a team facilitator running a Phase 0 assessment
  I want the value stream map to auto-score our MinimumCD readiness
  So that I can find delivery constraints without filling in a checklist by hand

  Scenario: Lists all thirteen items in two groups for a non-empty map
    Given a value stream with readiness steps
    When I open the CD readiness scorecard
    Then the scorecard shows a "MinimumCD Core Practices" group with 9 items
    And the scorecard shows a "Flow Readiness Signals" group with 4 items

  Scenario: Empty map prompts to add steps
    Given an empty value stream map
    When I open the CD readiness scorecard
    Then I see a message to add steps before assessing readiness

  Scenario: A gap is shown against its item and pinned step
    Given a value stream whose "Development" step has a lead time of 1200 minutes
    When I open the CD readiness scorecard
    Then the "Work Decomposition" item shows a gap
    And the "Work Decomposition" item names the "Development" step

  Scenario: Status is conveyed by text, not color alone
    Given a value stream whose "Development" step has a lead time of 1200 minutes
    When I open the CD readiness scorecard
    Then the "Work Decomposition" item shows the status text "gap"

  Scenario: Gaps are ordered before met items within a group
    Given a value stream whose "Development" step has a lead time of 1200 minutes and a process time of 600 minutes
    When I open the CD readiness scorecard
    Then within the "Flow Readiness Signals" group the gap items appear before the met items

  Scenario: Practices without a signal are shown as needs review
    Given a value stream with readiness steps
    When I open the CD readiness scorecard
    Then the "Trunk-Based Development" item shows the status text "needs review"

  Scenario: The scorecard frames findings by practice, not by phase
    Given a value stream whose "Development" step has a lead time of 1200 minutes
    When I open the CD readiness scorecard
    Then the scorecard mentions no migration phase
