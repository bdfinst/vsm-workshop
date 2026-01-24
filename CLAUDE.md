# VSM Workshop - Claude Development Guide

## Project Overview

VSM Workshop is an interactive web application that guides software development teams through creating value stream maps (VSMs) for their delivery processes. The application helps teams visualize their current state, simulate work flow, identify bottlenecks, and prioritize improvement opportunities.

## Technology Stack

- **Framework**: React 18+ (JavaScript, no TypeScript)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Diagramming**: React Flow for interactive node-based diagrams
- **State Management**: Zustand for global state
- **Charts/Visualization**: Recharts for metrics dashboards
- **Testing**: Vitest + React Testing Library + Cucumber.js for ATDD
- **Code Formatting**: Prettier (single quotes, no semicolons)
- **Package Manager**: pnpm

## Development Workflow: ATDD

This project follows **Acceptance Test Driven Development (ATDD)**:

1. **Feature File First**: Before implementing any feature, create a feature file describing the behavior in Gherkin syntax
2. **Review**: Feature files must be reviewed and approved before implementation begins
3. **Step Definitions**: Write step definitions that will initially fail
4. **Implementation**: Write the minimum code to make acceptance tests pass
5. **Refactor**: Clean up while keeping tests green

### Workflow Commands

```bash
# Create a new feature file (use /new-feature skill)
# Review feature file with stakeholder
# Run acceptance tests (will fail initially)
pnpm test:acceptance

# Implement until tests pass
pnpm test:acceptance --watch
```

## Project Structure

```
vsm-workshop/
├── src/
│   ├── components/         # React components
│   │   ├── builder/        # VSM builder wizard components
│   │   ├── canvas/         # React Flow canvas and nodes
│   │   ├── metrics/        # Metrics dashboard components
│   │   ├── simulation/     # Work flow simulation components
│   │   └── ui/             # Shared UI components
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # Zustand stores
│   ├── utils/              # Utility functions
│   │   ├── calculations/   # Metrics calculations
│   │   └── simulation/     # Simulation logic
│   ├── data/               # Static data (templates, examples)
│   └── App.jsx
├── features/               # Gherkin feature files
│   ├── builder/            # VSM builder features
│   ├── visualization/      # Map display features
│   ├── simulation/         # Simulation features
│   └── step-definitions/   # Cucumber step definitions
├── public/
├── tests/
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
└── package.json
```

## Key Domain Concepts

### Value Stream Mapping Terms

- **Lead Time**: Total elapsed time from request to delivery (includes waiting)
- **Process Time**: Actual work time (hands-on-keyboard)
- **Flow Efficiency**: Process Time / Lead Time (expressed as percentage)
- **%C&A (Percent Complete and Accurate)**: Quality metric - percentage of work that passes to the next step without rework
- **Queue**: Work items waiting to enter a process step
- **Batch Size**: Number of items processed together
- **Rework Loop**: When work returns to an earlier step for corrections
- **WIP (Work in Progress)**: Items currently being worked on

### Data Model

A VSM consists of:
1. **Steps** - Individual process stages with timing metrics
2. **Connections** - Flow between steps (forward and rework loops)
3. **Queues** - Work waiting between steps
4. **Gates** - Quality checkpoints and approval stages

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run unit tests
pnpm test

# Run acceptance tests
pnpm test:acceptance

# Run all tests
pnpm test:all

# Linting
pnpm lint

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Development Guidelines

### Feature Development Process

1. **Never implement without a feature file** - All features start with Gherkin
2. **Review before coding** - Feature files require approval
3. **Small increments** - One scenario at a time
4. **Tests drive design** - Let acceptance tests guide the implementation

### Component Patterns

- Use functional components with hooks
- Keep components focused and single-responsibility
- Extract business logic into custom hooks
- Use PropTypes for runtime type checking

### State Management

- Use Zustand stores for global VSM data
- Use React state for local component state
- Keep derived values as computed selectors

### Testing Pyramid

1. **Acceptance Tests** (Cucumber): User-facing behavior
2. **Integration Tests**: Component interactions
3. **Unit Tests**: Utility functions and calculations

## Current Phase: MVP (Phase 1)

Focus areas for MVP:
- Basic VSM builder with manual step entry
- Simple visualization of process flow using React Flow
- Basic metrics calculation (lead time, process time, flow efficiency)
- Single-user experience
- Export to image/PDF

## Architecture Decisions

### Why React Flow?
- Purpose-built for node-based editors
- Handles pan, zoom, and connections natively
- Extensible custom node types
- Good performance with many nodes

### Why Zustand?
- Simple API, minimal boilerplate
- Easy to create multiple stores
- Built-in devtools support

### Why Vite?
- Fast HMR for development
- Optimized production builds
- Simple configuration

### Why ATDD?
- Ensures shared understanding of requirements
- Living documentation
- Catches requirement issues early
- Builds confidence in the system
