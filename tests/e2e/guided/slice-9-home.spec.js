import { readFile } from 'node:fs/promises'
import { createStep as createV1Step } from '../../../src/models/StepFactory.js'
import { createMapVersion } from '../../../src/models/v2/mapVersion.js'
import { createStep } from '../../../src/models/v2/step.js'
import { createReworkPath } from '../../../src/models/v2/reworkPath.js'
import { createValueStream } from '../../../src/models/v2/valueStream.js'
import { exportValueStream } from '../../../src/persistence/v2/valueStreamJson.js'
import { createWorkspace } from '../../../src/models/v2/workspace.js'
import { STAGE_NUMBER } from '../../../src/models/v2/constants.js'
import {
  test,
  expect,
  renameField,
  savedWorkspace,
  streamName,
} from './fixtures.js'

const DAY_MS = 24 * 60 * 60 * 1000
const CHECKOUT_UPDATED_AT = '2026-03-10T09:00:00.000Z'
// "The clock is frozen 2 days after Checkout delivery was last updated."
const FROZEN_NOW = Date.parse(CHECKOUT_UPDATED_AT) + 2 * DAY_MS

const REFERENCE_STEPS = [
  'Intake',
  'Refinement',
  'Development',
  'Code review',
  'Deploy',
]
const ONBOARDING_STEPS = ['Intake', 'Account setup', 'Training']

/** A stream whose steps all have a performer, with Scope filled in. */
const streamNamed = (name, stepNames, stage, fields = {}) =>
  createValueStream({
    name,
    trigger: 'A customer asks for a change',
    endPoint: 'The change is live',
    unitOfWork: 'story',
    session: { activeStage: stage, furthestStage: stage },
    versions: [
      createMapVersion({
        steps: stepNames.map((stepName) =>
          createStep({ name: stepName, performedBy: 'Delivery team' })
        ),
      }),
    ],
    ...fields,
  })

const checkoutDelivery = (fields) =>
  streamNamed('Checkout delivery', REFERENCE_STEPS, STAGE_NUMBER.REVIEW, {
    updatedAt: CHECKOUT_UPDATED_AT,
    ...fields,
  })

const onboarding = (stage = STAGE_NUMBER.STEPS, fields) =>
  streamNamed('Onboarding', ONBOARDING_STEPS, stage, fields)

/** A workspace of `streams` whose active stream is `active` (none when omitted). */
const workspaceOf = (streams, active = null) =>
  createWorkspace({ streams, activeStreamId: active?.id ?? null })

/**
 * The Background: Checkout delivery (at Review) then Onboarding (at Steps),
 * Checkout delivery active, the clock frozen, the app open. `streams` and
 * `active` change who is in the workspace and who is active.
 */
const openBackground = async (page, seed, options = {}) => {
  const checkout = checkoutDelivery()
  const second = onboarding()
  const {
    streams = [checkout, second],
    active = options.streams ? null : checkout,
  } = options
  await page.clock.install({ time: FROZEN_NOW - 1000 })
  await page.clock.pauseAt(FROZEN_NOW)
  await seed(workspaceOf(streams, active))
  return { checkout, second }
}

const cardLinks = (page) => page.getByTestId('stream-card-link')
const homeHeading = (page) =>
  page.getByRole('heading', { name: 'All value streams', level: 1 })
const allValueStreams = (page) =>
  page.getByRole('button', { name: 'All value streams', exact: true })
const stageButton = (page, name) =>
  page.getByTestId(`stage-${name.toLowerCase()}`)
const cardOf = (page, name) =>
  page.getByTestId('stream-card').filter({
    has: page.getByRole('link', { name, exact: true }),
  })

const openAllValueStreams = async (page) => {
  await allValueStreams(page).click()
  await expect(homeHeading(page)).toBeVisible()
}

const expectValueStreams = (page, names) =>
  expect(cardLinks(page)).toHaveText(names)

const expectCurrentStage = (page, name) =>
  expect(stageButton(page, name)).toHaveAttribute('aria-current', 'step')

/** Presses Ctrl+Z and checks the page left it to the browser (not prevented). */
const pressesCtrlZUnhandled = async (page) => {
  await page.evaluate(() => {
    window.addEventListener('keydown', (event) => {
      window.ctrlZPrevented = event.defaultPrevented
    })
  })
  await page.keyboard.press('Control+z')
  expect(await page.evaluate(() => window.ctrlZPrevented)).toBe(false)
}

