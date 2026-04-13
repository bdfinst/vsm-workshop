import { test, expect } from '@playwright/test'

test.describe('Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => window.localStorage.clear())
    await page.goto('/')

    // Create a new map
    await page.getByTestId('new-map-name-input').fill('Undo Test Map')
    await page.getByTestId('create-map-button').click()
  })

  test('add step, Ctrl+Z undoes it, Ctrl+Shift+Z redoes it', async ({
    page,
  }) => {
    // Add a step
    await page.getByRole('button', { name: 'Add Step' }).click()

    // Close the editor panel
    await page.getByTestId('close-editor').click()

    // Verify step exists
    const nodes = page.locator('.vsm-node')
    await expect(nodes).toHaveCount(1)

    // Undo with Ctrl+Z (click canvas area first to ensure focus is not in input)
    await page.getByTestId('vsm-canvas').click()
    await page.keyboard.press('Control+z')

    // Step should be gone
    await expect(nodes).toHaveCount(0)

    // Redo with Ctrl+Shift+Z
    await page.keyboard.press('Control+Shift+z')

    // Step should be back
    await expect(nodes).toHaveCount(1)
  })

  test('undo button is disabled when no history, enabled after add', async ({
    page,
  }) => {
    const undoBtn = page.getByTestId('undo-button')
    const redoBtn = page.getByTestId('redo-button')

    // Initially disabled
    await expect(undoBtn).toBeDisabled()
    await expect(redoBtn).toBeDisabled()

    // Add a step
    await page.getByRole('button', { name: 'Add Step' }).click()
    await page.getByTestId('close-editor').click()

    // Undo should now be enabled
    await expect(undoBtn).toBeEnabled()

    // Click undo
    await undoBtn.click()

    // Redo should be enabled, undo disabled
    await expect(redoBtn).toBeEnabled()
    await expect(undoBtn).toBeDisabled()
  })
})
