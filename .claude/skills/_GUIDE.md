# Skills Guide - Which Skill to Use?

**Choose the right skill workflow for your task.**

---

## 🎯 Quick Decision Tree

```
What do you want to do?

├─ Create a new feature from scratch
│  └─> Use: /new-feature or skills/new-feature.md
│
├─ Implement an already-approved feature file
│  └─> Use: /implement-feature or skills/implement-feature.md
│
├─ Add a new React component
│  └─> Use: /new-component or skills/new-component.md
│
├─ Add a metrics calculation
│  └─> Use: /add-metric or skills/add-metric.md
│
├─ Add a new VSM step type
│  └─> Use: /new-process-step or skills/new-process-step.md
│
├─ Run or debug simulation
│  └─> Use: /run-simulation or skills/run-simulation.md
│
└─ Analyze code for security/quality issues
   └─> Use: /semgrep-analyze or skills/semgrep-analyze.md
```

---

## 📚 Available Skills

### 1. new-feature

**When to use:**
- Creating a brand new feature from scratch
- No feature file exists yet
- You need to write Gherkin scenarios first

**What it does:**
1. Helps you write a feature file
2. Guides feature file review process
3. Waits for approval
4. Creates step definitions
5. Implements feature (TDD)

**Prerequisites:**
- Understanding of feature requirements
- Familiarity with ATDD workflow

**Example tasks:**
- "Add export to PDF functionality"
- "Create bottleneck detection feature"
- "Build metrics comparison view"

---

### 2. implement-feature

**When to use:**
- Feature file already exists and is approved
- You're ready to write code
- Step definitions may or may not exist

**What it does:**
1. Reads approved feature file
2. Creates/updates step definitions
3. Runs tests (red phase)
4. Implements feature code
5. Refactors while keeping tests green

**Prerequisites:**
- Approved feature file exists
- Understanding of feature behavior

**Example tasks:**
- "Implement the export-to-pdf.feature"
- "Code the scenarios in bottleneck-detection.feature"

---

### 3. new-component

**When to use:**
- Adding a new React component
- Building UI elements
- Creating reusable components

**What it does:**
1. Creates component file
2. Adds PropTypes
3. Implements functionality
4. Adds styling
5. Creates unit tests
6. Adds to Storybook (if applicable)

**Prerequisites:**
- Component design/mockup (if complex)
- Understanding of component requirements

**Example tasks:**
- "Create a MetricCard component"
- "Build a StepSelector dropdown"
- "Add a ConfirmationDialog component"

---

### 4. add-metric

**When to use:**
- Adding a new metrics calculation
- Displaying new metrics in dashboard
- Creating derived values from VSM data

**What it does:**
1. Creates calculation function (test-first)
2. Writes unit tests
3. Adds to metrics dashboard
4. Updates useVsmMetrics hook
5. Adds documentation

**Prerequisites:**
- Understanding of metric formula
- Knowledge of VSM domain model

**Example tasks:**
- "Add cycle time calculation"
- "Calculate first pass yield"
- "Show average queue time"

---

### 5. new-process-step

**When to use:**
- Adding a new VSM step type
- Extending step type constants
- Adding step-specific styling

**What it does:**
1. Updates stepTypes.js
2. Updates StepNode component styling
3. Updates StepForm dropdown
4. Writes tests
5. Runs quality gates

**Prerequisites:**
- Understanding of VSM concepts
- Knowledge of step types

**Example tasks:**
- "Add 'Security Review' step type"
- "Create 'Deployment' step type"
- "Add 'Documentation' step type"

---

### 6. run-simulation

**When to use:**
- Running work flow simulations
- Debugging simulation logic
- Understanding simulation engine
- Testing different scenarios

**What it does:**
1. Guides simulation configuration
2. Runs simulation with specified parameters
3. Displays results and metrics
4. Helps interpret results
5. Suggests improvements

**Prerequisites:**
- VSM exists with steps and connections
- Understanding of simulation concepts

**Example tasks:**
- "Run simulation with 10 work items"
- "Simulate with resource contention"
- "Test bottleneck scenarios"

---

### 7. semgrep-analyze

**When to use:**
- Analyzing code for security vulnerabilities
- Finding code quality issues
- Auditing codebase before release
- Planning fixes for identified problems

**What it does:**
1. Checks/installs Semgrep
2. Runs analysis with appropriate rules
3. Documents all findings
4. Creates prioritized fix plan
5. Provides code fixes for each issue