test.describe('Several value streams in one workspace (slice 9.1)', () => {
  // "Created 3 Mar" is the day in UTC, so run in a zone a whole day ahead of it.
  test.use({ timezoneId: 'Pacific/Kiritimati' })

  test('Home screen lists every value stream in workspace order', async ({
    page,
    seed,
  }) => {
    await openBackground(page, seed)
    await expect(streamName(page)).toHaveValue('Checkout delivery')

    await openAllValueStreams(page)

    await expectValueStreams(page, ['Checkout delivery', 'Onboarding'])
    const card = cardOf(page, 'Checkout delivery')
    await expect(card).toContainText('5 steps')
    await expect(card).toContainText('Review')
    await expect(card).toContainText('Updated 2 days ago')
    await expect(page.getByTestId('workspace-explainer')).toHaveCount(1)
    await expect(page.getByTestId('workspace-explainer')).toContainText(
      'workspace'
    )
    await expect(homeHeading(page)).toBeFocused()
  })

  test('Launch opens the active value stream where it left off', async ({
    page,
    seed,
  }) => {
    const second = onboarding(STAGE_NUMBER.TIME)
    await openBackground(page, seed, {
      streams: [checkoutDelivery(), second],
      active: second,
    })

    await page.reload()

    await expect(streamName(page)).toHaveValue('Onboarding')
    await expectCurrentStage(page, 'Time')
  })

  test('A reload after visiting home reopens the value stream', async ({
    page,
    seed,
  }) => {
    const { second } = await openBackground(page, seed)
    // Onboarding becomes the active stream, so the save below is a real change.
    await openAllValueStreams(page)
    await page.getByRole('link', { name: 'Onboarding', exact: true }).click()
    await openAllValueStreams(page)
    await expect
      .poll(async () => (await savedWorkspace(page))?.activeStreamId)
      .toBe(second.id)

    await page.reload()

    await expect(streamName(page)).toHaveValue('Onboarding')
    await expectCurrentStage(page, 'Steps')
  })

  test('Launch with no active value stream shows the home screen', async ({
    page,
    seed,
  }) => {
    await openBackground(page, seed, {
      streams: [checkoutDelivery(), onboarding()],
    })

    await page.reload()

    await expect(page.getByTestId('home-screen')).toBeVisible()
    await expect(homeHeading(page)).toBeVisible()
    await expect(page.getByTestId('session-shell')).toHaveCount(0)
  })

  test('Create a value stream from the home screen', async ({ page, seed }) => {
    await openBackground(page, seed)
    await openAllValueStreams(page)

    await page.getByRole('button', { name: 'New value stream' }).click()

    await expectCurrentStage(page, 'Scope')
    await expect(streamName(page)).toHaveValue('')
    await openAllValueStreams(page)
    await expectValueStreams(page, [
      'Checkout delivery',
      'Onboarding',
      'Untitled value stream',
    ])
  })

  test('A new value stream from the header keeps the others', async ({
    page,
    seed,
  }) => {
    await openBackground(page, seed)

    await page.getByRole('button', { name: 'File' }).click()
    await page.getByRole('menuitem', { name: 'New value stream' }).click()
    await openAllValueStreams(page)

    await expectValueStreams(page, [
      'Checkout delivery',
      'Onboarding',
      'Untitled value stream',
    ])
  })

  test('Unnamed value streams show when they were created', async ({
    page,
    seed,
  }) => {
    const unnamed = (createdAt) =>
      streamNamed('', ONBOARDING_STEPS, STAGE_NUMBER.SCOPE, { createdAt })
    const checkout = checkoutDelivery()
    await openBackground(page, seed, {
      streams: [
        checkout,
        onboarding(),
        unnamed('2026-03-03T10:00:00.000Z'),
        unnamed('2026-03-05T10:00:00.000Z'),
      ],
      active: checkout,
    })

    await openAllValueStreams(page)

    const untitled = page
      .getByTestId('stream-card')
      .filter({ hasText: 'Untitled value stream' })
    await expect(untitled).toHaveCount(2)
    await expect(untitled.nth(0)).toContainText('Created 3 Mar')
    await expect(untitled.nth(1)).toContainText('Created 5 Mar')
    await expect(cardOf(page, 'Onboarding')).not.toContainText('Created')
  })

  test('Open a value stream from the home screen', async ({ page, seed }) => {
    await openBackground(page, seed)
    await openAllValueStreams(page)

    await page.getByRole('link', { name: 'Onboarding', exact: true }).click()

    await expect(streamName(page)).toHaveValue('Onboarding')
    await expectCurrentStage(page, 'Steps')
    await expect(
      page.getByRole('heading', { name: 'Steps', exact: true })
    ).toBeFocused()
    await expect(allValueStreams(page)).toBeVisible()
  })

  test('Going home keeps the active value stream saved as active', async ({
    page,
    seed,
  }) => {
    const { second } = await openBackground(page, seed)

    await openAllValueStreams(page)
    await page.getByRole('link', { name: 'Onboarding', exact: true }).click()
    await expect
      .poll(async () => (await savedWorkspace(page))?.activeStreamId)
      .toBe(second.id)
    await openAllValueStreams(page)

    // Home is only a screen: the active stream stays the one that was open.
    await expect(homeHeading(page)).toBeVisible()
    // Saves are written in order, so once this later one is there an earlier
    // save made by going home would be too.
    await duplicateStream(page, 'Checkout delivery')
    await expect.poll(async () => (await savedStreams(page)).length).toBe(3)
    expect((await savedWorkspace(page)).activeStreamId).toBe(second.id)
  })

  test('The home screen has no accessibility violations', async ({
    page,
    seed,
    axe,
  }) => {
    await openBackground(page, seed)
    await openAllValueStreams(page)

    // axe needs the page's timers, so time runs for this test.
    await page.clock.resume()
    await axe()
  })
})

const menuButton = (page, name) =>
  page.getByRole('button', { name: `Actions for ${name}`, exact: true })
const menuItem = (page, name) =>
  page.getByRole('menuitem', { name, exact: true })
const confirmDialog = (page) => page.getByRole('alertdialog')
const toast = (page) => page.getByTestId('toast-message')
const newValueStreamButton = (page) =>
  page.getByRole('button', { name: 'New value stream', exact: true })

const openMenuFor = async (page, name) => {
  await menuButton(page, name).click()
  await expect(page.getByRole('menu')).toBeVisible()
}

