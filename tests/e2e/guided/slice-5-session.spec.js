import { readFile } from 'node:fs/promises'
import { STAGE_NAMES, STAGE_NUMBER } from '../../../src/models/v2/constants.js'
import { createValueStream } from '../../../src/models/v2/valueStream.js'
import { exportValueStream } from '../../../src/persistence/v2/valueStreamJson.js'
import {
  test,
  expect,
  GUIDED_URL,
  V1_STORAGE_KEY,
  savedBackup,
  savedWorkingCopy,
  savedWorkspace,
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
    // Review is the last stage that is both a placeholder and has a stage after
    // it; when it gets its own component, move this to the one that still has none.
    const stage = STAGE_NUMBER.REVIEW
    await seed(workspaceAtStage(stage))

    await expect(page.getByTestId('placeholder-stage')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: STAGE_NAMES[stage - 1] })
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled()

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(
      page.getByRole('heading', { name: STAGE_NAMES[stage] })
    ).toBeVisible()
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

// The reasons Next gives, word for word as the Gherkin quotes them.
const REASON_ALL = 'Add a name, trigger, end point and unit of work'
const REASON_NAME = 'Add a name'
const REASON_TRIGGER = 'Add a trigger'
const REASON_END_POINT = 'Add an end point'
const REASON_UNIT = 'Add a unit of work'
const REASON_NAME_AND_TRIGGER = 'Add a name and a trigger'

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

