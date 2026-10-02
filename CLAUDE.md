# Norn - Claude Development Guide

Start here: [.claude/INDEX.md](.claude/INDEX.md). Quick start: [.claude/QUICK_START.md](.claude/QUICK_START.md). Skills: [.claude/skills/_GUIDE.md](.claude/skills/_GUIDE.md). Pre-commit: [.claude/checklists/pre-commit.md](.claude/checklists/pre-commit.md).

## Essential Commands

```bash
npm run dev               # Dev server
npm test                  # Unit tests
npm run test:acceptance   # Acceptance tests
npm run test:all          # All tests

# Quality gates (mandatory before commit)
npm test && npm run build && npm run lint
```

## Core Principles

1. **Tests first, always.** No implementation without tests. Scenarios -> review -> implementation.
2. **No classes, only functions.** Use factory functions (`createRunner`), never `class`.
3. **Quality gates are mandatory.** Tests, build and lint must all pass before every commit.
4. **PropTypes required** where components declare props.
