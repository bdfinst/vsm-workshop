# Project Structure Guide

**Directory layout and file organization for VSM Workshop.**

---

## Complete Directory Tree

```
vsm-workshop/
├── .claude/                 # Claude development configuration
│   ├── INDEX.md             # Main entry point
│   ├── QUICK_START.md       # 5-minute onboarding
│   ├── rules/               # Core development rules
│   ├── guides/              # Deep-dive guides (this file)
│   ├── examples/            # Code pattern examples
│   ├── checklists/          # Quick reference checklists
│   └── skills/              # Task-specific workflows
│
├── src/                     # Application source code
│   ├── components/          # React components
│   │   ├── builder/         # VSM builder wizard components
│   │   ├── canvas/          # React Flow canvas and nodes
│   │   │   ├── nodes/       # Custom node types (StepNode, QueueNode, etc.)
│   │   │   └── edges/       # Custom edge types (ForwardEdge, ReworkEdge)
│   │   ├── metrics/         # Metrics dashboard components
│   │   ├── simulation/      # Work flow simulation components
│   │   └── ui/              # Shared UI components (buttons, inputs, etc.)
│   ├── hooks/               # Custom React hooks (useSimulation, useVsmMetrics)
│   ├── stores/              # Zustand stores (vsmStore, simulationStore)
│   ├── utils/               # Utility functions
│   │   ├── calculations/    # Metrics calculations (flowEfficiency, etc.)
│   │   ├── simulation/      # Simulation logic (simulationEngine.js)
│   │   ├── validation/      # Validation utilities
│   │   └── export/          # Export utilities (PDF, image, JSON)
│   ├── models/              # Domain models (factory functions)
│   ├── infrastructure/      # Infrastructure concerns (repositories)
│   ├── services/            # Service layer (business logic)
│   ├── data/                # Static data (templates, examples, step types)
│   └── App.jsx              # Root component
│
├── features/                # Gherkin feature files (BDD/ATDD)
│   ├── builder/             # VSM builder features
│   ├── data/                # Data management features
│   ├── simulation/          # Simulation features
│   ├── visualization/       # Map display features
│   └── step-definitions/    # Cucumber step definitions
│       └── helpers/         # Step definition helpers
│
├── tests/                   # Test files
│   ├── unit/                # Unit tests (Vitest)
│   │   ├── calculations/    # Calculation tests
│   │   ├── simulation/      # Simulation tests
│   │   ├── stores/          # Store tests
│   │   └── components/      # Component tests
│   └── e2e/                 # End-to-end tests (Playwright)
│
├── public/                  # Static assets
├── dist/                    # Production build output (generated)
├── node_modules/            # Dependencies (generated)
│
├── package.json             # Project metadata and scripts
├── pnpm-lock.yaml           # Lock file
├── vite.config.js           # Vite configuration
├── vitest.config.js         # Vitest configuration
├── playwright.config.js     # Playwright configuration
├── cucumber.js              # Cucumber configuration
├── .eslintrc.json           # ESLint configuration
├── .prettierrc              # Prettier configuration
├── .gitignore               # Git ignore rules
└── README.md                # User-facing project documentation
```

---

## Source Code Organization (`src/`)

### Components (`src/components/`)

React components organized by feature domain:

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `builder/` | VSM builder wizard | `StepForm.jsx`, `ConnectionForm.jsx`, `ValidationSummary.jsx` |
| `canvas/` | React Flow diagram | `VSMCanvas.jsx`, `nodes/`, `edges/` |
| `metrics/` | Metrics dashboard | `MetricsDashboard.jsx`, `FlowEfficiencyCard.jsx` |
| `simulation/` | Simulation UI | `SimulationControls.jsx`, `SimulationVisualizer.jsx` |
| `ui/` | Shared UI components | `Button.jsx`, `Input.jsx`, `Modal.jsx` |

