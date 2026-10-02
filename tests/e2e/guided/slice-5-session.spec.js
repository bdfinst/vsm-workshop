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

const NOUNS = [/name/i, /trigger/i, /end point/i, /unit of work/i]

const nextButton = (page) => page.getByRole('button', { name: 'Next' })

const field = (page, label) => page.getByLabel(label, { exact: true })

/** Fill the Scope fields given; a field left out is left empty. */
const fillScope = async (page, { name, trigger, endPoint, unit } = {}) => {
  if (name !== undefined) await field(page, 'Value stream name').fill(name)
  if (trigger !== undefined) await field(page, 'Trigger').fill(trigger)
  if (endPoint !== undefined) await field(page, 'End point').fill(endPoint)
  if (unit !== undefined) await field(page, 'Unit of work').selectOption(unit)
}

const COMPLETE_SCOPE = {
  name: 'Checkout delivery',
  trigger: 'A customer asks for a change',
  endPoint: 'The change is live',
  unit: 'story',
}

// Asserts what Next's description names: only the given fields.
const expectReasonNames = async (page, named) => {
  const next = nextButton(page)
  await expect(next).toBeDisabled()
  for (const noun of NOUNS) {
    const mentioned = named.some((n) => n.source === noun.source)
    if (mentioned) await expect(next).toHaveAccessibleDescription(noun)
    else await expect(next).not.toHaveAccessibleDescription(noun)
  }
}

test.describe('Scope stage (step 5.3)', () => {
  test('New map starts at Scope with Next disabled', async ({ page }) => {
    await page.goto(GUIDED_URL)

    const rail = page.getByRole('navigation', { name: 'Stages' })
    await expect(rail.getByRole('listitem')).toHaveText([
      /Scope/,
      /Steps/,
      /Time/,
      /Quality/,
      /Rework/,
      /Review/,
      /Future/,
    ])
    await expect(rail.getByRole('button', { name: /^Scope/ })).toHaveAttribute(
      'aria-current',
      'step'
    )
    await expect(rail.locator('[aria-current="step"]')).toHaveCount(1)
    await expectReasonNames(page, NOUNS)
    await expect(field(page, 'Unit of work')).toHaveValue('')
  })

  // [field, the fillScope key to leave out, the noun the reason names]
  const MISSING = [
    ['name', 'name', /name/i],
    ['trigger', 'trigger', /trigger/i],
    ['end point', 'endPoint', /end point/i],
    ['unit of work', 'unit', /unit of work/i],
  ]
  for (const [missing, omit, noun] of MISSING) {
    test(`Each missing Scope field is named: ${missing}`, async ({ page }) => {
      await page.goto(GUIDED_URL)
      const { [omit]: _omitted, ...rest } = COMPLETE_SCOPE

      await fillScope(page, rest)

      await expectReasonNames(page, [noun])
    })
  }

  test('Several missing Scope fields are listed together', async ({ page }) => {
    await page.goto(GUIDED_URL)

    await fillScope(page, {
      endPoint: COMPLETE_SCOPE.endPoint,
      unit: COMPLETE_SCOPE.unit,
    })

    await expectReasonNames(page, [/name/i, /trigger/i])
  })

  test('Whitespace-only name counts as empty', async ({ page }) => {
    await page.goto(GUIDED_URL)

    await fillScope(page, { ...COMPLETE_SCOPE, name: '   ' })

    await expectReasonNames(page, [/name/i])
  })

  test('Completing Scope moves to Steps', async ({ page }) => {
    await page.goto(GUIDED_URL)

    await fillScope(page, COMPLETE_SCOPE)
    await expect(nextButton(page)).toBeEnabled()
    await nextButton(page).click()

    const rail = page.getByRole('navigation', { name: 'Stages' })
    await expect(rail.getByRole('button', { name: /^Steps/ })).toHaveAttribute(
      'aria-current',
      'step'
    )
    await expect(page.getByTestId('stage-scope')).toHaveAttribute(
      'data-state',
      'complete'
    )
    await expect(page.getByTestId('stage-scope')).toContainText('complete')
    await expect(page.getByRole('heading', { name: 'Steps' })).toBeFocused()
  })

  test('the Scope stage has no accessibility violations', async ({
    page,
    axe,
  }) => {
    await page.goto(GUIDED_URL)
    await expect(page.getByTestId('scope-stage')).toBeVisible()
    await axe({ include: '[data-testid="stage-rail"]' })
    await axe({ include: '[data-testid="work-region"]' })

    await field(page, 'Working day (hours)').fill('30')
    await expect(page.getByTestId('working-day-error')).toBeVisible()
    await axe({ include: '[data-testid="work-region"]' })
  })
})

// Wiring checks for the rail, undo and working day; their Gherkin scenarios
// run in step 5.4, once resume works.
test.describe('Stage rail and Scope edits (step 5.3 wiring)', () => {
  test('a reached stage that is missing a Scope field needs attention, and the rail jumps back to it', async ({
    page,
    seed,
    axe,
  }) => {
    await seed(workspaceAtStage(2, { trigger: 'A customer asks' }))
    const scope = page.getByTestId('stage-scope')
    const time = page.getByTestId('stage-time')

    await expect(scope).toHaveAttribute('data-state', 'needs-attention')
    await expect(scope).toContainText(/end point/i)
    await expect(time).toHaveAttribute('aria-disabled', 'true')
    await time.click({ force: true })
    await expect(page.getByRole('heading', { name: 'Steps' })).toBeVisible()
    await axe({ include: '[data-testid="stage-rail"]' })

    await scope.click()

    await expect(scope).toHaveAttribute('aria-current', 'step')
    await expect(page.getByRole('heading', { name: 'Scope' })).toBeFocused()
  })

  test('a Scope field edit can be undone and redone', async ({ page }) => {
    await page.goto(GUIDED_URL)
    const trigger = field(page, 'Trigger')

    await trigger.fill('A customer asks')
    await trigger.press('Enter')
    await page.getByRole('button', { name: 'Undo' }).click()

    await expect(trigger).toHaveValue('')
    await expect(page.getByTestId('live-region')).toContainText('trigger')

    await page.getByRole('button', { name: 'Redo' }).click()
    await expect(trigger).toHaveValue('A customer asks')
  })

  test('the value stream name on Scope and the map name in the header are one name', async ({
    page,
  }) => {
    await page.goto(GUIDED_URL)

    await field(page, 'Value stream name').fill('Checkout delivery')
    await field(page, 'Value stream name').press('Enter')

    await expect(field(page, 'Map name')).toHaveValue('Checkout delivery')
  })

  for (const [hours, valid] of [
    ['0', false],
    ['1', true],
    ['7.5', true],
    ['24', true],
    ['25', false],
  ]) {
    test(`Working day must be between 1 and 24 hours: ${hours}`, async ({
      page,
    }) => {
      await page.goto(GUIDED_URL)

      await field(page, 'Working day (hours)').fill(hours)

      const error = page.getByTestId('working-day-error')
      if (valid) await expect(error).toHaveCount(0)
      else await expect(error).toContainText(/between 1 and 24/)
    })
  }
})
