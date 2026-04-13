import { test, expect } from '@playwright/test'

test.describe('Form Label Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => window.localStorage.clear())
    await page.goto('/')

    // Create a new map
    await page.getByTestId('new-map-name-input').fill('A11y Test Map')
    await page.getByTestId('create-map-button').click()
  })

  test('step editor form controls have associated labels via for/id', async ({
    page,
  }) => {
    // Add a step to open the step editor
    await page.getByRole('button', { name: 'Add Step' }).click()
    await expect(page.getByTestId('step-editor')).toBeVisible()

    // All form controls in StepEditor that should have label associations
    const stepEditorControls = [
      'step-name-input',
      'step-type-select',
      'step-description-input',
      'process-time-input',
      'lead-time-input',
      'percent-ca-input',
      'queue-size-input',
      'batch-size-input',
    ]

    for (const testId of stepEditorControls) {
      const control = page.getByTestId(testId)
      await expect(control).toBeVisible()

      // Verify the control has an id attribute
      const id = await control.getAttribute('id')
      expect(id, `${testId} should have an id attribute`).toBeTruthy()

      // Verify a label exists with a matching for attribute
      const label = page.locator(`label[for="${id}"]`)
      await expect(
        label,
        `label[for="${id}"] should exist for ${testId}`
      ).toHaveCount(1)
    }
  })

  test('connection editor form controls have associated labels via for/id', async ({
    page,
  }) => {
    // Add two steps
    await page.getByRole('button', { name: 'Add Step' }).click()
    await page.getByTestId('step-name-input').fill('Step A')
    await page.getByRole('button', { name: 'Save' }).click()

    await page.getByRole('button', { name: 'Add Step' }).click()
    await page.getByTestId('step-name-input').fill('Step B')
    await page.getByRole('button', { name: 'Save' }).click()

    // Fit view then connect
    await page.locator('.svelte-flow__controls-fitview').click()
    await page.locator('.svelte-flow__viewport').waitFor({ state: 'visible' })

    const stepA = page.locator('.vsm-node', { hasText: 'Step A' })
    const stepB = page.locator('.vsm-node', { hasText: 'Step B' })
    await stepB
      .locator('.svelte-flow__handle-right')
      .dragTo(stepA.locator('.svelte-flow__handle-left'))

    // Click the edge to open connection editor
    const edge = page.locator('.svelte-flow__edge').first()
    await edge.click()
    await expect(page.getByTestId('connection-editor')).toBeVisible()

    // Check connection type select
    const connectionTypeSelect = page.getByTestId('connection-type-select')
    await expect(connectionTypeSelect).toBeVisible()
    const typeId = await connectionTypeSelect.getAttribute('id')
    expect(
      typeId,
      'connection-type-select should have an id attribute'
    ).toBeTruthy()
    const typeLabel = page.locator(`label[for="${typeId}"]`)
    await expect(typeLabel).toHaveCount(1)

    // Switch to rework to reveal rework-rate-input
    await connectionTypeSelect.selectOption('rework')
    const reworkRateInput = page.getByTestId('rework-rate-input')
    await expect(reworkRateInput).toBeVisible()
    const reworkId = await reworkRateInput.getAttribute('id')
    expect(
      reworkId,
      'rework-rate-input should have an id attribute'
    ).toBeTruthy()
    const reworkLabel = page.locator(`label[for="${reworkId}"]`)
    await expect(reworkLabel).toHaveCount(1)
  })
})

test.describe('Simulation Results Accessibility', () => {
  test('simulation results container has aria-live and role attributes', async ({
    page,
  }) => {
    await page.goto('/')
    await page.evaluate(() => window.localStorage.clear())
    await page.goto('/')

    // Create a map with two connected steps
    await page.getByTestId('new-map-name-input').fill('Sim A11y Test')
    await page.getByTestId('create-map-button').click()

    await page.getByRole('button', { name: 'Add Step' }).click()
    await page.getByTestId('step-name-input').fill('Development')
    await page.getByTestId('process-time-input').fill('60')
    await page.getByTestId('lead-time-input').fill('120')
    await page.getByRole('button', { name: 'Save' }).click()

    await page.getByRole('button', { name: 'Add Step' }).click()
    await page.getByTestId('step-name-input').fill('Testing')
    await page.getByTestId('process-time-input').fill('30')
    await page.getByTestId('lead-time-input').fill('90')
    await page.getByRole('button', { name: 'Save' }).click()

    // Fit view and connect
    await page.locator('.svelte-flow__controls-fitview').click()
    await page.locator('.svelte-flow__viewport').waitFor({ state: 'visible' })
    const devNode = page.locator('.vsm-node', { hasText: 'Development' })
    const testNode = page.locator('.vsm-node', { hasText: 'Testing' })
    await testNode
      .locator('.svelte-flow__handle-right')
      .dragTo(devNode.locator('.svelte-flow__handle-left'))

    // Open simulation panel
    await page.getByRole('button', { name: 'Simulate' }).click()
    await expect(page.getByTestId('simulation-panel')).toBeVisible()

    // Configure and run simulation
    await page.getByTestId('work-item-count-input').fill('5')
    await page.getByTestId('simulation-duration-input').fill('50')
    await page.getByRole('button', { name: 'Run Simulation' }).click()

    // Wait for results
    const resultsContainer = page.getByTestId('simulation-results')
    await expect(resultsContainer).toBeVisible()

    // Verify role and aria-atomic attributes (role="status" implies aria-live="polite")
    await expect(resultsContainer).toHaveAttribute('role', 'status')
    await expect(resultsContainer).toHaveAttribute('aria-atomic', 'false')
  })
})