const chooseFromMenu = async (page, name, item) => {
  await openMenuFor(page, name)
  await menuItem(page, item).click()
}

const renameStream = async (page, name, newName) => {
  await chooseFromMenu(page, name, 'Rename')
  await renameField(page).fill(newName)
  await page.keyboard.press('Enter')
}

const duplicateStream = (page, name) => chooseFromMenu(page, name, 'Duplicate')

const deleteStream = async (page, name) => {
  await chooseFromMenu(page, name, 'Delete')
  await confirmDialog(page)
    .getByRole('button', { name: 'Delete', exact: true })
    .click()
}

const openStream = (page, name) =>
  page.getByRole('link', { name, exact: true }).click()

const stepNames = (page) =>
  page.getByTestId('step-row').evaluateAll((items) =>
    items.map((item) => {
      const input = item.querySelector('[data-field="name"]')
      return input
        ? input.value
        : item.querySelector('[data-testid="step-name"]').textContent
    })
  )

const startOnHome = async (page, seed) => {
  await openBackground(page, seed)
  await openAllValueStreams(page)
}

test.describe('Manage value streams from the home screen (slice 9.2)', () => {
  test('Rename a value stream', async ({ page, seed }) => {
    await startOnHome(page, seed)

    await renameStream(page, 'Onboarding', 'New hire onboarding')

    await expectValueStreams(page, ['Checkout delivery', 'New hire onboarding'])
    await expect(menuButton(page, 'New hire onboarding')).toBeFocused()
  })

  test('A blank name is refused', async ({ page, seed }) => {
    await startOnHome(page, seed)

    await renameStream(page, 'Onboarding', '   ')

    await expect(page.getByTestId('rename-error')).toHaveText('Add a name')
    await expectValueStreams(page, ['Checkout delivery', 'Onboarding'])
  })

  test('Duplicate a value stream', async ({ page, seed }) => {
    await startOnHome(page, seed)

    await duplicateStream(page, 'Checkout delivery')
    await expectValueStreams(page, [
      'Checkout delivery',
      'Checkout delivery (copy)',
      'Onboarding',
    ])

    await duplicateStream(page, 'Checkout delivery')
    await expectValueStreams(page, [
      'Checkout delivery',
      'Checkout delivery (copy 2)',
      'Checkout delivery (copy)',
      'Onboarding',
    ])
  })

  test('A duplicate is independent', async ({ page, seed }) => {
    await startOnHome(page, seed)

    await duplicateStream(page, 'Checkout delivery')
    await openStream(page, 'Checkout delivery (copy)')
    await stageButton(page, 'Steps').click()
    await page.getByRole('button', { name: 'Delete Deploy' }).click()
    await confirmDialog(page)
      .getByRole('button', { name: 'Delete', exact: true })
      .click()
    await expect
      .poll(() => stepNames(page))
      .toEqual(REFERENCE_STEPS.filter((step) => step !== 'Deploy'))
    await openAllValueStreams(page)
    await openStream(page, 'Checkout delivery')
    await stageButton(page, 'Steps').click()

    await expect.poll(() => stepNames(page)).toEqual(REFERENCE_STEPS)
  })

  test('The card menu works from the keyboard', async ({ page, seed }) => {
    await startOnHome(page, seed)

    await menuButton(page, 'Onboarding').focus()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('menuitem')).toHaveText([
      'Rename',
      'Duplicate',
      'Export value stream',
      'Delete',
    ])
    await expect(menuItem(page, 'Rename')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(menuItem(page, 'Duplicate')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(menuButton(page, 'Onboarding')).toBeFocused()

    await page.keyboard.press('Space')
    await expect(menuItem(page, 'Rename')).toBeFocused()
  })

  test('Delete asks first and can be cancelled', async ({ page, seed }) => {
    await startOnHome(page, seed)

    await chooseFromMenu(page, 'Onboarding', 'Delete')

    await expect(confirmDialog(page)).toContainText('Onboarding')
    await confirmDialog(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(confirmDialog(page)).toHaveCount(0)
    await expectValueStreams(page, ['Checkout delivery', 'Onboarding'])
    await expect(menuButton(page, 'Onboarding')).toBeFocused()
  })

  const UNDO_METHODS = [
    [
      '"Undo" on the toast',
      (page) =>
        toast(page).getByRole('button', { name: 'Undo', exact: true }).click(),
    ],
    ['Ctrl+Z', (page) => page.keyboard.press('Control+z')],
    ['Cmd+Z', (page) => page.keyboard.press('Meta+z')],
  ]

  for (const [method, undo] of UNDO_METHODS) {
    test(`Delete can be undone: ${method}`, async ({ page, seed }) => {
      await startOnHome(page, seed)

      await deleteStream(page, 'Checkout delivery')

      await expectValueStreams(page, ['Onboarding'])
      await expect(
        page.getByRole('link', { name: 'Onboarding', exact: true })
      ).toBeFocused()
      await expect(toast(page)).toContainText('Checkout delivery deleted')
      await expect(toast(page)).toContainText('Ctrl+Z to undo')
      await expect(toast(page)).toHaveAttribute('aria-live', 'polite')

      await undo(page)

      await expectValueStreams(page, ['Checkout delivery', 'Onboarding'])
      await expect(cardOf(page, 'Checkout delivery')).toContainText('5 steps')
      await expect(toast(page)).toHaveCount(0)
    })
  }

  test('Deleting every value stream shows the empty home screen', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)

    await deleteStream(page, 'Checkout delivery')
    await deleteStream(page, 'Onboarding')

    await expect(page.getByText('No value streams yet')).toBeVisible()
    await expect(newValueStreamButton(page)).toBeVisible()
    await expect(newValueStreamButton(page)).toBeFocused()
  })

  test('Focus after a delete goes to the previous card when the last one goes', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)

    await deleteStream(page, 'Onboarding')

    await expect(
      page.getByRole('link', { name: 'Checkout delivery', exact: true })
    ).toBeFocused()
  })

  test('Reloading an empty workspace starts a value stream at Scope', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)
    await deleteStream(page, 'Checkout delivery')
    await deleteStream(page, 'Onboarding')
    await expect
      .poll(async () => (await savedWorkspace(page))?.streams.length)
      .toBe(0)

    await page.reload()

    await expectCurrentStage(page, 'Scope')
    await expect(streamName(page)).toHaveValue('')
  })

  test('Saving the rename of an unnamed value stream without a name is refused', async ({
    page,
    seed,
  }) => {
    const checkout = checkoutDelivery()
    const unnamed = streamNamed('', ONBOARDING_STEPS, STAGE_NUMBER.SCOPE, {
      createdAt: '2026-03-03T10:00:00.000Z',
    })
    await openBackground(page, seed, {
      streams: [checkout, unnamed],
      active: checkout,
    })
    await openAllValueStreams(page)

    await chooseFromMenu(page, 'Untitled value stream', 'Rename')
    const nameField = renameField(page)
    await expect(nameField).toHaveValue('')
    await expect(nameField).toHaveAttribute(
      'placeholder',
      'Untitled value stream'
    )
    await page.keyboard.press('Enter')

    await expect(page.getByTestId('rename-error')).toHaveText('Add a name')
    await expect(nameField).toHaveAttribute('aria-invalid', 'true')
    await expect(nameField).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(nameField).toHaveCount(0)
    await expectValueStreams(page, [
      'Checkout delivery',
      'Untitled value stream',
    ])
    await expect(cardOf(page, 'Untitled value stream')).toContainText(
      'Created 3 Mar'
    )
    await expect(menuButton(page, 'Untitled value stream')).toBeFocused()
  })

  test('The refusal at home goes away when the name is typed again', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)
    await renameStream(page, 'Onboarding', '   ')
    await expect(page.getByTestId('rename-error')).toHaveText('Add a name')
    await expect(renameField(page)).toHaveAttribute('aria-required', 'true')

    await renameField(page).pressSequentially('N')

    await expect(page.getByTestId('rename-error')).toHaveCount(0)
    await expect(renameField(page)).not.toHaveAttribute('aria-invalid', 'true')
    await expect(renameField(page)).not.toHaveAttribute(
      'aria-describedby',
      /.*/
    )
    await page.keyboard.press('Enter')
    await expectValueStreams(page, ['Checkout delivery', 'N'])
  })

  test('Saving a name that has not changed changes nothing', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)

    await chooseFromMenu(page, 'Checkout delivery', 'Rename')
    await renameField(page).fill('  Checkout delivery ')
    await page.keyboard.press('Enter')

    await expect(page.getByTestId('rename-form')).toHaveCount(0)
    await expect(menuButton(page, 'Checkout delivery')).toBeFocused()
    await expect(cardOf(page, 'Checkout delivery')).toContainText(
      'Updated 2 days ago'
    )
    // Saves are written in order, so once this later one is there an earlier
    // save of the rename would be too.
    await duplicateStream(page, 'Onboarding')
    await expect.poll(async () => (await savedStreams(page)).length).toBe(3)
    const saved = (await savedStreams(page)).find(
      (stream) => stream.name === 'Checkout delivery'
    )
    expect(saved.updatedAt).toBe(CHECKOUT_UPDATED_AT)
  })

  test('Escape cancels a rename and leaves the name', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)

    await chooseFromMenu(page, 'Onboarding', 'Rename')
    await renameField(page).fill('Something else')
    await page.keyboard.press('Escape')

    await expect(page.getByTestId('rename-form')).toHaveCount(0)
    await expectValueStreams(page, ['Checkout delivery', 'Onboarding'])
    await expect(menuButton(page, 'Onboarding')).toBeFocused()
  })

  test('Ctrl+Z in a text field is left to the field', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)
    await deleteStream(page, 'Checkout delivery')
    await chooseFromMenu(page, 'Onboarding', 'Rename')
    await expect(renameField(page)).toBeFocused()

    await page.keyboard.press('Control+z')

    await expectValueStreams(page, ['Onboarding'])
    await expect(toast(page)).toContainText('Checkout delivery deleted')

    await page.keyboard.press('Escape')
    await page.keyboard.press('Control+z')

    await expectValueStreams(page, ['Checkout delivery', 'Onboarding'])
  })

  test('The Undo toast closes when leaving the home screen', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)
    await deleteStream(page, 'Checkout delivery')
    await expect(toast(page)).toContainText('Checkout delivery deleted')

    await openStream(page, 'Onboarding')

    await expect(streamName(page)).toHaveValue('Onboarding')
    await expect(toast(page)).toHaveCount(0)
    await openAllValueStreams(page)
    await expect(toast(page)).toHaveCount(0)
  })

  test('The Undo toast is a polite status region and Undo announces the restore', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)
    const liveRegion = page.getByTestId('home-live-region')
    await expect(liveRegion).toHaveAttribute('role', 'status')

    await deleteStream(page, 'Checkout delivery')

    await expect(toast(page)).toHaveAttribute('aria-live', 'polite')
    await expect(toast(page)).toContainText('Checkout delivery deleted')

    await page.keyboard.press('Control+z')

    await expect(liveRegion).toHaveText('Checkout delivery restored')
  })

  test('The card menu and delete confirmation have no accessibility violations', async ({
    page,
    seed,
    axe,
  }) => {
    await startOnHome(page, seed)
    await page.clock.resume()

    await openMenuFor(page, 'Onboarding')
    await axe()
    await menuItem(page, 'Delete').click()
    await expect(confirmDialog(page)).toBeVisible()
    await axe()
    await confirmDialog(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(confirmDialog(page)).toHaveCount(0)
    await chooseFromMenu(page, 'Onboarding', 'Rename')
    await expect(renameField(page)).toBeVisible()
    await axe()
  })

  test('The empty home screen and its Undo toast have no accessibility violations', async ({
    page,
    seed,
    axe,
  }) => {
    await startOnHome(page, seed)
    await deleteStream(page, 'Checkout delivery')
    await deleteStream(page, 'Onboarding')
    await expect(page.getByText('No value streams yet')).toBeVisible()

    // axe needs the page's timers, so time runs for this scan; the toast waits
    // while the pointer is on it.
    await toast(page).hover()
    await page.clock.resume()
    await axe()
  })
})

