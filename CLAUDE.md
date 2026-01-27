# VSM Workshop - Claude Development Guide

> **📌 This file has been reorganized for better modularity and easier navigation.**
>
> **👉 START HERE: [.claude/INDEX.md](.claude/INDEX.md)**

---

## Quick Links

- **New to the project?** → [.claude/QUICK_START.md](.claude/QUICK_START.md)
- **Looking for rules?** → [.claude/rules/_INDEX.md](.claude/rules/_INDEX.md)
- **Working on a task?** → [.claude/skills/_GUIDE.md](.claude/skills/_GUIDE.md)
- **Before committing?** → [.claude/checklists/pre-commit.md](.claude/checklists/pre-commit.md)

---

## Why the Change?

The original CLAUDE.md was 1,148 lines long with:
- 15-20% redundancy with separate rule files
- Mixed concerns (overview, rules, examples, workflows)
- Difficult navigation
- Hard to maintain

**The new structure:**
- ✅ Modular organization (rules, guides, examples, checklists, skills)
- ✅ Single source of truth for each concept
- ✅ Easy to find specific information
- ✅ Searchable index
- ✅ Quick reference checklists
- ✅ Reduced duplication

---

## New Structure

```
.claude/
├── INDEX.md              # Main entry point (start here!)
├── QUICK_START.md        # 5-minute onboarding
├── rules/
│   ├── _INDEX.md         # Searchable rule index
│   ├── quality-verification.md
│   ├── javascript-react.md
│   ├── atdd-workflow.md
│   ├── testing.md
│   ├── vsm-domain.md
│   └── ui-patterns.md
├── guides/
│   ├── architecture.md   # System design & patterns
│   ├── workflows.md      # Common procedures
│   └── project-structure.md
├── examples/
│   ├── factory-functions.md
│   ├── zustand-stores.md
│   ├── react-components.md
│   └── testing-patterns.md
├── checklists/
│   ├── pre-commit.md
│   ├── feature-review.md
│   └── code-review.md
└── skills/
    ├── _GUIDE.md         # Which skill to use
    ├── new-feature.md
    ├── implement-feature.md
    ├── new-component.md
    ├── add-metric.md
    ├── new-process-step.md
    └── run-simulation.md
```

---

## Essential Commands

```bash
# Development
pnpm dev                # Start dev server

# Testing
pnpm test              # Unit tests
pnpm test:acceptance   # Acceptance tests
pnpm test:all          # All tests

# Quality Gates (MANDATORY before commit)
pnpm test && pnpm build && pnpm lint
```

---

## Core Principles (Quick Reference)

### 1. Tests First, Always
**NO implementation without tests first.**
Feature file → Review → Implementation

### 2. No Classes, Only Functions
```javascript
// ✅ GOOD
export const createRunner = () => {
  let state = {}
  return { start: () => {} }
}

// ❌ BAD
export class Runner {}
```

### 3. Quality Gates Are Mandatory
```bash
pnpm test && pnpm build && pnpm lint
```
All three must pass before every commit.

### 4. PropTypes Required
```javascript
import PropTypes from 'prop-types'

MyComponent.propTypes = {
  title: PropTypes.string.isRequired
}
```

---

## Need Help?

- **Can't find something?** → Check [.claude/rules/_INDEX.md](.claude/rules/_INDEX.md)
- **Need to know how?** → Check [.claude/guides/workflows.md](.claude/guides/workflows.md)
- **Need an example?** → Check [.claude/examples/](.claude/examples/)
- **Before commit?** → Check [.claude/checklists/pre-commit.md](.claude/checklists/pre-commit.md)

---

## Migration Notes

- **Original content preserved** in new modular structure
- **No information lost** - just reorganized into focused files
- **New content added:** Searchable index, checklists, skills guide, directory READMEs
- **Redundancy removed:** ~15-20% reduction in duplication
- **Documentation enhanced:** JSDoc, type definitions, file headers added

---

**📚 Go to [.claude/INDEX.md](.claude/INDEX.md) to start exploring the new documentation structure!**
