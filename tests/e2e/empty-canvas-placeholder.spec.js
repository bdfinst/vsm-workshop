import { test, expect } from '@playwright/test'

test.describe('Empty Canvas Placeholder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => window.localStorage.clear())
    await page.goto('/')
  })

  test('shows placeholder on empty canvas instead of guidance banner', async ({ page }) => {
    await page.getByTestId('new-map-name-input').fill('Test Map')
    await page.getByTestId('create-map-button').click()

    // Placeholder should be visible
    const placeholder = page.getByTestId('empty-canvas-placeholder')
    await expect(placeholder).toBeVisible()
    await expect(placeholder).toContainText('Add your first step')

    // Guidance banner should NOT be visible
    await expect(page.getByTestId('guidance-banner')).not.toBeVisible()
  })

  test('hides placeholder after adding a step', async ({ page }) => {
    await page.getByTestId('new-map-name-input').fill('Test Map')
    await page.getByTestId('create-map-button').click()

    await expect(page.getByTestId('empty-canvas-placeholder')).toBeVisible()

    // Add a step
    await page.getByRole('button', { name: 'Add Step' }).click()

    // Placeholder should disappear
    await expect(page.getByTestId('empty-canvas-placeholder')).not.toBeVisible()
  })
})