// A v1 file as the old app wrote it: one step, "Dev", lead 240 and process 60.
const v1FileWithDev = () =>
  JSON.stringify({
    id: 'v1-map',
    name: 'Imported v1 map',
    description: '',
    steps: [
      createV1Step('Dev', {
        leadTime: 240,
        processTime: 60,
        position: { x: 0, y: 0 },
      }),
    ],
    connections: [],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-16T10:00:00.000Z',
  })

// The same v1 file with a wait that has to be clamped: lead 30 is below process 60.
const v1FileWithClampedWait = () =>
  JSON.stringify({
    ...JSON.parse(v1FileWithDev()),
    steps: [
      createV1Step('Dev', {
        leadTime: 30,
        processTime: 60,
        position: { x: 0, y: 0 },
      }),
    ],
  })

const upgradeNotice = (page) => page.getByTestId('upgrade-notice')

const importError = (page) => page.getByTestId('import-error')

// Opens the file chooser the way the user does, then picks the file in it.
const importVia = async (page, openChooser, name, text) => {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    openChooser(),
  ])
  await chooser.setFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(text),
  })
}

const importFromHome = (page, name, text) =>
  importVia(
    page,
    () =>
      page
        .getByRole('button', { name: 'Import value stream', exact: true })
        .click(),
    name,
    text
  )

