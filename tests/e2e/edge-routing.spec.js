import { test, expect } from '@playwright/test'

test.describe('Edge Routing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => window.localStorage.clear())
    await page.goto('/')

    // Create a new map
    await page.getByTestId('new-map-name-input').fill('Edge Routing Test')
    await page.getByTestId('create-map-button').click()
  })

  async function addStep(page, name) {
    await page.getByRole('button', { name: 'Add Step' }).click()
    await page.getByTestId('step-name-input').fill(name)
    await page.getByRole('button', { name: 'Save' }).click()
  }

  async function fitView(page) {
    await page.locator('.svelte-flow__controls-fitview').click()
    await page.waitForTimeout(300)
  }

  async function connectNodes(page, sourceName, targetName) {
    const sourceHandle = page
      .locator('.vsm-node', { hasText: sourceName })
      .locator('.svelte-flow__handle-right')
    const targetHandle = page
      .locator('.vsm-node', { hasText: targetName })
      .locator('.svelte-flow__handle-left')

    const sourceBBox = await sourceHandle.boundingBox()
    const targetBBox = await targetHandle.boundingBox()

    await page.mouse.move(
      sourceBBox.x + sourceBBox.width / 2,
      sourceBBox.y + sourceBBox.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      targetBBox.x + targetBBox.width / 2,
      targetBBox.y + targetBBox.height / 2,
      { steps: 5 }
    )
    await page.mouse.up()
  }

  test('forward edges render between connected steps', async ({ page }) => {
    await addStep(page, 'Deploy')
    await addStep(page, 'Dev')

    // Close editor and fit view
    const closeBtn = page.getByRole('button', { name: '✕' })
    if (await closeBtn.isVisible()) await closeBtn.click()
    await fitView(page)

    // Connect Dev (left) → Deploy (right)
    await connectNodes(page, 'Dev', 'Deploy')

    // Verify an edge exists
    const edges = page.locator('.svelte-flow__edge')
    await expect(edges).toHaveCount(1)
  })

  test('steps are positioned right-to-left for backwards mapping', async ({ page }) => {
    await addStep(page, 'Deploy')
    await addStep(page, 'Test')
    await addStep(page, 'Dev')

    // Close editor and fit view
    const closeBtn = page.getByRole('button', { name: '✕' })
    if (await closeBtn.isVisible()) await closeBtn.click()
    await fitView(page)

    // Verify all 3 nodes are visible and positioned right-to-left
    const deployNode = page.locator('.vsm-node', { hasText: 'Deploy' })
    const testNode = page.locator('.vsm-node', { hasText: 'Test' })
    const devNode = page.locator('.vsm-node', { hasText: 'Dev' })

    await expect(deployNode).toBeVisible()
    await expect(testNode).toBeVisible()
    await expect(devNode).toBeVisible()

    const deployBox = await deployNode.boundingBox()
    const testBox = await testNode.boundingBox()
    const devBox = await devNode.boundingBox()

    // First added (Deploy) should be rightmost, last added (Dev) leftmost
    expect(deployBox.x).toBeGreaterThan(testBox.x)
    expect(testBox.x).toBeGreaterThan(devBox.x)
  })

  test('connected steps show edge with correct direction', async ({ page }) => {
    await addStep(page, 'Deploy')
    await addStep(page, 'Dev')

    const closeBtn = page.getByRole('button', { name: '✕' })
    if (await closeBtn.isVisible()) await closeBtn.click()
    await fitView(page)

    await connectNodes(page, 'Dev', 'Deploy')

    // Verify the edge has an arrow marker (forward direction)
    const edgePath = page.locator('.svelte-flow__edge-path').first()
    await expect(edgePath).toHaveAttribute('marker-end', /arrowclosed/)
  })
})
