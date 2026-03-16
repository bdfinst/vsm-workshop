# Visual Testing Guide

**Status:** Visual regression testing implemented with Playwright
**Test File:** `tests/e2e/visual.spec.js`

---

## What is Visual Testing?

Visual testing (visual regression testing) captures screenshots of your UI and compares them against baseline images to detect unintended visual changes.

### What Visual Tests Catch:

✅ **Layout changes** - Elements shifting position
✅ **Styling regressions** - Colors, fonts, spacing changes
✅ **Responsive breakpoints** - Mobile/desktop rendering
✅ **Cross-browser differences** - Chrome vs Firefox vs Safari
✅ **Animation states** - Hover, focus, active states
✅ **Component variations** - Different props/states

### What Visual Tests DON'T Catch:

❌ **Functionality** - Use E2E tests for interactions
❌ **Logic errors** - Use unit tests for business logic
❌ **Performance** - Use performance testing tools

---

## Running Visual Tests

### First Run (Create Baselines)

```bash
# Generate baseline screenshots
npm run test:e2e --update-snapshots
```

This creates baseline images in `tests/e2e/visual.spec.js-snapshots/`

### Subsequent Runs (Compare)

```bash
# Run visual regression tests
npm run test:e2e visual.spec.js
```

Playwright compares new screenshots against baselines and reports differences.

---

## Understanding Results

### ✅ Tests Pass
All screenshots match baselines → No visual regressions

### ❌ Tests Fail
Screenshots differ from baselines → Visual changes detected

**View diff report:**
```bash
# Open HTML report with visual diffs
npx playwright show-report
```

The report shows:
- **Expected** (baseline)
- **Actual** (new screenshot)
- **Diff** (highlighted differences)

---

## Updating Baselines

When intentional visual changes are made:

```bash
# Update all baselines
npm run test:e2e --update-snapshots

# Update specific test
npm run test:e2e visual.spec.js -g "should match canvas" --update-snapshots
```

⚠️ **IMPORTANT:** Always review diffs before updating baselines!

---

## Best Practices

### 1. Disable Animations

Animations cause flakiness in screenshots:

```javascript
await expect(page).toHaveScreenshot('canvas.png', {
  animations: 'disabled', // ✅ Always disable
})
```

### 2. Wait for Stability

Wait for loading states to complete:

```javascript
// Wait for canvas to render
await page.waitForSelector('.svelte-flow', { state: 'visible' })

// Wait for specific content
await page.waitForFunction(() => {
  return document.querySelectorAll('.vsm-node').length > 0
})

// Then take screenshot
await expect(page).toHaveScreenshot('ready-canvas.png')
```

### 3. Use Specific Selectors

Screenshot specific components, not entire page:

```javascript
// ✅ Good - specific component
const editor = page.getByTestId('step-editor')
await expect(editor).toHaveScreenshot('editor.png')

// ❌ Avoid - full page includes dynamic elements
await expect(page).toHaveScreenshot('full-page.png')
```

### 4. Test Variations

Test different states of the same component:

```javascript
test('step node - normal state', async ({ page }) => {
  // Screenshot normal node
})

test('step node - selected state', async ({ page }) => {
  // Click node, screenshot selected state
})

test('step node - bottleneck state', async ({ page }) => {
  // Set high queue, screenshot bottleneck
})
```

### 5. Set Threshold for Pixel Differences

Allow minor anti-aliasing differences:

```javascript
await expect(page).toHaveScreenshot('canvas.png', {
  maxDiffPixels: 100, // Allow 100 pixel difference
  // OR
  threshold: 0.2, // Allow 20% pixel difference
})
```

---

## Playwright Configuration

Update `playwright.config.js` for visual testing:

```javascript
export default defineConfig({
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Visual testing settings
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1, // Prevent DPI differences
  },

  // Expect settings for screenshots
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100, // Global tolerance
      animations: 'disabled',
    },
  },
})
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Visual Regression Tests

on: [push, pull_request]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm install

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run visual tests
        run: npm run test:e2e visual.spec.js

      - name: Upload diff artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: visual-diffs
          path: test-results/
```

---

## Snapshot Management

### Organizing Snapshots

