# Visual Testing Quick Start

**Visual regression testing is now configured!**

---

## 🚀 Get Started in 3 Steps

### 1. Generate Baseline Screenshots (First Time)

```bash
npm run test:e2e:visual:update
```

This creates baseline images in `tests/e2e/visual.spec.js-snapshots/chromium/`

---

### 2. Run Visual Tests

```bash
npm run test:e2e:visual
```

Compares current UI against baselines. Tests pass if screenshots match.

---

### 3. Review Results

```bash
npx playwright show-report
```

Opens HTML report with visual diffs (Expected vs Actual vs Diff).

---

## 📸 What Gets Tested

| Test | Description |
|------|-------------|
| Empty canvas | Baseline state |
| Single step | Node rendering |
| Connected steps | Edge rendering |
| Step editor panel | Form UI |
| Metrics dashboard | Analytics display |
| Bottleneck node | Warning indicator |

---

## 🔄 When to Update Baselines

Update baselines when you **intentionally** change the UI:

```bash
# After CSS changes, layout updates, or new features
npm run test:e2e:visual:update
```

⚠️ **Always review diffs first!** Run `npx playwright show-report` to see what changed.

---

## 🛠️ Common Commands

```bash
# Create/update baselines
npm run test:e2e:visual:update

# Run visual tests
npm run test:e2e:visual

# View results
npx playwright show-report

# Debug specific test
npm run test:e2e:visual -g "canvas"

# Run all E2E tests (functional + visual)
npm run test:e2e
```

---

## ✅ Best Practices

1. **Disable animations** - Already configured globally
2. **Wait for stability** - Tests wait for elements to render
3. **Review diffs carefully** - Before updating baselines
4. **Commit baselines** - Add snapshots to git
5. **Run in CI** - Catch visual regressions early

---

## 📁 File Structure

```
tests/e2e/
├── canvas.spec.js              # Functional E2E tests
├── visual.spec.js              # Visual regression tests (NEW)
└── visual.spec.js-snapshots/   # Baseline images (generated)
    └── chromium/
        ├── empty-canvas.png
        ├── single-step-canvas.png
        ├── step-editor-panel.png
        └── ...
```

---

## 🔍 Troubleshooting

### Tests fail with "Screenshot comparison failed"

**Cause:** Visual changes detected

**Action:**
1. Run `npx playwright show-report` to view diff
2. If change is intentional: `npm run test:e2e:visual:update`
3. If change is bug: Fix code and re-run tests

### Flaky tests (random failures)

**Fix:** Already configured to disable animations and wait for stability

### Need more details?

See [VISUAL_TESTING_GUIDE.md](./VISUAL_TESTING_GUIDE.md) for comprehensive guide.

---

## 📊 Test Results

After running `npm run test:e2e:visual`:

```
✓ should match empty canvas baseline
✓ should match canvas with single step
✓ should match step editor panel
✓ should match metrics dashboard
✓ should match connected steps visualization
✓ should match node with bottleneck indicator

6 passed (12s)
```

---

**Next:** Run `npm run test:e2e:visual:update` to create your first baselines! 🎉