// Waits for a download; returns its file name and the text it holds.
const downloadedFile = async (page, trigger) => {
  const download = page.waitForEvent('download')
  await trigger()
  const file = await download
  return {
    name: file.suggestedFilename(),
    text: await readFile(await file.path(), 'utf8'),
  }
}

const fileMenuItem = async (page, name) => {
  await page.getByRole('button', { name: 'File', exact: true }).click()
  return menuItem(page, name)
}

const importFromFileMenu = (page, name, text) =>
  importVia(
    page,
    async () => (await fileMenuItem(page, 'Import value stream')).click(),
    name,
    text
  )

const openLastStream = (page) => cardLinks(page).last().click()

const savedStreams = async (page) => (await savedWorkspace(page)).streams

// A stream as the user sees it: steps, times and rework paths, with no ids.
const withoutIds = (stream) => {
  const version = stream.versions.find((v) => v.id === stream.activeVersionId)
  const nameOf = (id) => version.steps.find((step) => step.id === id).name
  return {
    steps: version.steps.map(
      ({ id: _id, originStepId: _origin, ...step }) => step
    ),
    reworkPaths: version.reworkPaths.map(
      ({ id: _id, fromStepId, toStepId, ...path }) => ({
        ...path,
        from: nameOf(fromStepId),
        to: nameOf(toStepId),
      })
    ),
  }
}

// The reference map with times and a rework path from Deploy back to Development.
const checkoutWithTimesAndRework = () => {
  const steps = REFERENCE_STEPS.map((name, index) =>
    createStep({
      name,
      performedBy: 'Delivery team',
      processTime: { typ: 30 + index },
      waitTime: { typ: 60 * (index + 1) },
    })
  )
  const byName = (name) => steps.find((step) => step.name === name).id
  return checkoutDelivery({
    versions: [
      createMapVersion({
        steps,
        reworkPaths: [
          createReworkPath({
            fromStepId: byName('Deploy'),
            toStepId: byName('Development'),
            shareOfRejects: 20,
          }),
        ],
      }),
    ],
  })
}

