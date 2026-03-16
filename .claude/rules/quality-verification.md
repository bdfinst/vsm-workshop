# Quality Verification Rules

## Mandatory Verification After Every Change

**CRITICAL: After making ANY code change, you MUST verify quality by running all three checks.**

This is NON-NEGOTIABLE. Every change must pass all quality gates before being considered complete.

## Three Quality Gates

### 1. Tests Must Pass

```bash
npm test
```

**What this verifies:**
- All unit tests pass (Vitest)
- Business logic is correct
- No regressions introduced
- Test coverage maintained

**Expected result:** All tests green, 0 failures

### 2. Build Must Succeed

```bash
npm run build
```

**What this verifies:**
- No import/export errors
- No missing dependencies
- Code can be bundled for production
- No TypeScript-like errors (we use PropTypes for runtime checks)

**Expected result:** Build completes successfully, dist/ folder created

### 3. Lint Must Pass

```bash
npm run lint
```

**What this verifies:**
- Code style consistency
- No obvious code smells
- ESLint rules satisfied
- Best practices followed

**Expected result:** No errors, warnings are acceptable but should be minimized

## Complete Verification Command

Run all three checks in sequence:

```bash
npm test && npm run build && npm run lint
```

This ensures:
1. Tests pass first (most important)
2. Code builds successfully
3. Code style is correct

If ANY check fails, the change is NOT complete. Fix the issues and re-run all checks.

## When to Run Quality Checks

Run quality verification:

- ✅ After every code change (even small ones)
- ✅ After refactoring
- ✅ After converting classes to functions
- ✅ After adding new features
- ✅ After fixing bugs
- ✅ Before committing code
- ✅ After resolving merge conflicts

## Common Issues and Solutions

### Test Failures

**Issue:** Tests fail after code change

**Solution:**
1. Read the test failure message carefully
2. Fix the code or update the test (if requirements changed)
3. Re-run `npm test` to verify fix
4. If tests are outdated, update them to match new behavior

### Build Failures

**Issue:** Build fails with import/export errors

**Solution:**
1. Check for typos in import paths
2. Verify all exports exist
3. Ensure no circular dependencies
4. Check that all files are saved

### Lint Failures

**Issue:** ESLint reports errors

**Solution:**
1. Fix lint errors manually
2. Some errors can be auto-fixed with `npm run lint -- --fix`
3. Never ignore lint rules unless absolutely necessary
4. Update ESLint config only with team agreement

## Pre-Commit Checklist

Before committing, verify:

- [ ] `npm test` - All tests pass
- [ ] `npm run build` - Build succeeds
- [ ] `npm run lint` - No lint errors
- [ ] Changes are minimal and focused
- [ ] No debugging code left in (console.log, debugger, etc.)
- [ ] No commented-out code
- [ ] No temporary files committed

## Acceptance Testing (ATDD)

In addition to unit tests, run acceptance tests when working on features:

```bash
npm run test:acceptance
```

**Run this when:**
- Implementing a new feature with Gherkin scenarios
- Making changes that affect user-facing behavior
- Verifying end-to-end workflows

## Continuous Verification

Set up your development environment to run checks automatically:

1. **Pre-commit hook** - Runs lint and tests before each commit
2. **Watch mode** - Run `npm test -- --watch` during development
3. **IDE integration** - Configure your IDE to show lint errors in real-time

## Quality Is Non-Negotiable

**Remember:**
- Passing tests, build, and lint is the MINIMUM bar for quality
- It's faster to catch issues early than to debug them later
- Quality checks protect the codebase from regressions
- Every developer is responsible for maintaining code quality

**If you skip quality checks, you risk:**
- Breaking the build for other developers
- Introducing bugs to production
- Creating technical debt
- Losing team trust

**Always verify. Every time. No exceptions.**
