# Claude Development Rules

This directory contains development rules and guidelines for the VSM Workshop project. These rules ensure code quality, consistency, and adherence to best practices.

## Rule Files

### Core Rules (Read These First)

1. **[quality-verification.md](rules/quality-verification.md)** - **CRITICAL**
   - Mandatory quality checks after every change
   - Must run: `npm test && npm run build && npm run lint`
   - Pre-commit checklist

2. **[javascript-svelte.md](rules/javascript-svelte.md)** - **CRITICAL**
   - Functional programming style (NO classes)
   - Svelte 5 component patterns
   - Code formatting standards
   - Factory function patterns

3. **[atdd-workflow.md](rules/atdd-workflow.md)** - **CRITICAL**
   - Test-first development (TDD/ATDD)
   - Feature file creation and approval
   - Red-Green-Refactor cycle

### Domain and Testing Rules

4. **[testing.md](rules/testing.md)**
   - Testing pyramid (Acceptance → Integration → Unit)
   - Vitest, Playwright, Cucumber patterns
   - Store mocking and test data builders

5. **[vsm-domain.md](rules/vsm-domain.md)**
   - VSM domain concepts and terminology
   - Data structures and validation
   - Time units and metric calculations

6. **[ui-patterns.md](rules/ui-patterns.md)**
   - Tailwind CSS usage
   - React Flow styling
   - Component patterns and accessibility

## Quick Reference

### Functional Style

```javascript
// ✅ GOOD - Factory function
export const createService = () => {
  let state = {}
  const doSomething = () => { /* ... */ }
  return { doSomething }
}

// ❌ BAD - Never use classes
export class Service {
  constructor() { this.state = {} }
  doSomething() { /* ... */ }
}
```

### Quality Verification

```bash
# Run after EVERY change
npm test && npm run build && npm run lint
```

### Test-First Development

1. Write feature file (Gherkin)
2. Get approval
3. Write failing tests
4. Write minimal code to pass
5. Refactor
6. Verify quality (test + build + lint)

## Skills

The `.claude/skills/` directory contains reusable workflows:

- `new-feature.md` - Create new feature with ATDD
- `new-component.md` - Add React component
- `add-metric.md` - Add VSM metric calculation
- `new-process-step.md` - Add VSM step type
- `run-simulation.md` - Run simulation workflow
- `implement-feature.md` - Implement approved feature

## Enforcement

These rules are **MANDATORY**. All code must:

✅ Use functional programming (no classes)
✅ Pass all tests (`npm test`)
✅ Build successfully (`npm run build`)
✅ Pass lint (`npm run lint`)
✅ Follow test-first development
✅ Use PropTypes for type checking
✅ Include data-testid for testing

Violations of these rules should be caught in code review and CI/CD pipelines.

## Contributing

When updating rules:

1. Make changes to rule files
2. Update main `CLAUDE.md` if needed
3. Update this README if adding new rules
4. Run quality checks: `npm test && npm run build && npm run lint`
5. Get team approval for rule changes

## Questions?

- Check the main [CLAUDE.md](../CLAUDE.md) for comprehensive guide
- Review specific rule files for detailed guidance
- Ask the team for clarification on ambiguous cases
