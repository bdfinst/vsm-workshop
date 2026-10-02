Feature: Export Map as Image
  As a team facilitator
  I want to export my map as an image
  So that I can share it in presentations and documents

  Scenario: Export as PNG
    Given I have a completed value stream map
    When I click "Export"
    And I select "Export as PNG"
    Then a PNG file should download

  Scenario: Export as PDF
    Given I have a completed value stream map
    When I click "Export"
    And I select "Export as PDF"
    Then a PDF file should download