test.describe('Import and export one value stream (slice 9.3)', () => {
  test('Import a value stream', async ({ page, seed }) => {
    await startOnHome(page, seed)

    await importFromHome(page, 'old-map.json', v1FileWithDev())

    await expect(cardLinks(page)).toHaveCount(3)
    // The upgraded map has not reached Steps yet, so its steps are read from
    // the saved workspace rather than from the Steps stage.
    await expect
      .poll(async () => {
        const imported = (await savedStreams(page))[2]
        return imported ? withoutIds(imported).steps.map((s) => s.name) : null
      })
      .toEqual(['Intake', 'Dev'])
    await openStream(page, 'Checkout delivery')
    await stageButton(page, 'Steps').click()
    await expect.poll(() => stepNames(page)).toEqual(REFERENCE_STEPS)
  })

  test('Importing a v1 file lists what upgrading it changed', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)
    await expect(upgradeNotice(page)).toHaveCount(0)

    await importFromHome(page, 'old-map.json', v1FileWithClampedWait())

    await expect(
      upgradeNotice(page).getByRole('heading', {
        name: 'Map upgraded to the new format',
      })
    ).toBeVisible()
    await expect(upgradeNotice(page).getByRole('listitem')).toHaveText([
      'Intake step added',
      'Wait time clamped for "Dev"',
    ])
  })

  test('Importing a v1 file from the File menu lists what upgrading it changed', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)
    await openStream(page, 'Checkout delivery')

    await importFromFileMenu(page, 'old-map.json', v1FileWithClampedWait())

    await expect(upgradeNotice(page).getByRole('listitem')).toHaveText([
      'Intake step added',
      'Wait time clamped for "Dev"',
    ])
  })

  test('A second v1 import shows its notice again after the first was dismissed', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)
    await importFromHome(page, 'old-map.json', v1FileWithClampedWait())
    await upgradeNotice(page).getByRole('button', { name: 'Dismiss' }).click()
    await expect(upgradeNotice(page)).toHaveCount(0)

    await importFromHome(page, 'old-map.json', v1FileWithClampedWait())

    await expect(upgradeNotice(page).getByRole('listitem')).toHaveText([
      'Intake step added',
      'Wait time clamped for "Dev"',
    ])
  })

  test('Dismissing the upgrade notice on the home screen keeps focus on the home heading', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)
    await importFromHome(page, 'old-map.json', v1FileWithClampedWait())

    await upgradeNotice(page).getByRole('button', { name: 'Dismiss' }).click()

    await expect(upgradeNotice(page)).toHaveCount(0)
    await expect(homeHeading(page)).toBeFocused()
  })

  test('A v1 import on the home screen moves focus to the upgrade notice', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)

    await importFromHome(page, 'old-map.json', v1FileWithClampedWait())

    await expect(page.getByTestId('upgrade-notice-title')).toBeFocused()
  })

  test('A v1 import from the File menu moves focus to the upgrade notice', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)
    await openStream(page, 'Checkout delivery')

    await importFromFileMenu(page, 'old-map.json', v1FileWithClampedWait())

    await expect(page.getByTestId('upgrade-notice-title')).toBeFocused()
  })

  test('A v2 import on the home screen still focuses the new card', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)
    const { text } = await downloadedFile(page, () =>
      chooseFromMenu(page, 'Onboarding', 'Export value stream')
    )

    await importFromHome(page, 'Onboarding.json', text)

    await expect(cardLinks(page)).toHaveCount(3)
    await expect(cardLinks(page).last()).toBeFocused()
  })

  test('A v2 import from the File menu leaves focus on File', async ({
    page,
    seed,
  }) => {
    await openBackground(page, seed)

    await importFromFileMenu(
      page,
      'onboarding.json',
      exportValueStream(onboarding())
    )

    await expect(toast(page)).toContainText('Onboarding imported')
    await expect(
      page.getByRole('button', { name: 'File', exact: true })
    ).toBeFocused()
  })

  test('Importing a v2 file shows no upgrade notice', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)
    const { text } = await downloadedFile(page, () =>
      chooseFromMenu(page, 'Onboarding', 'Export value stream')
    )

    await importFromHome(page, 'Onboarding.json', text)

    await expect(cardLinks(page)).toHaveCount(3)
    await expect(upgradeNotice(page)).toHaveCount(0)
  })

  test('Importing a value stream that is already in the workspace adds a copy', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)
    const { text } = await downloadedFile(page, () =>
      chooseFromMenu(page, 'Onboarding', 'Export value stream')
    )

    await importFromHome(page, 'Onboarding.json', text)

    await expectValueStreams(page, [
      'Checkout delivery',
      'Onboarding',
      'Onboarding',
    ])
    await openLastStream(page)
    await stageButton(page, 'Steps').click()
    await page.getByRole('button', { name: 'Delete Training' }).click()
    await confirmDialog(page)
      .getByRole('button', { name: 'Delete', exact: true })
      .click()
    await expect
      .poll(() => stepNames(page))
      .toEqual(ONBOARDING_STEPS.filter((step) => step !== 'Training'))
    await openAllValueStreams(page)
    await cardLinks(page).nth(1).click()
    await stageButton(page, 'Steps').click()
    await expect.poll(() => stepNames(page)).toEqual(ONBOARDING_STEPS)
  })

  test('A malformed import leaves the workspace unchanged', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)
    const before = await savedStreams(page)

    await importFromHome(page, 'broken.json', 'this is { not json')

    await expect(importError(page)).toHaveText("This file isn't valid JSON")
    await expect(cardLinks(page)).toHaveCount(2)
    // Saves are written in order, so once this later one is there an earlier
    // save made by the import would be too.
    await duplicateStream(page, 'Onboarding')
    await expect.poll(async () => (await savedStreams(page)).length).toBe(3)
    const saved = await savedStreams(page)
    expect(saved.slice(0, 2)).toEqual(before)
    expect(saved[2].name).toBe('Onboarding (copy)')
  })

  test('Export one value stream', async ({ page, seed }) => {
    const checkout = checkoutWithTimesAndRework()
    await openBackground(page, seed, {
      streams: [checkout, onboarding()],
      active: checkout,
    })
    await openAllValueStreams(page)

    const file = await downloadedFile(page, () =>
      chooseFromMenu(page, 'Checkout delivery', 'Export value stream')
    )
    expect(file.name).toBe('Checkout delivery.json')
    await importFromHome(page, file.name, file.text)

    await expect(cardLinks(page)).toHaveCount(3)
    await expect.poll(async () => (await savedStreams(page)).length).toBe(3)
    const streams = await savedStreams(page)
    expect(streams[2].id).not.toBe(streams[0].id)
    expect(streams[2].name).toBe('Checkout delivery')
    expect(withoutIds(streams[2])).toEqual(withoutIds(streams[0]))
    expect(withoutIds(streams[2]).reworkPaths).toHaveLength(1)
  })

  test("Export file names replace characters files can't use", async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)
    await renameStream(page, 'Onboarding', 'Q3: build/test?')

    const file = await downloadedFile(page, () =>
      chooseFromMenu(page, 'Q3: build/test?', 'Export value stream')
    )

    expect(file.name).toBe('Q3- build-test-.json')
  })

  test('Export from the File menu saves the open value stream', async ({
    page,
    seed,
  }) => {
    await openBackground(page, seed)

    const file = await downloadedFile(page, async () => {
      await (await fileMenuItem(page, 'Export value stream')).click()
    })

    expect(file.name).toBe('Checkout delivery.json')
    expect(JSON.parse(file.text).name).toBe('Checkout delivery')
    await expect(
      page.getByRole('button', { name: 'File', exact: true })
    ).toBeFocused()
  })

  test('Import from the File menu keeps the user on the open value stream', async ({
    page,
    seed,
  }) => {
    await openBackground(page, seed)

    await importFromFileMenu(
      page,
      'onboarding.json',
      exportValueStream(onboarding())
    )

    await expect(toast(page)).toContainText('Onboarding imported')
    await expect(streamName(page)).toHaveValue('Checkout delivery')
    await openAllValueStreams(page)
    await expectValueStreams(page, [
      'Checkout delivery',
      'Onboarding',
      'Onboarding',
    ])
  })

  test('A malformed import from the File menu shows the error and changes nothing', async ({
    page,
    seed,
  }) => {
    await openBackground(page, seed)

    await importFromFileMenu(page, 'broken.json', 'this is { not json')

    await expect(importError(page)).toHaveText("This file isn't valid JSON")
    await expect(streamName(page)).toHaveValue('Checkout delivery')
    await openAllValueStreams(page)
    await expectValueStreams(page, ['Checkout delivery', 'Onboarding'])
  })

  test('An Undo that cannot restore says why and leaves Ctrl+Z alone', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)
    const { text } = await downloadedFile(page, () =>
      chooseFromMenu(page, 'Onboarding', 'Export value stream')
    )
    await deleteStream(page, 'Onboarding')
    // The file brings the deleted stream back under its own id, so Undo has
    // nothing left to restore.
    await importFromHome(page, 'Onboarding.json', text)
    await expectValueStreams(page, ['Checkout delivery', 'Onboarding'])
    const deleteToast = toast(page).filter({ hasText: 'Onboarding deleted' })

    await deleteToast.getByRole('button', { name: 'Undo', exact: true }).click()

    await expect(page.getByTestId('home-live-region')).toHaveText(
      'Nothing to restore'
    )
    await expect(deleteToast).toHaveCount(0)
    await expectValueStreams(page, ['Checkout delivery', 'Onboarding'])

    // A later Ctrl+Z is the browser's: the home screen does not swallow it.
    await pressesCtrlZUnhandled(page)
  })

  test('The File menu items have no accessibility violations', async ({
    page,
    seed,
    axe,
  }) => {
    await openBackground(page, seed)
    await page.clock.resume()

    const item = await fileMenuItem(page, 'Import value stream')
    await expect(item).toBeVisible()
    await expect(item).toHaveAccessibleDescription(/file to this workspace/)
    await expect(
      menuItem(page, 'Export value stream')
    ).toHaveAccessibleDescription(/Save this value stream/)
    await axe()

    await page.keyboard.press('Escape')
    await importFromFileMenu(page, 'broken.json', 'this is { not json')
    await expect(importError(page)).toBeVisible()
    await axe()
  })

  test('The home import button and its error have no accessibility violations', async ({
    page,
    seed,
    axe,
  }) => {
    await startOnHome(page, seed)
    await page.clock.resume()

    await importFromHome(page, 'broken.json', 'this is { not json')
    await expect(importError(page)).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Import value stream', exact: true })
    ).toBeVisible()
    await axe()
  })
})

