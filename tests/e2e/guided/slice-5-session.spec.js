import { readFile } from 'node:fs/promises'
import { createValueStream } from '../../../src/models/v2/valueStream.js'
import { exportValueStream } from '../../../src/persistence/v2/valueStreamJson.js'
import {
  test,
  expect,
  GUIDED_URL,
  V1_STORAGE_KEY,
  savedBackup,
  savedWorkingCopy,
  v1MapWithoutIntake,
  workspaceAtStage,
} from './fixtures.js'

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
    await seed(workspaceAtStage(2, { endPoint: '' }))
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
})

const rail = (page) => page.getByRole('navigation', { name: 'Stages' })
const stageItem = (page, name) => page.getByTestId(`stage-${name}`)
const mapName = (page) => page.getByLabel('Map name')
const liveRegion = (page) => page.getByTestId('live-region')

/** Change the header's map name the way a user does: type, then Enter. */
const renameMap = async (page, name) => {
  await mapName(page).fill(name)
  await mapName(page).press('Enter')
}

test.describe('Stage rail and header scenarios (step 5.4)', () => {
  test('Return to a reached stage', async ({ page, seed }) => {
    await seed(workspaceAtStage(2))

    await stageItem(page, 'scope').click()

    await expect(stageItem(page, 'scope')).toHaveAttribute(
      'aria-current',
      'step'
    )
    await expect(stageItem(page, 'scope')).toHaveAttribute(
      'data-state',
      'complete'
    )
  })

  test('Stages beyond the furthest reached are not selectable', async ({
    page,
    seed,
  }) => {
    await seed(workspaceAtStage(2))
    const time = stageItem(page, 'time')

    await expect(time).toHaveAttribute('data-state', 'not-selectable')
    await expect(time).toHaveAttribute('aria-disabled', 'true')
    await time.click({ force: true })

    await expect(stageItem(page, 'steps')).toHaveAttribute(
      'aria-current',
      'step'
    )
    await expect(time).not.toHaveAttribute('aria-current', 'step')
  })

  // The hours in each row's title are the Examples values.
  const WORKING_DAYS = [
    ['0', false],
    ['1', true],
    ['7.5', true],
    ['24', true],
    ['25', false],
  ]
  for (const [hours, valid] of WORKING_DAYS) {
    test(`Working day must be between 1 and 24 hours: ${hours}`, async ({
      page,
      seed,
    }) => {
      await seed(workspaceAtStage(1))

      await field(page, 'Working day (hours)').fill(hours)

      const error = page.getByTestId('working-day-error')
      if (valid) await expect(error).toHaveCount(0)
      else await expect(error).toContainText(/between 1 and 24/)
    })
  }

  test('No stage timer', async ({ page, seed }) => {
    await seed(workspaceAtStage(7))
    const timerWords = /timer|timebox|time left|countdown/i

    for (const status of await rail(page).getByRole('listitem').all()) {
      await status.getByRole('button').click()
      await expect(page.getByTestId('work-region')).toBeVisible()
      await expect(page.locator('body')).not.toContainText(timerWords)
      await expect(page.locator('[role="timer"]')).toHaveCount(0)
    }
    await expect(stageItem(page, 'future')).toHaveAttribute(
      'aria-current',
      'step'
    )
  })

  test('Header shows the version being edited', async ({ page, seed }) => {
    await seed(workspaceAtStage(2))

    await expect(page.getByTestId('editing-indicator')).toHaveText(
      /Editing:\s*Current state/
    )
  })

  test('Undo and redo from the toolbar and keyboard', async ({
    page,
    seed,
  }) => {
    await seed(workspaceAtStage(2))
    const undo = page.getByRole('button', { name: 'Undo' })
    const redo = page.getByRole('button', { name: 'Redo' })
    await expect(undo).toBeDisabled()
    await expect(redo).toBeDisabled()

    await renameMap(page, 'Checkout v2')
    await undo.click()

    await expect(mapName(page)).toHaveValue('Checkout delivery')
    await expect(liveRegion(page)).toContainText(/undo/i)
    await expect(liveRegion(page)).toContainText(/map name/i)

    await page.keyboard.press('Control+Shift+Z')

    await expect(mapName(page)).toHaveValue('Checkout v2')
    await expect(redo).toBeDisabled()
  })

  test('A new edit clears redo', async ({ page, seed }) => {
    await seed(workspaceAtStage(2))

    await renameMap(page, 'Checkout v2')
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByRole('button', { name: 'Redo' })).toBeEnabled()
    await renameMap(page, 'Checkout v3')

    await expect(page.getByRole('button', { name: 'Redo' })).toBeDisabled()
  })

  test('Start a new value stream from the header', async ({ page, seed }) => {
    await seed(workspaceAtStage(2))

    await page.getByRole('button', { name: 'File' }).click()
    await page.getByRole('menuitem', { name: 'New value stream' }).click()

    await expect(stageItem(page, 'scope')).toHaveAttribute(
      'aria-current',
      'step'
    )
    await expect(page.getByRole('heading', { name: 'Scope' })).toBeVisible()
    await expect(mapName(page)).toHaveValue('')
    await expect(page.getByRole('menuitem')).toHaveCount(0)
  })

  test('Reload resumes the session', async ({ page, seed }) => {
    await seed(workspaceAtStage(2))
    await renameMap(page, 'Checkout v2')
    // The write to the working copy is async; reload once it has landed.
    await expect.poll(() => savedWorkingCopy(page)).toContain('Checkout v2')

    await page.reload()

    await expect(stageItem(page, 'steps')).toHaveAttribute(
      'aria-current',
      'step'
    )
    await expect(mapName(page)).toHaveValue('Checkout v2')
  })
})

