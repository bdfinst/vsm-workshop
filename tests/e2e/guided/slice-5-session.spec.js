import { test, expect, GUIDED_URL, workspaceAtStage } from './fixtures.js'

test('Guided mode is opt-in until switch-over', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('new-map-name-input')).toBeVisible()
  await expect(page.getByTestId('session-shell')).toHaveCount(0)

  await page.goto(GUIDED_URL)
  await expect(page.getByTestId('session-shell')).toBeVisible()
  await expect(page.getByTestId('new-map-name-input')).toHaveCount(0)
})

// Shell scaffolding that later steps build on; not a Gherkin scenario.
test.describe('Session shell (step 5.1)', () => {
  test('a seeded workspace opens on its stage and a placeholder stage moves on', async ({
    page,
    seed,
  }) => {
    await seed(workspaceAtStage(2))

    await expect(page.getByRole('heading', { name: 'Steps' })).toBeVisible()
    await expect(page.getByText('This stage is not built yet')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled()

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: 'Time' })).toBeVisible()
  })

  test('the shell has no accessibility violations', async ({ page, axe }) => {
    await page.goto(GUIDED_URL)
    await expect(page.getByTestId('session-shell')).toBeVisible()

    await axe()
  })
})

// Wiring checks for the header; the Gherkin scenarios for it run in step 5.4.
test.describe('Session header (step 5.2)', () => {
  test('the header, with its File menu open, has no accessibility violations', async ({
    page,
    seed,
    axe,
  }) => {
    await seed(workspaceAtStage(2))
    await expect(page.getByLabel('Map name')).toHaveValue('Checkout delivery')

    await axe({ include: '[data-testid="session-header"]' })

    await page.getByRole('button', { name: 'File' }).click()
    await expect(
      page.getByRole('menuitem', { name: 'New value stream' })
    ).toBeFocused()
    await axe({ include: '[data-testid="session-header"]' })
  })

  test('a name edit can be undone and redone from the toolbar and keyboard', async ({
    page,
    seed,
  }) => {
    await seed(workspaceAtStage(2))
    const name = page.getByLabel('Map name')
    const undo = page.getByRole('button', { name: 'Undo' })
    const redo = page.getByRole('button', { name: 'Redo' })
    await expect(page.getByText('Editing: Current state')).toBeVisible()
    await expect(undo).toBeDisabled()
    await expect(redo).toBeDisabled()

    await name.fill('Checkout v2')
    await name.press('Enter')
    await expect(undo).toBeEnabled()

    await undo.click()
    await expect(name).toHaveValue('Checkout delivery')
    await expect(page.getByTestId('live-region')).toContainText('map name')
    await expect(redo).toBeEnabled()

    await page.keyboard.press('Control+Shift+Z')
    await expect(name).toHaveValue('Checkout v2')
    await expect(redo).toBeDisabled()
  })

  test('Ctrl+Z in the map name field is left to the browser', async ({
    page,
    seed,
  }) => {
    await seed(workspaceAtStage(2))
    const name = page.getByLabel('Map name')
    await name.fill('Checkout v2')
    await name.press('Enter')

    await name.press('Control+Z')

    await expect(page.getByTestId('live-region')).not.toContainText('Undo')
    await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled()
  })

  test('New value stream from the File menu opens an empty one on Scope', async ({
    page,
    seed,
  }) => {
    await seed(workspaceAtStage(2))

    await page.getByRole('button', { name: 'File' }).click()
    await page.getByRole('menuitem', { name: 'New value stream' }).click()

    await expect(page.getByRole('heading', { name: 'Scope' })).toBeVisible()
    await expect(page.getByLabel('Map name')).toHaveValue('')
    await expect(page.getByRole('menuitem')).toHaveCount(0)
  })
})
