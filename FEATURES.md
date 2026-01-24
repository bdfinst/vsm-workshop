# VSM Workshop - Feature Roadmap

## MVP (Minimum Viable Product)

The MVP enables a single user to create a basic value stream map, visualize it, and see key metrics. Target: A team can complete their first VSM in under 30 minutes.

---

## Feature Sequence

### Phase 1: MVP Foundation

#### 1.1 Project Setup
- [ ] Initialize Vite + React project
- [ ] Configure Tailwind CSS
- [ ] Set up Vitest and Cucumber.js
- [ ] Configure ESLint
- [ ] Configure Prettier (single quotes, no semicolons)
- [ ] Create base folder structure

#### 1.2 Create Empty VSM
**Feature File: `features/builder/create-vsm.feature`**
```gherkin
Feature: Create Value Stream Map
  As a team facilitator
  I want to create a new value stream map
  So that I can begin mapping our delivery process

  Scenario: Create a new empty VSM
    Given I am on the home page
    When I click "Create New Map"
    And I enter "Feature Delivery" as the map name
    Then I should see an empty canvas
    And the map name should display "Feature Delivery"

  Scenario: Auto-save map name
    Given I have created a map named "Feature Delivery"
    When I change the name to "Bug Fix Process"
    Then the map name should update to "Bug Fix Process"
```

#### 1.3 Add Process Step
**Feature File: `features/builder/add-step.feature`**
```gherkin
Feature: Add Process Step
  As a team facilitator
  I want to add process steps to my value stream
  So that I can represent each stage of our delivery process

  Scenario: Add a step with basic information
    Given I have an empty value stream map
    When I click "Add Step"
    And I enter "Development" as the step name
    And I enter 60 as the process time in minutes
    And I enter 240 as the lead time in minutes
    And I click "Save"
    Then I should see a step labeled "Development" on the canvas

  Scenario: Add multiple steps
    Given I have a value stream map with a "Development" step
    When I add a step named "Code Review"
    Then I should see 2 steps on the canvas

  Scenario: Validate lead time >= process time
    Given I am adding a new step
    When I enter process time of 120 minutes
    And I enter lead time of 60 minutes
    Then I should see an error "Lead time must be >= process time"
```

#### 1.4 Edit Process Step
**Feature File: `features/builder/edit-step.feature`**
```gherkin
Feature: Edit Process Step
  As a team facilitator
  I want to edit process step details
  So that I can refine our metrics as we learn more

  Scenario: Edit step name
    Given I have a step named "Development"
    When I click on the step
    And I change the name to "Backend Development"
    And I save the changes
    Then the step should display "Backend Development"

  Scenario: Edit step metrics
    Given I have a step with process time 60 and lead time 240
    When I edit the step
    And I change process time to 90
    And I change lead time to 300
    Then the step should show PT: 90m and LT: 300m

  Scenario: Edit percent complete and accurate
    Given I have a step with %C&A of 100
    When I edit the step
    And I change %C&A to 85
    Then the step should show %C&A: 85%
```

#### 1.5 Delete Process Step
**Feature File: `features/builder/delete-step.feature`**
```gherkin
Feature: Delete Process Step
  As a team facilitator
  I want to remove process steps
  So that I can correct mistakes in my map

  Scenario: Delete a step
    Given I have a value stream map with steps "Dev" and "Test"
    When I select the "Dev" step
    And I click "Delete"
    And I confirm the deletion
    Then the canvas should only show "Test"

  Scenario: Cancel deletion
    Given I have a step named "Development"
    When I click delete on the step
    And I cancel the confirmation
    Then the step should still exist
```

#### 1.6 Connect Steps
**Feature File: `features/builder/connect-steps.feature`**
```gherkin
Feature: Connect Process Steps
  As a team facilitator
  I want to connect steps to show workflow
  So that I can visualize how work flows through our process

  Scenario: Connect two steps
    Given I have steps "Development" and "Testing"
    When I drag from the output of "Development"
    And I drop on the input of "Testing"
    Then a connection should appear between the steps

  Scenario: Remove a connection
    Given "Development" is connected to "Testing"
    When I click on the connection
    And I click "Delete"
    Then the connection should be removed
```

#### 1.7 Canvas Visualization
**Feature File: `features/visualization/canvas-display.feature`**
```gherkin
Feature: Canvas Visualization
  As a team facilitator
  I want to see my value stream as a visual diagram
  So that I can understand the flow at a glance

  Scenario: Display steps left to right
    Given I have steps in order: "Plan", "Dev", "Test", "Deploy"
    Then the canvas should show steps arranged left to right

  Scenario: Pan and zoom canvas
    Given I have a value stream map with 10 steps
    When I use the mouse wheel to zoom out
    Then I should see more of the canvas
    When I drag the canvas
    Then the view should pan

  Scenario: Auto-layout steps
    Given I have 5 unpositioned steps
    When I click "Auto Layout"
    Then the steps should arrange in a readable flow
```