test.describe('Upgrade notice (step 5.4)', () => {
  test('Upgrade notice lists what changed', async ({ page, seedV1 }) => {
    const v1 = v1MapWithoutIntake()
    await seedV1(v1)
    const notice = page.getByTestId('upgrade-notice')

    await expect(
      notice.getByRole('heading', { name: 'Map upgraded to the new format' })
    ).toBeVisible()
    await expect(notice.getByRole('listitem')).toHaveText(['Intake step added'])
    await expect(notice).toContainText(/original map is kept/i)
    await expect(stageItem(page, 'review')).toHaveAttribute(
      'aria-current',
      'step'
    )
    await expect(stageItem(page, 'future')).not.toHaveAttribute(
      'aria-disabled',
      'true'
    )
    expect(
      await page.evaluate((key) => localStorage.getItem(key), V1_STORAGE_KEY)
    ).toBe(JSON.stringify(v1))

    await notice.getByRole('button', { name: 'Dismiss' }).click()

    await expect(notice).toHaveCount(0)
    await page.reload()
    await expect(page.getByTestId('session-shell')).toBeVisible()
    await expect(page.getByTestId('upgrade-notice')).toHaveCount(0)
  })

  test('the upgrade notice has no accessibility violations', async ({
    page,
    seedV1,
    axe,
  }) => {
    await seedV1(v1MapWithoutIntake())
    await expect(page.getByTestId('upgrade-notice')).toBeVisible()

    await axe({ include: '[data-testid="notice-region"]' })
    await axe()
  })
})

const UNREADABLE_TEXT = '{"format": "vsm-workspace", "streams": [oopsé\n'

const unreadableScreen = (page) => page.getByTestId('unreadable-screen')

const startEmptyButton = (page) =>
  page.getByRole('button', { name: 'Start an empty workspace' })

const confirmation = (page) => page.getByRole('alertdialog')

const RECOVERY_MESSAGE = /couldn.t read your saved workspace/i
const KEPT_MESSAGE = /saved data is kept/i

// Waits for a download and returns the text the file holds.
const downloadedText = async (page, trigger) => {
  const download = page.waitForEvent('download')
  await trigger()
  return readFile(await (await download).path(), 'utf8')
}

