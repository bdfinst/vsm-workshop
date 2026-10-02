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