#### 1.8 Basic Metrics Dashboard
**Feature File: `features/visualization/basic-metrics.feature`**
```gherkin
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
    Then total lead time should show "420 minutes" or "7h"

  Scenario: Display total process time
    Given a value stream with steps:
      | name   | processTime |
      | Dev    | 60          |
      | Test   | 30          |
      | Deploy | 15          |
    When I view the metrics dashboard
    Then total process time should show "105 minutes" or "1h 45m"

  Scenario: Display flow efficiency
    Given total process time is 100 minutes
    And total lead time is 400 minutes
    When I view the metrics dashboard
    Then flow efficiency should show "25%"

  Scenario: Color code flow efficiency
    Given flow efficiency is 10%
    Then the flow efficiency card should show critical status
    Given flow efficiency is 20%
    Then the flow efficiency card should show warning status
    Given flow efficiency is 30%
    Then the flow efficiency card should show good status
```

#### 1.9 Save and Load Map
**Feature File: `features/data/save-load.feature`**
```gherkin
Feature: Save and Load Map
  As a team facilitator
  I want to save my value stream map
  So that I can continue working on it later

  Scenario: Auto-save to browser storage
    Given I have created a value stream map
    When I add a step
    Then the map should be automatically saved

  Scenario: Load map on page refresh
    Given I have saved a map with 3 steps
    When I refresh the page
    Then I should see my map with 3 steps

  Scenario: Export map as JSON
    Given I have a completed value stream map
    When I click "Export"
    And I select "JSON"
    Then a JSON file should download

  Scenario: Import map from JSON
    Given I have a JSON file of a value stream map
    When I click "Import"
    And I select the JSON file
    Then the map should load on the canvas
```

#### 1.10 Export Map as Image
**Feature File: `features/data/export-image.feature`**
```gherkin
Feature: Export Map as Image
  As a team facilitator
  I want to export my map as an image
  So that I can share it in presentations and documents

  Scenario: Export as PNG
    Given I have a completed value stream map
    When I click "Export"
    And I select "PNG Image"
    Then a PNG file should download
    And it should contain the full map

  Scenario: Export as PDF
    Given I have a completed value stream map
    When I click "Export"
    And I select "PDF"
    Then a PDF file should download
```

---

### Phase 2: Enhanced Mapping

#### 2.1 Step Templates
**Feature File: `features/builder/step-templates.feature`**
```gherkin
Feature: Step Templates
  As a team facilitator
  I want to use pre-defined step templates
  So that I can quickly build common process patterns

  Scenario: Use software delivery template
    Given I am creating a new map
    When I select "Software Delivery" template
    Then my canvas should have steps: "Backlog", "Development", "Code Review", "Testing", "Deployment"

  Scenario: Add step from template library
    Given I am editing my map
    When I open the step template library
    And I select "QA Gate"
    Then a QA Gate step should be added with default metrics
```

#### 2.2 Rework Loops
**Feature File: `features/builder/rework-loops.feature`**
```gherkin
Feature: Rework Loops
  As a team facilitator
  I want to map rework loops
  So that I can visualize work that returns to earlier steps

  Scenario: Add rework connection
    Given I have steps "Development" and "Testing" connected
    When I create a connection from "Testing" back to "Development"
    And I mark it as a "Rework" connection
    And I set rework rate to 20%
    Then I should see a dashed arrow from Testing to Development
    And it should display "20% rework"

  Scenario: Calculate rework impact on metrics
    Given a value stream with 20% rework from Testing to Development
    When I view the metrics dashboard
    Then I should see "Rework Rate: 20%"
    And effective lead time should account for rework iterations
```

#### 2.3 Queue Visualization
**Feature File: `features/visualization/queue-display.feature`**
```gherkin
Feature: Queue Visualization
  As a team facilitator
  I want to see queue sizes between steps
  So that I can identify where work piles up

  Scenario: Display queue between steps
    Given "Development" has a queue size of 5
    When I view the canvas
    Then I should see "5" displayed before the Development step

  Scenario: Highlight large queues
    Given a step with queue size of 10
    And another step with queue size of 2
    Then the step with queue 10 should be highlighted as a bottleneck
```

#### 2.4 Batch Size Display
**Feature File: `features/visualization/batch-size.feature`**
```gherkin
Feature: Batch Size Display
  As a team facilitator
  I want to see batch sizes for each step
  So that I can identify batch processing delays

  Scenario: Display batch size on step
    Given a "Deployment" step with batch size of 5
    When I view the canvas
    Then the step should show "Batch: 5"

  Scenario: Highlight large batches
    Given a step with batch size greater than 1
    Then the step should indicate batching occurs
```

