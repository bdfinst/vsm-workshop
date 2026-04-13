import { test, expect } from '@playwright/test'

test.describe('Keyboard Shortcuts Overlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => window.localStorage.clear())
    await page.goto('/')
  })

  test('press ? opens overlay, lists shortcuts, Escape closes', async ({ page }) => {
    // Create a map first so we have the main UI
    await page.getByTestId('new-map-name-input').fill('Test Map')
    await page.getByTestId('create-map-button').click()

    // Press ? to open overlay
    await page.keyboard.press('?')

    const overlay = page.getByTestId('keyboard-shortcuts-overlay')
    await expect(overlay).toBeVisible()

    // Verify shortcuts are listed
    await expect(overlay).toContainText('Delete / Backspace')
    await expect(overlay).toContainText('Remove selected step')
    await expect(overlay).toContainText('Show this overlay')

    // Press Escape to close
    await page.keyboard.press('Escape')
    await expect(overlay).not.toBeVisible()
  })

  test('does not open overlay when typing in input', async ({ page }) => {
    // On welcome screen, focus the map name input
    const input = page.getByTestId('new-map-name-input')
    await input.focus()

    // Type ? in the input
    await input.type('?')

    // Overlay should NOT appear
    await expect(page.getByTestId('keyboard-shortcuts-overlay')).not.toBeVisible()
  })

  test('overlay can also be opened from welcome screen', async ({ page }) => {
    // Click somewhere that is not an input to ensure body focus
    await page.click('body')

    await page.keyboard.press('?')

    const overlay = page.getByTestId('keyboard-shortcuts-overlay')
    await expect(overlay).toBeVisible()

    // Close with Escape
    await page.keyboard.press('Escape')
    await expect(overlay).not.toBeVisible()
  })
})
