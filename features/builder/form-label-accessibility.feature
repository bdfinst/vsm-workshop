Feature: Form label accessibility
  As a user who relies on assistive technology
  I want all form controls to have associated labels
  So that screen readers can announce what each input is for

  Background:
    Given I have a value stream map with at least one step

  Scenario: Step editor form controls have associated labels
    When I open the step editor
    Then every form control in the step editor should have a label with a matching "for" attribute

  Scenario: Connection editor form controls have associated labels
    Given the map has at least two connected steps
    When I open the connection editor
    Then every form control in the connection editor should have a label with a matching "for" attribute
