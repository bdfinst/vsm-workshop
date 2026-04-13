import { test, expect } from '@playwright/test'

test.describe('Guided Backwards Mapping', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => window.localStorage.clear())
    await page.goto('/')
  })

  test('shows empty canvas placeholder when creating a blank map', async ({ page }) => {
    await page.getByTestId('new-map-name-input').fill('My Delivery Process')
    await page.getByTestId('create-map-button').click()

    const placeholder = page.getByTestId('empty-canvas-placeholder')
    await expect(placeholder).toBeVisible()
    await expect(placeholder).toContainText('Add your first step')
    await expect(placeholder).toContainText('final delivery step')

    // Guidance banner should NOT be visible (placeholder replaces it)
    await expect(page.getByTestId('guidance-banner')).not.toBeVisible()
  })

  test('empty canvas placeholder disappears after adding a step', async ({ page }) => {
    await page.getByTestId('new-map-name-input').fill('My Process')
    await page.getByTestId('create-map-button').click()

    await expect(page.getByTestId('empty-canvas-placeholder')).toBeVisible()

    // Add a step
    await page.getByRole('button', { name: 'Add Step' }).click()

    // Placeholder should disappear once a step exists
    await expect(page.getByTestId('empty-canvas-placeholder')).not.toBeVisible()
  })

  test('guidance does not appear for template maps', async ({ page }) => {
    await page.getByTestId('start-with-example-button').click()

    // Template maps have steps, so no banner
    await expect(page.getByTestId('guidance-banner')).not.toBeVisible()
  })

  test('first step is positioned on the right side of the canvas', async ({ page }) => {
    await page.getByTestId('new-map-name-input').fill('Test Map')
    await page.getByTestId('create-map-button').click()

    // Add first step
    await page.getByRole('button', { name: 'Add Step' }).click()
    await page.getByTestId('step-name-input').fill('Deploy to Production')
    await page.getByRole('button', { name: 'Save' }).click()

    // Add second step
    await page.getByRole('button', { name: 'Add Step' }).click()
    await page.getByTestId('step-name-input').fill('Staging QA')
    await page.getByRole('button', { name: 'Save' }).click()

    // Close editor if open
    const closeBtn = page.getByTestId('close-editor')
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
    }

    // Get bounding boxes of both nodes
    const deployNode = page.locator('.vsm-node', { hasText: 'Deploy to Production' })
    const stagingNode = page.locator('.vsm-node', { hasText: 'Staging QA' })

    await expect(deployNode).toBeVisible()
    await expect(stagingNode).toBeVisible()

    const deployBox = await deployNode.boundingBox()
    const stagingBox = await stagingNode.boundingBox()

    // Second step (Staging) should be to the LEFT of first step (Deploy)
    expect(stagingBox.x).toBeLessThan(deployBox.x)
  })
})
