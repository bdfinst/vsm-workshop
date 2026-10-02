Feature: Basic Metrics Dashboard
  As a team facilitator
  I want to see key metrics for my value stream
  So that I can understand our current performance

  Scenario: Display total lead time
    Given a value stream with steps:
      | name   | leadTime |
      | Dev    | 240      |
      | Test   | 120      |
      | Deploy | 60       |
    When I view the metrics dashboard
    Then total lead time should show "7h"

  Scenario: Display total process time
    Given a value stream with steps:
      | name   | processTime |
      | Dev    | 60          |
      | Test   | 30          |
      | Deploy | 15          |
    When I view the metrics dashboard
    Then total process time should show "1h 45m"

  Scenario: Display flow efficiency
    Given total process time is 100 minutes
    And total lead time is 400 minutes
    When I view the metrics dashboard
    Then flow efficiency should show "25.0%"

  Scenario: Color code flow efficiency - good
    Given flow efficiency is 30%
    Then the flow efficiency card should show good status

  Scenario: Color code flow efficiency - warning
    Given flow efficiency is 20%
    Then the flow efficiency card should show warning status

  Scenario: Color code flow efficiency - critical
    Given flow efficiency is 10%
    Then the flow efficiency card should show critical status

  Scenario: Empty value stream shows placeholder
    Given an empty value stream map
    When I view the metrics dashboard
    Then I should see a message to add steps