test.describe('Name rules and undo across visits (slice 9 follow-up)', () => {
  // Two places to change a name. `rename` types the name and stays where it
  // was typed, `error` finds the refusal shown there and `backHome` then leaves
  // that place for the home screen.
  const PLACES = [
    {
      place: 'the home screen',
      rename: (page, typed) => renameStream(page, 'Onboarding', typed),
      error: (page) => page.getByTestId('rename-error'),
      backHome: (page) => page.keyboard.press('Escape'),
    },
    {
      place: 'the value stream name field',
      rename: async (page, typed) => {
        await openStream(page, 'Onboarding')
        await streamName(page).fill(typed)
        await streamName(page).press('Enter')
      },
      error: (page) => page.getByTestId('name-error'),
      backHome: (page) => openAllValueStreams(page),
    },
  ]

  const savedNames = async (page) =>
    (await savedStreams(page)).map((stream) => stream.name)

  // Typed text a name cannot be: only space, and nothing at all.
  const BLANK_NAMES = ['   ', '']

  for (const { place, rename, error, backHome } of PLACES) {
    test(`A name is trimmed the same way at home and in the header: ${place}`, async ({
      page,
      seed,
    }) => {
      await startOnHome(page, seed)

      await rename(page, '  New hire onboarding  ')
      await backHome(page)

      await expectValueStreams(page, [
        'Checkout delivery',
        'New hire onboarding',
      ])
      await expect
        .poll(() => savedNames(page))
        .toEqual(['Checkout delivery', 'New hire onboarding'])
    })

    for (const typed of BLANK_NAMES) {
      test(`A blank name is refused the same way at home and in the header: ${place}, ${JSON.stringify(typed)}`, async ({
        page,
        seed,
      }) => {
        await startOnHome(page, seed)

        await rename(page, typed)

        await expect(error(page)).toHaveText('Add a name')
        await backHome(page)
        await expectValueStreams(page, ['Checkout delivery', 'Onboarding'])
        // Saves are written in order, so once this later one is there a save of
        // the refused name would be too.
        await duplicateStream(page, 'Checkout delivery')
        await expect.poll(() => savedNames(page)).toHaveLength(3)
        expect(await savedNames(page)).toEqual([
          'Checkout delivery',
          'Checkout delivery (copy)',
          'Onboarding',
        ])
      })
    }
  }

  test("Leaving a new value stream's name field alone keeps it unnamed", async ({
    page,
    seed,
  }) => {
    await openBackground(page, seed)
    await (await fileMenuItem(page, 'New value stream')).click()
    await expectCurrentStage(page, 'Scope')
    await expect(page.getByRole('heading', { name: 'Scope' })).toBeFocused()

    await streamName(page).focus()
    await streamName(page).press('Tab')

    // Focus moved on, so leaving the field really happened.
    await expect(page.getByRole('button', { name: 'Undo' })).toBeFocused()
    await expect(page.getByTestId('name-error')).toHaveCount(0)
    await expect(streamName(page)).toHaveValue('')
    await openAllValueStreams(page)
    await expectValueStreams(page, [
      'Checkout delivery',
      'Onboarding',
      'Untitled value stream',
    ])
  })

  for (const [label, chord] of [
    ['Ctrl+Z', 'Control+z'],
    ['Cmd+Z', 'Meta+z'],
  ]) {
    test(`Undo restores a deleted value stream after a visit to another: ${label}`, async ({
      page,
      seed,
    }) => {
      const { second } = await openBackground(page, seed)
      await openAllValueStreams(page)
      await deleteStream(page, 'Checkout delivery')
      await expect(toast(page)).toContainText('Checkout delivery deleted')

      await openStream(page, 'Onboarding')
      await expect(streamName(page)).toHaveValue('Onboarding')
      await openAllValueStreams(page)

      // The toast closed with the visit; the shortcut is what is left.
      await expect(toast(page)).toHaveCount(0)
      await page.keyboard.press(chord)

      await expectValueStreams(page, ['Checkout delivery', 'Onboarding'])
      await expect(cardOf(page, 'Checkout delivery')).toContainText('5 steps')
      await expect(page.getByTestId('home-live-region')).toHaveText(
        'Checkout delivery restored'
      )
      // Saves are written in order, so once this later one is there the save
      // of the restore is too, and the active stream it left can be read.
      await duplicateStream(page, 'Onboarding')
      await expect.poll(async () => (await savedStreams(page)).length).toBe(3)
      // The stream opened since stays the active one.
      expect((await savedWorkspace(page)).activeStreamId).toBe(second.id)
    })
  }

  test('A second delete replaces the first undo', async ({ page, seed }) => {
    await startOnHome(page, seed)
    await deleteStream(page, 'Checkout delivery')
    await deleteStream(page, 'Onboarding')
    await expect(toast(page)).toHaveCount(1)
    await expect(toast(page)).toContainText('Onboarding deleted')

    await page.keyboard.press('Control+z')

    await expectValueStreams(page, ['Onboarding'])
    await pressesCtrlZUnhandled(page)
    await expectValueStreams(page, ['Onboarding'])
  })

  test('A failed undo is dropped', async ({ page, seed }) => {
    await startOnHome(page, seed)
    const { text } = await downloadedFile(page, () =>
      chooseFromMenu(page, 'Onboarding', 'Export value stream')
    )
    await deleteStream(page, 'Onboarding')
    // The file brings the deleted stream back under its own id, so Undo has
    // nothing left to restore.
    await importFromHome(page, 'Onboarding.json', text)
    await expectValueStreams(page, ['Checkout delivery', 'Onboarding'])

    await page.keyboard.press('Control+z')

    await expect(page.getByTestId('home-live-region')).toHaveText(
      'Nothing to restore'
    )
    await expectValueStreams(page, ['Checkout delivery', 'Onboarding'])
    await expect(toast(page).filter({ hasText: 'deleted' })).toHaveCount(0)
    await pressesCtrlZUnhandled(page)
  })
})