#### 2.5 Additional Metrics
**Feature File: `features/visualization/advanced-metrics.feature`**
```gherkin
Feature: Advanced Metrics
  As a team facilitator
  I want to see additional performance metrics
  So that I can better understand our delivery performance

  Scenario: Display first pass yield
    Given steps with %C&A of 90%, 95%, and 85%
    When I view the metrics dashboard
    Then first pass yield should show "73%"

  Scenario: Display activity ratio
    Given total process time of 100 minutes
    And 3 steps in the value stream
    When I view the metrics dashboard
    Then average process time per step should show "33 minutes"
```

---

### Phase 3: Simulation

#### 3.1 Basic Flow Simulation
**Feature File: `features/simulation/basic-flow.feature`**
```gherkin
Feature: Basic Flow Simulation
  As a team facilitator
  I want to simulate work flowing through the value stream
  So that I can see how items move through our process

  Scenario: Run flow simulation
    Given a value stream with 4 steps
    When I click "Run Simulation"
    And I set work items to 10
    Then I should see animated dots moving through the steps
    And completed items should accumulate at the end

  Scenario: Control simulation speed
    Given a running simulation
    When I adjust the speed slider
    Then the animation should speed up or slow down

  Scenario: Pause and resume simulation
    Given a running simulation
    When I click "Pause"
    Then the simulation should freeze
    When I click "Resume"
    Then the simulation should continue
```

#### 3.2 Bottleneck Detection
**Feature File: `features/simulation/bottleneck-detection.feature`**
```gherkin
Feature: Bottleneck Detection
  As a team facilitator
  I want to identify bottlenecks during simulation
  So that I can see where work queues up

  Scenario: Highlight bottleneck during simulation
    Given a step that takes twice as long as others
    When I run the simulation
    Then work should queue up before that step
    And the step should be highlighted as a bottleneck

  Scenario: Show queue buildup over time
    Given a completed simulation
    When I view the results
    Then I should see a chart of queue sizes over time
    And the bottleneck step should have the highest peak
```

#### 3.3 What-If Scenarios
**Feature File: `features/simulation/what-if.feature`**
```gherkin
Feature: What-If Scenarios
  As a team facilitator
  I want to test different scenarios
  So that I can see the impact of potential improvements

  Scenario: Compare batch size changes
    Given a value stream with batch size 5 at deployment
    When I create a scenario with batch size 1
    And I run both simulations
    Then I should see side-by-side comparison
    And the smaller batch should show lower lead time

  Scenario: Test adding capacity
    Given a bottleneck step with 1 worker
    When I create a scenario with 2 workers
    And I run both simulations
    Then I should see improved throughput in the 2-worker scenario
```

---

### Phase 4: Analysis & Recommendations

#### 4.1 Improvement Suggestions
**Feature File: `features/analysis/improvement-suggestions.feature`**
```gherkin
Feature: Improvement Suggestions
  As a team facilitator
  I want to receive improvement suggestions
  So that I know where to focus our efforts

  Scenario: Suggest reducing batch sizes
    Given a step with batch size greater than 1
    And it causes significant lead time
    Then I should see a suggestion to reduce batch size
    And it should explain the expected improvement

  Scenario: Suggest automation for manual gates
    Given a manual approval gate with high wait time
    Then I should see a suggestion to automate the gate

  Scenario: Identify high rework areas
    Given a rework loop with rate above 15%
    Then I should see a suggestion to improve quality upstream
```

#### 4.2 Constraint Identification
**Feature File: `features/analysis/constraint-identification.feature`**
```gherkin
Feature: Constraint Identification
  As a team facilitator
  I want to identify the system constraint
  So that I can apply Theory of Constraints principles

  Scenario: Identify primary constraint
    Given a value stream with varying step capacities
    When I view the analysis
    Then the constraint step should be clearly marked
    And I should see an explanation of why it's the constraint

  Scenario: Show constraint impact
    Given an identified constraint
    Then I should see how much improving this step would help
    And I should see that improving other steps won't help throughput
```

---

### Phase 5: Collaboration (Future)

#### 5.1 Multi-User Editing
#### 5.2 Comments and Discussion
#### 5.3 Version History
#### 5.4 Team Workspaces

---

### Phase 6: Integrations (Future)

#### 6.1 Jira Integration
#### 6.2 GitHub Integration
#### 6.3 API for Custom Integrations

---

## MVP Definition Summary

**In Scope for MVP:**
- Create, edit, delete value stream maps
- Add, edit, delete, connect process steps
- Basic step properties: name, process time, lead time, %C&A
- Canvas visualization with React Flow
- Pan, zoom, auto-layout
- Basic metrics: total lead time, total process time, flow efficiency
- Save/load from browser storage
- Export as JSON, PNG, PDF

**Out of Scope for MVP:**
- Rework loops
- Queue and batch visualization
- Simulation
- What-if scenarios
- Improvement suggestions
- Multi-user collaboration
- External integrations

**MVP Success Criteria:**
- Team can create a complete VSM in under 30 minutes
- Flow efficiency is calculated and displayed correctly
- Map can be saved, loaded, and exported
- Works on modern desktop browsers (Chrome, Firefox, Safari, Edge)