```
tests/e2e/
├── visual.spec.js
└── visual.spec.js-snapshots/
    ├── chromium/
    │   ├── empty-canvas.png
    │   ├── single-step-canvas.png
    │   └── metrics-dashboard.png
    ├── firefox/
    │   └── ...
    └── webkit/
        └── ...
```

### Committing Snapshots

```bash
# Add baseline snapshots to git
git add tests/e2e/**/*-snapshots/

# Commit with clear message
git commit -m "test: add visual regression baselines"
```

⚠️ **Warning:** Snapshots can be large. Consider:
- Using `.gitattributes` for LFS
- Storing only critical baselines
- Testing on single browser in CI

---

## Alternative: Percy (SaaS)

For more advanced visual testing, consider Percy.io:

```bash
npm install --save-dev @percy/cli @percy/playwright
```

```javascript
import percySnapshot from '@percy/playwright'

test('visual test with Percy', async ({ page }) => {
  await page.goto('/')
  await percySnapshot(page, 'Homepage')
})
```

**Percy Benefits:**
- Cross-browser testing (multiple browsers in parallel)
- Better diff UI
- Historical comparisons
- Team collaboration features
- Parallel screenshot processing

**Cost:** Free tier available, paid for teams

---

## Debugging Failed Tests

### 1. View HTML Report

```bash
npx playwright show-report
```

Shows side-by-side comparison with diff highlighting.

### 2. Generate Trace

```bash
# Run with trace
npm run test:e2e visual.spec.js --trace on

# View trace
npx playwright show-trace trace.zip
```

### 3. Inspect Actual Screenshots

```bash
# Screenshots saved to:
test-results/visual-spec-test-name/actual.png
```

### 4. Debug Mode

```bash
# Run in headed mode with slowMo
npm run test:e2e visual.spec.js --headed --slow-mo=1000
```

---

## Common Issues

### 1. Flaky Tests (Random Failures)

**Cause:** Animations, fonts not loaded, timing issues

**Fix:**
```javascript
// Wait for fonts to load
await page.waitForLoadState('networkidle')

// Disable all animations
await page.addStyleTag({
  content: '*, *::before, *::after { animation-duration: 0s !important; }'
})
```

### 2. Cross-Platform Differences

**Cause:** Different OS render text differently

**Fix:**
- Use web fonts (not system fonts)
- Test on same OS as CI
- Increase threshold tolerance

### 3. Large Snapshot Files

**Cause:** Full-page screenshots

**Fix:**
- Screenshot specific components
- Use lower resolution in CI
- Compress images

---

## Test Coverage Recommendations

### Critical Visual Tests (Must Have)

1. ✅ Empty canvas baseline
2. ✅ Single step node
3. ✅ Connected steps with edges
4. ✅ Step editor panel
5. ✅ Metrics dashboard
6. ✅ Bottleneck indicators

### Nice to Have

7. Multiple node types
8. Rework connections (dashed lines)
9. Selected/hover states
10. Mobile responsive views
11. Dark theme (if implemented)
12. Export previews

### Advanced

13. Different zoom levels
14. Complex maps (10+ nodes)
15. Simulation running state
16. Error states

---

## Commands Summary

```bash
# Create baselines (first time)
npm run test:e2e visual.spec.js --update-snapshots

# Run visual tests
npm run test:e2e visual.spec.js

# Update baselines after intentional changes
npm run test:e2e visual.spec.js --update-snapshots

# View results
npx playwright show-report

# Debug specific test
npm run test:e2e visual.spec.js -g "should match canvas" --debug

# Run on specific browser
npm run test:e2e visual.spec.js --project=chromium
```

---

## Next Steps

1. **Generate baselines:** `npm run test:e2e visual.spec.js --update-snapshots`
2. **Review snapshots:** Check `tests/e2e/visual.spec.js-snapshots/`
3. **Commit baselines:** `git add tests/e2e/**/*-snapshots/`
4. **Run in CI:** Add to GitHub Actions
5. **Establish process:** Define when to update baselines

---

## Resources

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Percy Visual Testing](https://percy.io/)
- [Chromatic (Storybook)](https://www.chromatic.com/)
- [Visual Regression Testing Best Practices](https://martinfowler.com/articles/visual-regressions.html)

---

**Created:** 2026-02-02
**Status:** Ready to use - run `npm run test:e2e visual.spec.js --update-snapshots` to get started
