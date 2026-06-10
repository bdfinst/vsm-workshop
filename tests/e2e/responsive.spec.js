import { test, expect } from '@playwright/test'

const PHONE = { width: 390, height: 844 }
const TABLET = { width: 768, height: 1024 }
const DESKTOP = { width: 1280, height: 800 }

async function createMap(page) {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.goto('/')
  await page.getByTestId('new-map-name-input').fill('Responsive Map')
  await page.getByTestId('create-map-button').click()
}

test.describe('Responsive layout (phone / tablet)', () => {
  test('phone: totals bar is visible and the sidebar is a drawer', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await createMap(page)

    // Headline totals stay visible over the diagram.
    await expect(page.getByTestId('canvas-totals-bar')).toBeVisible()
    await expect(page.getByTestId('vsm-canvas')).toBeVisible()

    // The sidebar is collapsed off-screen behind a hamburger toggle.
    await expect(page.getByTestId('sidebar-toggle')).toBeVisible()
    await expect(page.getByTestId('add-step-button')).not.toBeInViewport()

    // Opening the drawer brings the sidebar on-screen.
    await page.getByTestId('sidebar-toggle').click()
    await expect(page.getByTestId('add-step-button')).toBeInViewport()
  })

  test('phone: zoom controls are available on the diagram', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await createMap(page)
    await expect(page.locator('.svelte-flow__controls-zoomin')).toBeVisible()
    await expect(page.locator('.svelte-flow__controls-zoomout')).toBeVisible()
    // Clicking zoom in should not throw and keeps the canvas visible.
    await page.locator('.svelte-flow__controls-zoomin').click()
    await expect(page.getByTestId('vsm-canvas')).toBeVisible()
  })

  test('tablet: totals visible, sidebar still a drawer below lg', async ({ page }) => {
    await page.setViewportSize(TABLET)
    await createMap(page)
    await expect(page.getByTestId('canvas-totals-bar')).toBeVisible()
    await expect(page.getByTestId('sidebar-toggle')).toBeVisible()
    await expect(page.getByTestId('add-step-button')).not.toBeInViewport()
  })

  test('desktop: sidebar is static and the hamburger is hidden', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await createMap(page)
    await expect(page.getByTestId('add-step-button')).toBeInViewport()
    await expect(page.getByTestId('sidebar-toggle')).toBeHidden()
    await expect(page.getByTestId('canvas-totals-bar')).toBeVisible()
  })
})