test.describe('Unreadable workspace (step 5.4)', () => {
  test('Unreadable workspace offers recovery', async ({ page, seed }) => {
    await seed(UNREADABLE_TEXT)

    await expect(unreadableScreen(page)).toContainText(RECOVERY_MESSAGE)
    await expect(unreadableScreen(page)).toContainText(KEPT_MESSAGE)
    await expect(unreadableScreen(page).getByRole('button')).toHaveText([
      'Import value stream',
      'Download the unreadable data',
      'Start an empty workspace',
    ])
    await expect(page.getByTestId('session-shell')).toHaveCount(0)
  })

  test('Download the unreadable data', async ({ page, seed }) => {
    await seed(UNREADABLE_TEXT)

    const text = await downloadedText(page, () =>
      page.getByRole('button', { name: 'Download the unreadable data' }).click()
    )

    expect(text).toBe(UNREADABLE_TEXT)
  })

  test('Starting an empty workspace keeps the backup', async ({
    page,
    seed,
  }) => {
    await seed(UNREADABLE_TEXT)

    await startEmptyButton(page).click()

    await expect(confirmation(page)).toContainText(/stays kept/i)
    await expect(confirmation(page)).toContainText(/won.t be shown again/i)
    const download = confirmation(page).getByRole('button', {
      name: 'Download the unreadable data',
    })
    await expect(download).toBeVisible()
    expect(await downloadedText(page, () => download.click())).toBe(
      UNREADABLE_TEXT
    )

    await confirmation(page)
      .getByRole('button', { name: 'Start empty' })
      .click()

    await expect(stageItem(page, 'scope')).toHaveAttribute(
      'aria-current',
      'step'
    )
    await expect(unreadableScreen(page)).toHaveCount(0)
    expect(await savedBackup(page)).toBe(UNREADABLE_TEXT)
    await expect.poll(() => savedWorkingCopy(page)).not.toBe(UNREADABLE_TEXT)
  })

  test('Cancelling start-empty keeps the recovery screen', async ({
    page,
    seed,
  }) => {
    await seed(UNREADABLE_TEXT)

    await startEmptyButton(page).click()
    await expect(
      confirmation(page).getByRole('button', { name: 'Cancel' })
    ).toBeFocused()
    await page.keyboard.press('Escape')

    await expect(confirmation(page)).toHaveCount(0)
    await expect(unreadableScreen(page)).toContainText(RECOVERY_MESSAGE)
    await expect(unreadableScreen(page)).toContainText(KEPT_MESSAGE)
    await expect(startEmptyButton(page)).toBeFocused()
  })

  test('Import value stream starts a workspace holding the imported stream', async ({
    page,
    seed,
  }) => {
    await seed(UNREADABLE_TEXT)
    const imported = createValueStream({ name: 'Imported delivery' })

    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Import value stream' }).click()
    await (
      await chooser
    ).setFiles({
      name: 'stream.json',
      mimeType: 'application/json',
      buffer: Buffer.from(exportValueStream(imported)),
    })

    await expect(mapName(page)).toHaveValue('Imported delivery')
    await expect(unreadableScreen(page)).toHaveCount(0)
    expect(await savedBackup(page)).toBe(UNREADABLE_TEXT)
  })

  test('Import value stream refuses a file that is not a value stream', async ({
    page,
    seed,
  }) => {
    await seed(UNREADABLE_TEXT)

    await page.getByTestId('import-value-stream-input').setInputFiles({
      name: 'other.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"hello":"world"}'),
    })

    await expect(page.getByRole('alert')).toHaveText(/\S/)
    await expect(unreadableScreen(page)).toContainText(RECOVERY_MESSAGE)
  })

  test('the unreadable screen, with its confirmation open, has no accessibility violations', async ({
    page,
    seed,
    axe,
  }) => {
    await seed(UNREADABLE_TEXT)
    await expect(unreadableScreen(page)).toBeVisible()
    await axe()

    await startEmptyButton(page).click()
    await expect(confirmation(page)).toBeVisible()
    await axe()
  })
})
