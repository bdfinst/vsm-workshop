import { test, expect } from '@playwright/test'

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => window.localStorage.clear())
    await page.goto('/')

    // Create a test map
    await page.getByTestId('new-map-name-input').fill('Visual Test Map')
    await page.getByTestId('create-map-button').click()
  })

  test('should match empty canvas baseline', async ({ page }) => {
    // Wait for canvas to be ready
    await page.waitForSelector('.svelte-flow')

    // Take full page screenshot
    await expect(page).toHaveScreenshot('empty-canvas.png', {
      fullPage: true,
      animations: 'disabled', // Disable animations for consistency
    })
  })

  test('should match canvas with single step', async ({ page }) => {
    // Add a step
    await page.getByRole('button', { name: 'Add Step' }).click()
    await page.getByTestId('step-name-input').fill('Development')
    await page.getByTestId('process-time-input').fill('60')
    await page.getByTestId('lead-time-input').fill('240')
    await page.getByRole('button', { name: 'Save' }).click()

    // Wait for step to render
    await page.waitForSelector('.vsm-node', { state: 'visible' })

    // Take screenshot of just the canvas
    const canvas = page.locator('.svelte-flow')
    await expect(canvas).toHaveScreenshot('single-step-canvas.png', {
      animations: 'disabled',
    })
  })

  test('should match step editor panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Step' }).click()

    // Wait for editor to be visible
    await page.waitForSelector('[data-testid="step-editor"]', {
      state: 'visible',
    })

    // Screenshot just the editor panel
    const editor = page.getByTestId('step-editor')
    await expect(editor).toHaveScreenshot('step-editor-panel.png', {
      animations: 'disabled',
    })
  })

  test('should match metrics dashboard', async ({ page }) => {
    // Create a simple VSM
    await page.getByRole('button', { name: 'Add Step' }).click()
    await page.getByTestId('step-name-input').fill('Development')
    await page.getByTestId('process-time-input').fill('120')
    await page.getByTestId('lead-time-input').fill('480')
    await page.getByRole('button', { name: 'Save' }).click()

    // Open metrics
    await page.getByRole('button', { name: 'Metrics' }).click()
    await page.waitForSelector('[data-testid="metrics-dashboard"]', {
      state: 'visible',
    })

    // Screenshot metrics panel
    const metrics = page.getByTestId('metrics-dashboard')
    await expect(metrics).toHaveScreenshot('metrics-dashboard.png', {
      animations: 'disabled',
    })
  })

  test('should match connected steps visualization', async ({ page }) => {
    // Add two steps
    await page.getByRole('button', { name: 'Add Step' }).click()
    await page.getByTestId('step-name-input').fill('Development')
    await page.getByRole('button', { name: 'Save' }).click()

    await page.getByRole('button', { name: 'Add Step' }).click()
    await page.getByTestId('step-name-input').fill('Testing')
    await page.getByRole('button', { name: 'Save' }).click()

    // Connect them
    const devNode = page.locator('.vsm-node').first()
    const testNode = page.locator('.vsm-node').nth(1)
    await devNode
      .locator('.svelte-flow__handle-right')
      .dragTo(testNode.locator('.svelte-flow__handle-left'))

    // Wait for edge to render
    await page.waitForSelector('.svelte-flow__edge', { state: 'visible' })

    // Screenshot the canvas
    const canvas = page.locator('.svelte-flow')
    await expect(canvas).toHaveScreenshot('connected-steps.png', {
      animations: 'disabled',
    })
  })

  test('should match node with bottleneck indicator', async ({ page }) => {
    // Add step with high queue
    await page.getByRole('button', { name: 'Add Step' }).click()
    await page.getByTestId('step-name-input').fill('Development')
    await page.getByTestId('queue-size-input').fill('10') // High queue triggers bottleneck
    await page.getByRole('button', { name: 'Save' }).click()

    await page.waitForSelector('.vsm-node--bottleneck', { state: 'visible' })

    // Screenshot the bottleneck node
    const node = page.locator('.vsm-node').first()
    await expect(node).toHaveScreenshot('bottleneck-node.png', {
      animations: 'disabled',
    })
  })

  test.skip('should match dark theme (not yet implemented)', async ({ page }) => {
    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]')
    await darkModeToggle.click()
    await expect(page).toHaveScreenshot('dark-theme.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})
