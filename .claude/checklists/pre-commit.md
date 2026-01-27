# Pre-Commit Checklist

**Use this checklist before EVERY commit. All items must pass.**

---

## ✅ Quality Gates (MANDATORY)

Run all three quality gates in sequence:

```bash
pnpm test && pnpm build && pnpm lint
```

### 1. Tests Pass

```bash
pnpm test
```

- [ ] All unit tests pass (green)
- [ ] No test failures
- [ ] No skipped tests (unless intentional)

**If tests fail:** Fix the code or update the tests, then re-run.

### 2. Build Succeeds

```bash
pnpm build
```

- [ ] Build completes without errors
- [ ] No import/export errors
- [ ] No missing dependencies
- [ ] `dist/` folder created successfully

**If build fails:** Check for import typos, missing exports, or circular dependencies.

### 3. Lint Passes

```bash
pnpm lint
```

- [ ] No ESLint errors
- [ ] Warnings minimized (if any)

**If lint fails:** Fix manually or use `pnpm lint --fix` for auto-fixable issues.

---

## 📋 Code Quality

### Code Style

- [ ] No ES6 classes (use factory functions only)
- [ ] All React components are functional (no class components)
- [ ] PropTypes defined on all components
- [ ] Event handlers prefixed with `handle` (e.g., `handleClick`)
- [ ] Factory functions prefixed with `create` (e.g., `createStep`)

### Clean Code

- [ ] No debugging code left in:
  - [ ] No `console.log()` statements
  - [ ] No `debugger` statements
  - [ ] No `TODO` comments (track in issues instead)
- [ ] No commented-out code
- [ ] No unused imports
- [ ] No unused variables

### Security

- [ ] No secrets in code (API keys, tokens, passwords)
- [ ] No `.env` files committed (should be in `.gitignore`)
- [ ] No hardcoded credentials

---

## 🧪 Test Coverage

- [ ] All new functions have unit tests
- [ ] New features have acceptance tests (feature files)
- [ ] Edge cases are tested
- [ ] Happy path scenarios covered

---

## 📝 Documentation

- [ ] Complex logic has JSDoc comments
- [ ] Public APIs documented
- [ ] Feature files updated (if behavior changed)

---

## 🔗 Dependencies

- [ ] Only staged files you intended to change
- [ ] No `package.json` changes (unless intentional)
- [ ] No lock file conflicts

---

## 🎯 Commit Message

- [ ] Follows conventional commits format:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation
  - `test:` for tests
  - `refactor:` for refactoring
  - `chore:` for build/tooling

**Examples:**
```bash
git commit -m "feat: add flow efficiency calculation"
git commit -m "fix: correct lead time validation"
git commit -m "test: add unit tests for metrics"
```

---

## 🚫 Common Mistakes to Avoid

❌ Committing without running quality gates
❌ Leaving debugging code in
❌ Committing secrets or credentials
❌ Using ES6 classes
❌ Missing PropTypes on components
❌ Skipping tests for "small changes"
❌ Commented-out code

---

## ✨ Quick Reference

### Before Commit

```bash
# 1. Stage files
git add <files>

# 2. Run quality gates
pnpm test && pnpm build && pnpm lint

# 3. Commit
git commit -m "feat: your message here"

# 4. Push
git push origin <branch-name>
```

---

## Related Documentation

- [Quality Verification Rules](../rules/quality-verification.md) - Detailed quality gate info
- [JavaScript/React Rules](../rules/javascript-react.md) - Code style standards
- [ATDD Workflow](../rules/atdd-workflow.md) - Test-first process

---

**Remember:** Quality gates are NON-NEGOTIABLE. Every commit must pass all three.
