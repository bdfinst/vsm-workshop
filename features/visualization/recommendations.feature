Feature: Constraint Recommendations
  As a team facilitator
  I want prescriptive countermeasures for the problems in my value stream
  So that I know what to improve first

  Scenario: A healthy stream yields no recommendations
    Given a healthy value stream with an automated deployment
    When I view the recommendations
    Then there are no recommendations

  Scenario: A long lead time produces a work-decomposition countermeasure
    Given a value stream with steps:
      | name        | processTime | leadTime |
      | Development  | 120         | 1200     |
    When I view the recommendations
    Then there is a recommendation for "work-decomposition"
    And the recommendation for "work-decomposition" deep-links to the practice guide

  Scenario: The constraint is recommended first
    Given a value stream with steps:
      | name   | processTime | leadTime | queueSize |
      | Intake | 30          | 1200     | 2         |
      | Build  | 60          | 240      | 2         |
      | Review | 30          | 480      | 25        |
    When I view the recommendations
    Then the first recommendation is for "wip-limits"
    And the recommendation for "wip-limits" is marked as a constraint