**Component naming convention:**
- PascalCase for component files (`StepForm.jsx`)
- Components should be default exports
- PropTypes required on all components

### Hooks (`src/hooks/`)

Custom React hooks for shared logic:

| Hook | Purpose |
|------|---------|
| `useSimulation.js` | Manages simulation lifecycle (start, pause, reset) |
| `useVsmMetrics.js` | Computes all metrics from current VSM |
| `useStepValidation.js` | Validates step data |
| `useLocalStorage.js` | localStorage persistence wrapper |

**Hook naming convention:**
- Always prefix with `use` (e.g., `useSimulation`)
- camelCase naming

### Stores (`src/stores/`)

Zustand state management stores:

| Store | Purpose | Persisted? |
|-------|---------|------------|
| `vsmStore.js` | VSM data (steps, connections) | Yes (localStorage) |
| `simulationStore.js` | Simulation runtime state | No (ephemeral) |
| `uiStore.js` | UI state (selected step, panels) | No |

**Store naming convention:**
- camelCase + `Store` suffix
- Named export: `export const useVsmStore = create(...)`

See [../examples/zustand-stores.md](../examples/zustand-stores.md) for patterns.

### Utils (`src/utils/`)

Utility functions organized by domain:

| Directory | Purpose | Example Files |
|-----------|---------|---------------|
| `calculations/` | Metrics calculations | `flowEfficiency.js`, `metrics.js` |
| `simulation/` | Simulation logic | `simulationEngine.js`, `workItemFactory.js` |
| `validation/` | Validation utilities | `vsmValidator.js`, `stepValidator.js` |
| `export/` | Export utilities | `pdfExporter.js`, `imageExporter.js` |

**Utility naming convention:**
- Named exports (not default)
- Pure functions (no side effects)
- JSDoc comments required

### Models (`src/models/`)

Domain models using factory functions:

| File | Purpose |
|------|---------|
| `StepFactory.js` | Creates step objects |
| `ConnectionFactory.js` | Creates connection objects |
| `WorkItemFactory.js` | Creates work item objects for simulation |

**Example:**
```javascript
export const createStep = ({ name, processTime, leadTime }) => ({
  id: generateId(),
  name,
  processTime,
  leadTime,
  // ... other properties
})
```

### Data (`src/data/`)

Static data and configuration:

| File | Purpose |
|------|---------|
| `stepTypes.js` | Step type constants (`STEP_TYPES`) |
| `stepTemplates.js` | Template steps for common scenarios |
| `exampleMaps.js` | Example VSMs for demos/testing |

---

## Feature Files (`features/`)

BDD/ATDD test specifications organized by domain:

| Directory | Contents | Example Files |
|-----------|----------|---------------|
| `builder/` | VSM builder features | `add-step.feature`, `edit-step.feature` |
| `simulation/` | Simulation features | `basic-flow.feature`, `bottleneck-detection.feature` |
| `visualization/` | Map display features | `display-map.feature`, `metrics-dashboard.feature` |
| `data/` | Data management | `import-vsm.feature`, `export-vsm.feature` |
| `step-definitions/` | Cucumber step implementations | `builder.steps.js`, `simulation.steps.js` |

**Feature file naming:**
- kebab-case (e.g., `add-step.feature`)
- Descriptive of the capability being tested

See [../rules/atdd-workflow.md](../rules/atdd-workflow.md) for ATDD guidelines.

---

## Test Files (`tests/`)

Test files mirror source structure:

```
tests/
├── unit/
│   ├── calculations/
│   │   ├── flowEfficiency.test.js       # Tests src/utils/calculations/flowEfficiency.js
│   │   └── metrics.test.js
│   ├── simulation/
│   │   └── simulationEngine.test.js
│   ├── stores/
│   │   └── vsmStore.test.js
│   └── components/
│       └── builder/
│           └── StepForm.test.jsx
└── e2e/
    ├── builder.spec.js                   # E2E tests for builder flow
    └── simulation.spec.js
```