// Next is disabled, and its accessible description is exactly the reason.
const expectReason = async (page, reason) => {
  const next = nextButton(page)
  await expect(next).toHaveAttribute('aria-disabled', 'true')
  await expect(next).toHaveAccessibleDescription(reason)
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
    await expectReason(page, REASON_ALL)
    await expect(field(page, 'Unit of work')).toHaveValue('')
  })

  // [field, the fillScope key to leave out, the reason Next gives]
  const MISSING = [
    ['name', 'name', REASON_NAME],
    ['trigger', 'trigger', REASON_TRIGGER],
    ['end point', 'endPoint', REASON_END_POINT],
    ['unit of work', 'unit', REASON_UNIT],
  ]
  for (const [missing, omit, reason] of MISSING) {
    test(`Each missing Scope field is named: ${missing}`, async ({ page }) => {
      await page.goto(GUIDED_URL)
      const { [omit]: _omitted, ...rest } = COMPLETE_SCOPE

      await fillScope(page, rest)

      await expectReason(page, reason)
    })
  }

  test('Several missing Scope fields are listed together', async ({ page }) => {
    await page.goto(GUIDED_URL)

    await fillScope(page, {
      endPoint: COMPLETE_SCOPE.endPoint,
      unit: COMPLETE_SCOPE.unit,
    })

    await expectReason(page, REASON_NAME_AND_TRIGGER)
  })

  test('Whitespace-only name counts as empty', async ({ page }) => {
    await page.goto(GUIDED_URL)

    await fillScope(page, { ...COMPLETE_SCOPE, name: '   ' })

    await expectReason(page, REASON_NAME)
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
  const INVALID_WORKING_DAYS = ['0', '25']
  const VALID_WORKING_DAYS = ['1', '7.5', '24']

  for (const hours of INVALID_WORKING_DAYS) {
    test(`Working day must be between 1 and 24 hours: ${hours}`, async ({
      page,
      seed,
    }) => {
      await seed(workspaceAtStage(1))
      const workingDay = field(page, 'Working day (hours)')

      await workingDay.fill(hours)
      await workingDay.press('Tab')

      await expect(page.getByTestId('working-day-error')).toContainText(
        /between 1 and 24/
      )
    })
  }

  for (const hours of VALID_WORKING_DAYS) {
    test(`Working day must be between 1 and 24 hours: ${hours}`, async ({
      page,
      seed,
    }) => {
      await seed(workspaceAtStage(1))
      const workingDay = field(page, 'Working day (hours)')

      await workingDay.fill(hours)
      await workingDay.press('Tab')

      await expect(page.getByTestId('working-day-error')).toHaveCount(0)
      await expect
        .poll(async () => (await savedWorkspace(page))?.streams[0].workdayHours)
        .toBe(Number(hours))
      await page.reload()
      await expect(field(page, 'Working day (hours)')).toHaveValue(hours)
    })
  }

  test('No stage timer', async ({ page, seed }) => {
    await seed(workspaceAtStage(7))
    const timerWords = /timer|timebox|time left|countdown/i

    // Wait for every stage to be listed, so the loop below cannot run empty.
    await expect(rail(page).getByRole('listitem')).toHaveCount(
      STAGE_NAMES.length
    )
    for (const status of await rail(page).getByRole('listitem').all()) {
      const stage = status.getByRole('button')
      await stage.click()
      await expect(stage).toHaveAttribute('aria-current', 'step')
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
    await expect(liveRegion(page)).toHaveText('Undo: map name')

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
    await seed(workspaceAtStage(1))
    await nextButton(page).click()
    await expect(stageItem(page, 'steps')).toHaveAttribute(
      'aria-current',
      'step'
    )
    await renameMap(page, 'Checkout v2')
    // The writes to the working copy are async; reload once they have landed.
    await expect
      .poll(async () => {
        const saved = await savedWorkspace(page)
        return [saved?.streams[0].name, saved?.streams[0].session.activeStage]
      })
      .toEqual(['Checkout v2', 2])

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
    await expect
      .poll(async () => (await savedWorkspace(page))?.streams.length)
      .toBe(1)
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
    expect(await savedBackup(page)).toBe(UNREADABLE_TEXT)
    expect(await savedWorkingCopy(page)).toBe(UNREADABLE_TEXT)
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

const stageHeading = (page) => page.getByTestId('stage-heading')

test.describe('Focus and keyboard (slice 5 review)', () => {
  test('Tabbing out of an edited Scope field moves on to the next field', async ({
    page,
  }) => {
    await page.goto(GUIDED_URL)

    await field(page, 'Value stream name').fill('Checkout delivery')
    await field(page, 'Value stream name').press('Tab')
    // The edit has landed once it is saved; focus must not have been pulled away.
    await expect
      .poll(async () => (await savedWorkspace(page))?.streams[0].name)
      .toBe('Checkout delivery')

    await expect(field(page, 'Trigger')).toBeFocused()
  })

  test('Undo keeps focus after the last undo step is used', async ({
    page,
    seed,
  }) => {
    await seed(workspaceAtStage(2))
    const undo = page.getByRole('button', { name: 'Undo' })
    await renameMap(page, 'Checkout v2')

    await undo.click()

    await expect(mapName(page)).toHaveValue('Checkout delivery')
    await expect(undo).toHaveAttribute('aria-disabled', 'true')
    await expect(undo).toBeFocused()
  })

  test('Redo keeps focus after the last redo step is used', async ({
    page,
    seed,
  }) => {
    await seed(workspaceAtStage(2))
    const redo = page.getByRole('button', { name: 'Redo' })
    await renameMap(page, 'Checkout v2')
    await page.getByRole('button', { name: 'Undo' }).click()

    await redo.click()

    await expect(mapName(page)).toHaveValue('Checkout v2')
    await expect(redo).toHaveAttribute('aria-disabled', 'true')
    await expect(redo).toBeFocused()
  })

  test('Dismissing the upgrade notice moves focus to the stage heading', async ({
    page,
    seedV1,
  }) => {
    await seedV1(v1MapWithoutIntake())
    const dismiss = page
      .getByTestId('upgrade-notice')
      .getByRole('button', { name: 'Dismiss' })

    await dismiss.click()

    await expect(page.getByTestId('upgrade-notice')).toHaveCount(0)
    await expect(stageHeading(page)).toBeFocused()
  })

  test('Next stays focusable while it is not allowed, says why, and does nothing', async ({
    page,
  }) => {
    await page.goto(GUIDED_URL)
    const next = nextButton(page)

    await next.focus()

    await expect(next).toBeFocused()
    await expect(next).toHaveAttribute('aria-disabled', 'true')
    await expect(next).toHaveAccessibleDescription(/\S/)
    await next.click({ force: true })
    await expect(stageItem(page, 'scope')).toHaveAttribute(
      'aria-current',
      'step'
    )
  })

  test('The reason Next is not allowed is announced as it changes', async ({
    page,
  }) => {
    await page.goto(GUIDED_URL)
    const reason = page.getByTestId('next-reason')

    await expect(reason).toHaveAttribute('aria-live', 'polite')
    await expect(reason).toHaveText(/\S/)

    await fillScope(page, COMPLETE_SCOPE)

    await expect(nextButton(page)).not.toHaveAttribute('aria-disabled', 'true')
    await expect(reason).toHaveAttribute('aria-live', 'polite')
    await expect(reason).toHaveText('')
  })

  test('The File menu opens onto its first item and Escape returns to File', async ({
    page,
    seed,
    axe,
  }) => {
    await seed(workspaceAtStage(2))
    const file = page.getByRole('button', { name: 'File' })
    const item = page.getByRole('menuitem', { name: 'New value stream' })
    await expect(file).not.toHaveAttribute('aria-controls', /.*/)

    await file.focus()
    await page.keyboard.press('Enter')

    await expect(item).toBeFocused()
    await expect(file).toHaveAttribute('aria-expanded', 'true')
    const menuId = await file.getAttribute('aria-controls')
    await expect(page.locator(`[id="${menuId}"]`)).toBeVisible()
    await axe()

    await page.keyboard.press('Escape')

    await expect(file).toBeFocused()
    await expect(file).toHaveAttribute('aria-expanded', 'false')
    await expect(file).not.toHaveAttribute('aria-controls', /.*/)
    await expect(item).toHaveCount(0)
  })
})

test.describe('Form semantics (slice 5 review)', () => {
  test('Scope fields are marked required', async ({ page }) => {
    await page.goto(GUIDED_URL)

    for (const label of [
      'Value stream name',
      'Trigger',
      'End point',
      'Unit of work',
    ]) {
      await expect(field(page, label)).toHaveAttribute('aria-required', 'true')
    }
  })

  test('A working day out of range is announced as an alert', async ({
    page,
  }) => {
    await page.goto(GUIDED_URL)

    await field(page, 'Working day (hours)').fill('30')

    await expect(
      page.getByTestId('work-region').getByRole('alert')
    ).toContainText(/between 1 and 24/)
  })
})

/** Runs in the page: unreadable data can be read, but not backed up. */
const failBackupWrites = () => {
  const put = IDBObjectStore.prototype.put
  IDBObjectStore.prototype.put = function (value, key) {
    if (key === 'backup') throw new DOMException('Full', 'QuotaExceededError')
    return put.call(this, value, key)
  }
}

test.describe('Unreadable workspace dialogs and errors (slice 5 review)', () => {
  test('Starting empty is a modal dialog and its trigger reports it is open', async ({
    page,
    seed,
  }) => {
    await seed(UNREADABLE_TEXT)
    const trigger = startEmptyButton(page)
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await trigger.click()

    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(confirmation(page)).toHaveAttribute('aria-modal', 'true')

    await page.keyboard.press('Escape')

    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  test('A file that cannot be read is reported and the screen stays', async ({
    page,
    seed,
  }) => {
    await seed(UNREADABLE_TEXT)
    await expect(unreadableScreen(page)).toBeVisible()
    await page.evaluate(() => {
      Blob.prototype.text = () => Promise.reject(new Error('read failed'))
    })

    await page.getByTestId('import-value-stream-input').setInputFiles({
      name: 'stream.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{}'),
    })

    await expect(page.getByRole('alert')).toHaveText(/\S/)
    await expect(unreadableScreen(page)).toContainText(RECOVERY_MESSAGE)
  })
})

test.describe('Unreadable data that could not be backed up (data safety)', () => {
  test('Start empty waits for the download, and the only copy survives until then', async ({
    page,
    seed,
    axe,
  }) => {
    await page.addInitScript(failBackupWrites)
    await seed(UNREADABLE_TEXT)
    await startEmptyButton(page).click()
    const confirm = confirmation(page).getByRole('button', {
      name: 'Start empty',
    })

    await expect(confirm).toHaveAttribute('aria-disabled', 'true')
    await expect(confirm).toHaveAccessibleDescription(/\S/)
    await expect(
      page.getByTestId('confirm-popover-blocked-reason')
    ).toBeVisible()
    await confirm.focus()
    await expect(confirm).toBeFocused()
    await axe()

    await confirm.click({ force: true })

    await expect(confirmation(page)).toBeVisible()
    await expect(unreadableScreen(page)).toBeVisible()
    expect(await savedWorkingCopy(page)).toBe(UNREADABLE_TEXT)
    expect(await savedBackup(page)).toBeNull()

    const copy = await downloadedText(page, () =>
      confirmation(page)
        .getByRole('button', { name: 'Download the unreadable data' })
        .click()
    )
    expect(copy).toBe(UNREADABLE_TEXT)
    await expect(confirm).not.toHaveAttribute('aria-disabled', 'true')
    await expect(
      page.getByTestId('confirm-popover-blocked-reason')
    ).toHaveCount(0)

    await confirm.click()

    await expect(stageItem(page, 'scope')).toHaveAttribute(
      'aria-current',
      'step'
    )
  })

  test('Import waits for the download, and the only copy survives until then', async ({
    page,
    seed,
  }) => {
    await page.addInitScript(failBackupWrites)
    await seed(UNREADABLE_TEXT)
    const importButton = page.getByRole('button', {
      name: 'Import value stream',
    })
    const imported = createValueStream({ name: 'Imported delivery' })

    await expect(importButton).toHaveAttribute('aria-disabled', 'true')
    await expect(importButton).toHaveAccessibleDescription(/\S/)
    let chooserOpened = false
    page.on('filechooser', () => {
      chooserOpened = true
    })
    await importButton.click({ force: true })
    // A page round trip: any chooser the click opened has been reported by now.
    await page.evaluate(() => null)
    expect(chooserOpened).toBe(false)

    await page.getByTestId('import-value-stream-input').setInputFiles({
      name: 'stream.json',
      mimeType: 'application/json',
      buffer: Buffer.from(exportValueStream(imported)),
    })

    await expect(page.getByRole('alert')).toHaveText(/\S/)
    await expect(unreadableScreen(page)).toBeVisible()
    expect(await savedWorkingCopy(page)).toBe(UNREADABLE_TEXT)

    await downloadedText(page, () =>
      page.getByRole('button', { name: 'Download the unreadable data' }).click()
    )
    await expect(importButton).not.toHaveAttribute('aria-disabled', 'true')

    const chooser = page.waitForEvent('filechooser')
    await importButton.click()
    await (
      await chooser
    ).setFiles({
      name: 'stream.json',
      mimeType: 'application/json',
      buffer: Buffer.from(exportValueStream(imported)),
    })

    await expect(mapName(page)).toHaveValue('Imported delivery')
  })
})

test.describe('Launch and notices (slice 5 re-review)', () => {
  test('HomeScreen is never shown on a first launch', async ({ page }) => {
    await page.addInitScript(() => {
      window.__homeScreenSeen = false
      const selector = '[data-testid="home-screen"]'
      new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (
              node.nodeType === 1 &&
              (node.matches(selector) || node.querySelector(selector))
            ) {
              window.__homeScreenSeen = true
            }
          }
        }
      }).observe(document, { childList: true, subtree: true })
    })

    await page.goto(GUIDED_URL)

    await expect(stageItem(page, 'scope')).toHaveAttribute(
      'aria-current',
      'step'
    )
    expect(await page.evaluate(() => window.__homeScreenSeen)).toBe(false)
  })

  test('Opening without a notice puts focus on the stage heading', async ({
    page,
  }) => {
    await page.goto(GUIDED_URL)

    await expect(stageHeading(page)).toBeFocused()
  })

  test('Opening with an upgrade notice puts focus on the notice so it is announced', async ({
    page,
    seedV1,
    axe,
  }) => {
    await seedV1(v1MapWithoutIntake())

    await expect(page.getByTestId('upgrade-notice-title')).toBeFocused()
    await expect(page.getByTestId('upgrade-notice-title')).toHaveText(
      'Map upgraded to the new format'
    )
    await axe()
  })

  test('Importing a v1 map from the unreadable screen shows the upgrade notice', async ({
    page,
    seed,
  }) => {
    await seed(UNREADABLE_TEXT)

    await page.getByTestId('import-value-stream-input').setInputFiles({
      name: 'v1-map.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(v1MapWithoutIntake())),
    })

    const notice = page.getByTestId('upgrade-notice')
    await expect(notice).toBeVisible()
    await expect(notice.getByRole('listitem')).toHaveText(['Intake step added'])
    await expect(unreadableScreen(page)).toHaveCount(0)
  })
})

/** Runs in the page: reads from the working copy fail until the test lets them. */
const failReads = () => {
  window.__failReads = true
  const get = IDBObjectStore.prototype.get
  IDBObjectStore.prototype.get = function (...args) {
    if (window.__failReads) throw new DOMException('Gone', 'UnknownError')
    return get.apply(this, args)
  }
}

const READ_FAILED_REASON = "Couldn't read your saved data. Try again."

test.describe('Saved data that could not be read at all (data safety)', () => {
  test('Try again opens the intact working copy; until then nothing can replace it', async ({
    page,
    seed,
    axe,
  }) => {
    await page.addInitScript(failReads)
    await seed(workspaceAtStage(2))
    const tryAgain = page.getByTestId('try-again-button')
    const importButton = page.getByRole('button', {
      name: 'Import value stream',
    })

    await expect(unreadableScreen(page)).toBeVisible()
    await expect(page.getByTestId('backup-required-reason')).toHaveText(
      READ_FAILED_REASON
    )
    await expect(
      page.getByRole('button', { name: 'Download the unreadable data' })
    ).toHaveCount(0)
    await expect(importButton).toHaveAttribute('aria-disabled', 'true')
    await expect(importButton).toHaveAccessibleDescription(READ_FAILED_REASON)
    await axe()

    await startEmptyButton(page).click()
    const confirm = confirmation(page).getByRole('button', {
      name: 'Start empty',
    })
    await expect(confirm).toHaveAttribute('aria-disabled', 'true')
    await expect(
      confirmation(page).getByRole('button', {
        name: 'Download the unreadable data',
      })
    ).toHaveCount(0)
    await confirm.click({ force: true })
    await expect(unreadableScreen(page)).toBeVisible()
    await page.keyboard.press('Escape')

    await tryAgain.click()
    await expect(unreadableScreen(page)).toBeVisible()
    await expect(tryAgain).toBeVisible()

    await page.evaluate(() => {
      window.__failReads = false
    })
    await tryAgain.click()

    await expect(unreadableScreen(page)).toHaveCount(0)
    await expect(stageItem(page, 'steps')).toHaveAttribute(
      'aria-current',
      'step'
    )
    await expect(mapName(page)).toHaveValue('Checkout delivery')
  })
})