**Prerequisites:**
- Python/pip available for installation
- Understanding of security concepts (helpful)

**Example tasks:**
- "Analyze code for security issues"
- "Run OWASP Top 10 audit"
- "Find and fix code quality problems"

---

## 🗺️ Task-Based Selection

### "I want to add..."

| What | Skill |
|------|-------|
| A new feature with behavior | **new-feature** |
| A calculation | **add-metric** |
| A UI component | **new-component** |
| A step type | **new-process-step** |

### "I need to..."

| What | Skill |
|------|-------|
| Write a feature file | **new-feature** |
| Implement approved scenarios | **implement-feature** |
| Build a form | **new-component** |
| Show a new metric | **add-metric** |
| Test work flow | **run-simulation** |
| Analyze code security | **semgrep-analyze** |

### "How do I..."

| What | Skill |
|------|-------|
| Create acceptance tests | **new-feature** |
| Add business logic | **implement-feature** or **add-metric** |
| Build UI | **new-component** |
| Visualize a metric | **add-metric** + **new-component** |
| Test scenarios | **run-simulation** |
| Find security issues | **semgrep-analyze** |

---

## 🔄 Workflow Combinations

### Feature with UI

1. Use **new-feature** to create feature file
2. Get approval
3. Use **new-component** for UI components
4. Use **implement-feature** to wire everything together

### Metric with Dashboard Card

1. Use **add-metric** for calculation
2. Use **new-component** for MetricCard
3. Wire together in MetricsDashboard

### New Step Type with Styling

1. Use **new-process-step** for step type
2. May need **new-component** if complex step node rendering

---

## 📖 Skill File Locations

All skill files are in `.claude/skills/`:

- `new-feature.md` - Feature creation workflow
- `implement-feature.md` - Feature implementation workflow
- `new-component.md` - Component creation workflow
- `add-metric.md` - Metric addition workflow
- `new-process-step.md` - Process step addition workflow
- `run-simulation.md` - Simulation running workflow
- `semgrep-analyze.md` - Security and code quality analysis

---

## 🎓 Learning Path

### Beginner (New to Project)

1. **Read first:**
   - [QUICK_START.md](../QUICK_START.md)
   - [rules/javascript-react.md](../rules/javascript-react.md)
   - [rules/atdd-workflow.md](../rules/atdd-workflow.md)

2. **Practice with:**
   - **new-process-step** (simplest)
   - **add-metric** (introduces calculations)
   - **new-component** (UI basics)

3. **Graduate to:**
   - **new-feature** (complete workflow)
   - **run-simulation** (system understanding)

### Intermediate

- Combine skills for complex features
- Write feature files independently
- Design component APIs

### Advanced

- Extend simulation engine
- Create new skill workflows
- Mentor others on ATDD

---

## 🚫 When NOT to Use Skills

Skills are workflows for common tasks. Don't use skills for:

- **Bug fixes** - Fix directly using TDD
- **Refactoring** - Refactor while keeping tests green
- **Documentation updates** - Edit docs directly
- **Configuration changes** - Update config files directly
- **Small tweaks** - Make change, run quality gates, commit

---

## 💡 Tips

### Before Starting Any Skill

1. Understand the requirement
2. Check if similar code exists
3. Read relevant rules files
4. Prepare test data (if needed)

### During Skill Execution

1. Follow the skill workflow in order
2. Don't skip steps (especially tests!)
3. Run quality gates frequently
4. Ask for clarification if stuck

### After Completing Skill

1. Run full quality gates
2. Manually test the feature
3. Update documentation
4. Commit with good message

---

## 🔗 Related Documentation

- [Main Index](../INDEX.md) - Documentation overview
- [Quick Start](../QUICK_START.md) - 5-minute onboarding
- [Rules Index](../rules/_INDEX.md) - Searchable rules
- [Workflows](../guides/workflows.md) - Common procedures
- [Pre-Commit Checklist](../checklists/pre-commit.md) - Before committing

---

## 📞 Help

**Still not sure which skill to use?**

1. Check the decision tree at the top
2. Read the "When to use" section for each skill
3. Ask yourself: "What is the PRIMARY thing I'm doing?"
4. Start with that skill
5. Combine skills if needed

**Need to create a custom workflow?**

Look at existing skill files as templates and create your own in `.claude/skills/`.

---

**Remember:** Skills are guides, not rigid requirements. Adapt as needed for your specific task.