**Test file naming convention:**
- `{moduleName}.test.js` for unit tests
- `{feature}.spec.js` for E2E tests
- Mirror directory structure of `src/`

See [../rules/testing.md](../rules/testing.md) for testing guidelines.

---

## Configuration Files

### Build & Development

| File | Purpose |
|------|---------|
| `vite.config.js` | Vite configuration (build tool) |
| `package.json` | Project metadata, scripts, dependencies |
| `pnpm-lock.yaml` | Dependency lock file |

### Testing

| File | Purpose |
|------|---------|
| `vitest.config.js` | Unit test configuration |
| `playwright.config.js` | E2E test configuration |
| `cucumber.js` | Acceptance test configuration |

### Code Quality

| File | Purpose |
|------|---------|
| `.eslintrc.json` | ESLint rules (linting) |
| `.prettierrc` | Prettier rules (formatting) |
| `.gitignore` | Files to exclude from git |

---

## File Naming Conventions

### General Rules

- **Components**: PascalCase (e.g., `StepForm.jsx`)
- **Utilities**: camelCase (e.g., `flowEfficiency.js`)
- **Stores**: camelCase + `Store` (e.g., `vsmStore.js`)
- **Hooks**: camelCase + `use` prefix (e.g., `useSimulation.js`)
- **Tests**: `{name}.test.js` or `{name}.spec.js`
- **Feature files**: kebab-case (e.g., `add-step.feature`)

### Extensions

- `.jsx` for React components (files with JSX syntax)
- `.js` for JavaScript modules (no JSX)
- `.feature` for Gherkin/Cucumber feature files
- `.md` for documentation

---

## Import Path Conventions

### Relative Imports

Use relative imports within the same module:

```javascript
// Within src/components/builder/
import { ValidationSummary } from './ValidationSummary'
```

### Absolute Imports

Import from other modules using relative path from `src/`:

```javascript
// From src/components/builder/StepForm.jsx
import { useVsmStore } from '../../stores/vsmStore'
import { calculateMetrics } from '../../utils/calculations/metrics'
import { Button } from '../ui/Button'
```

### Import Order

1. External dependencies (React, libraries)
2. Internal modules (stores, utils, hooks)
3. Components
4. Assets (CSS, images)

```javascript
// 1. External
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

// 2. Internal
import { useVsmStore } from '../../stores/vsmStore'
import { calculateMetrics } from '../../utils/calculations/metrics'

// 3. Components
import { Button } from '../ui/Button'

// 4. Assets
import './StepForm.css'
```

---

## Where to Add New Files

### Adding a New Component

**Location:** `src/components/{domain}/{ComponentName}.jsx`

Example:
- Builder component → `src/components/builder/NewForm.jsx`
- UI component → `src/components/ui/NewButton.jsx`

### Adding a New Utility

**Location:** `src/utils/{domain}/{utilityName}.js`

Example:
- Calculation → `src/utils/calculations/newMetric.js`
- Validation → `src/utils/validation/newValidator.js`

### Adding a New Hook

**Location:** `src/hooks/useNewHook.js`

### Adding a New Store

**Location:** `src/stores/newStore.js`

### Adding a New Feature

1. Feature file → `features/{domain}/new-feature.feature`
2. Step definitions → `features/step-definitions/{domain}.steps.js`

### Adding Tests

- Unit test → `tests/unit/{mirror-src-path}/{file}.test.js`
- E2E test → `tests/e2e/{feature}.spec.js`

---

## Related Documentation

- [Architecture Guide](architecture.md) - System design and patterns
- [Workflows Guide](workflows.md) - Common development procedures
- [JavaScript/React Rules](../rules/javascript-react.md) - Code style guidelines
- [Skills Directory](../skills/) - Task-specific workflows

---

**Questions?** See [../INDEX.md](../INDEX.md) for full documentation navigation.
