# Code Review Checklist

**Use this checklist when reviewing pull requests and code changes.**

---

## 🎯 Purpose and Scope

### Change Understanding

- [ ] PR description explains what and why
- [ ] Changes align with stated purpose
- [ ] No scope creep (unrelated changes)
- [ ] Breaking changes clearly documented

---

## ✅ Quality Gates

### Tests

- [ ] All tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Lint passes (`pnpm lint`)
- [ ] No tests skipped without reason

### Coverage

- [ ] New code has unit tests
- [ ] New features have acceptance tests
- [ ] Edge cases tested
- [ ] Tests are meaningful (not just for coverage)

---

## 📐 Code Style

### Functional Programming

- [ ] **NO ES6 classes** (use factory functions)
- [ ] No use of `this` keyword
- [ ] Pure functions where possible
- [ ] No global mutable state

**Red flags:**
❌ `class MyClass {}`
❌ `new SomeClass()`
❌ `function() { this.value = ... }`

### React Components

- [ ] Functional components only (no class components)
- [ ] PropTypes defined on all components
- [ ] Hooks follow Rules of Hooks
- [ ] Event handlers prefixed with `handle`
- [ ] Custom hooks prefixed with `use`
- [ ] Components have `data-testid` attributes

### Naming Conventions

- [ ] camelCase for variables and functions
- [ ] PascalCase for React components
- [ ] Factory functions prefixed with `create`
- [ ] SCREAMING_SNAKE_CASE for constants

---

## 🏗️ Architecture

### State Management

- [ ] Zustand stores used for global state
- [ ] React state used for local component state
- [ ] No prop drilling (use stores directly)
- [ ] Store actions are pure (no side effects)

### Component Structure

- [ ] Components are focused (single responsibility)
- [ ] Business logic extracted to hooks or utilities
- [ ] No duplicate code
- [ ] Composition over complexity

### File Organization

- [ ] Files in correct directories
- [ ] Imports organized (external, internal, components)
- [ ] Relative imports used correctly

---

## 🔒 Security

### No Secrets

- [ ] No API keys, tokens, or passwords in code
- [ ] No `.env` files committed
- [ ] No hardcoded credentials

### Input Validation

- [ ] User input validated
- [ ] SQL injection protection (if applicable)
- [ ] XSS protection
- [ ] Command injection protection

---

## 🧹 Clean Code

### No Debugging Code

- [ ] No `console.log()` statements
- [ ] No `debugger` statements
- [ ] No commented-out code
- [ ] No temporary files

### Code Quality

- [ ] No magic numbers (use named constants)
- [ ] Complex logic has comments
- [ ] Functions are small and focused
- [ ] No nested callbacks (use async/await)

---

## 📚 Documentation

### Code Comments

- [ ] JSDoc comments on public functions
- [ ] Complex algorithms explained
- [ ] "Why" comments, not "what"

### External Documentation

- [ ] README updated if needed
- [ ] Feature files updated (if behavior changed)
- [ ] Breaking changes documented

---

## 🧪 Testing

### Test Quality

- [ ] Tests are readable
- [ ] Test names describe behavior
- [ ] Tests are independent
- [ ] No flaky tests

### Test Coverage

- [ ] Critical paths tested
- [ ] Error conditions tested
- [ ] Edge cases covered
- [ ] Happy path tested

---

## ⚡ Performance

### Optimization

- [ ] `React.memo()` used for expensive components
- [ ] `useCallback()` used for handlers passed to children
- [ ] `useMemo()` used for expensive calculations
- [ ] No unnecessary re-renders

### Efficiency

- [ ] No N+1 queries
- [ ] Large lists virtualized (if applicable)
- [ ] Images optimized
- [ ] No blocking operations on main thread

---

## ♿ Accessibility

### Semantic HTML

- [ ] Proper HTML elements used
- [ ] Form labels present
- [ ] Buttons have accessible text

### ARIA

- [ ] `aria-label` on icon buttons
- [ ] `aria-hidden` on decorative elements
- [ ] Keyboard navigation works

---

## 📱 Responsive Design

- [ ] Works on mobile, tablet, desktop
- [ ] Breakpoints used correctly
- [ ] Touch-friendly (44x44px minimum)
- [ ] No horizontal scrolling

---

## 🐛 Error Handling

### Graceful Degradation

- [ ] Error boundaries in place
- [ ] User-friendly error messages
- [ ] Fallback UI for errors
- [ ] Critical errors logged

### Validation

- [ ] Input validation at boundaries
- [ ] Business rules enforced
- [ ] Error messages are helpful

---

## 🔄 Git Hygiene

### Commit History

- [ ] Commits are atomic (focused on one thing)
- [ ] Commit messages follow conventions
- [ ] No "WIP" or "fix" commits in final PR
- [ ] Branch up to date with main/master

### PR Description

- [ ] What changed
- [ ] Why it changed
- [ ] How to test
- [ ] Screenshots (if UI change)

---

## 🚨 Red Flags

Watch for these issues:

❌ ES6 classes being used
❌ Class components in React
❌ Missing PropTypes
❌ console.log left in code
❌ Commented-out code
❌ No tests for new features
❌ Copy-pasted code
❌ Overly complex functions (>50 lines)
❌ Deeply nested logic (>3 levels)
❌ Mixing concerns (UI + business logic)

---

## 💬 Providing Feedback

### Good Feedback

✅ **Specific:** "Line 42: This function should be extracted to a utility"
✅ **Constructive:** "Consider using useMemo here to prevent recalculation"
✅ **Actionable:** "Add PropTypes validation for the `step` prop"
✅ **Contextual:** "This violates the no-classes rule (see rules/javascript-react.md)"

### Poor Feedback

❌ **Vague:** "This is bad"
❌ **Unconstructive:** "I don't like this"
❌ **Not actionable:** "Improve this"
❌ **No context:** "Wrong"

---

## 📋 Review Process

### 1. High-Level Review (5 min)

- [ ] Read PR description
- [ ] Understand purpose and scope
- [ ] Check changed files list
- [ ] Run quality gates locally

### 2. Code Review (15-30 min)

- [ ] Review each file
- [ ] Check against this checklist
- [ ] Note issues and suggestions
- [ ] Test manually if needed

### 3. Decision

- [ ] **Approve** - All checklist items pass
- [ ] **Request Changes** - Issues must be fixed
- [ ] **Comment** - Suggestions but not blocking

---

## ✅ Approval Criteria

**Approve when:**
- ✅ All quality gates pass
- ✅ Code follows project standards
- ✅ Tests are comprehensive
- ✅ No security issues
- ✅ No major red flags
- ✅ Documentation updated

**Request changes when:**
- ❌ Quality gates fail
- ❌ ES6 classes used
- ❌ Missing tests
- ❌ Security vulnerabilities
- ❌ Violates project standards

---

## 🔗 Quick Reference

### Essential Checks

```bash
# Run locally before approving
git checkout <pr-branch>
pnpm test && pnpm build && pnpm lint

# Check for classes (should return nothing)
grep -r "class " src/ --include="*.js" --include="*.jsx"

# Check for console.log (should return nothing)
grep -r "console.log" src/ --include="*.js" --include="*.jsx"
```

---

## Related Documentation

- [JavaScript/React Rules](../rules/javascript-react.md) - Code standards
- [Quality Verification](../rules/quality-verification.md) - Quality gates
- [Testing Rules](../rules/testing.md) - Testing standards
- [Pre-Commit Checklist](pre-commit.md) - What author should have done

---

**Remember:** Code reviews protect code quality and share knowledge. Be thorough but respectful.
