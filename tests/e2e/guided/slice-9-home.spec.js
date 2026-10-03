import { readFile } from 'node:fs/promises'
import { createStep as createV1Step } from '../../../src/models/StepFactory.js'
import { createMapVersion } from '../../../src/models/v2/mapVersion.js'
import { createStep } from '../../../src/models/v2/step.js'
import { createReworkPath } from '../../../src/models/v2/reworkPath.js'
import { createValueStream } from '../../../src/models/v2/valueStream.js'
import { exportValueStream } from '../../../src/persistence/v2/valueStreamJson.js'
import { createWorkspace } from '../../../src/models/v2/workspace.js'
import { STAGE_NUMBER } from '../../../src/models/v2/constants.js'
import { test, expect, savedWorkspace } from './fixtures.js'

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

const mapName = (page) => page.getByLabel('Map name')
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

test.describe('Several value streams in one workspace (slice 9.1)', () => {
  test('Home screen lists every value stream in workspace order', async ({
    page,
    seed,
  }) => {
    await openBackground(page, seed)
    await expect(mapName(page)).toHaveValue('Checkout delivery')

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

    await expect(mapName(page)).toHaveValue('Onboarding')
    await expectCurrentStage(page, 'Time')
  })

  test('A reload after visiting home reopens the value stream', async ({
    page,
    seed,
  }) => {
    await openBackground(page, seed)
    await openAllValueStreams(page)

    await page.reload()

    await expect(mapName(page)).toHaveValue('Checkout delivery')
    await expectCurrentStage(page, 'Review')
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
    await expect(mapName(page)).toHaveValue('')
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

    await expect(mapName(page)).toHaveValue('Onboarding')
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
    const { checkout } = await openBackground(page, seed)

    await openAllValueStreams(page)

    await expect
      .poll(async () => (await savedWorkspace(page))?.activeStreamId)
      .toBe(checkout.id)
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
  await page.getByLabel('Value stream name').fill(newName)
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

    await expect(page.getByText('Add a name')).toBeVisible()
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
    await expect.poll(() => stepNames(page)).not.toContain('Deploy')
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
    await expect(mapName(page)).toHaveValue('')
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
    await expect(page.getByLabel('Value stream name')).toBeVisible()
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

const importInput = (page) => page.getByTestId('import-value-stream-input')
const importError = (page) => page.getByTestId('import-error')

const importFile = (page, name, text) =>
  importInput(page).setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(text),
  })

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

    await importFile(page, 'old-map.json', v1FileWithDev())

    await expect(cardLinks(page)).toHaveCount(3)
    // The upgraded map has not reached Steps yet, so its steps are read from
    // the saved workspace rather than from the Steps stage.
    await expect
      .poll(async () =>
        withoutIds((await savedStreams(page))[2]).steps.map((s) => s.name)
      )
      .toEqual(['Intake', 'Dev'])
    await openStream(page, 'Checkout delivery')
    await stageButton(page, 'Steps').click()
    await expect.poll(() => stepNames(page)).toEqual(REFERENCE_STEPS)
  })

  test('Importing a value stream that is already in the workspace adds a copy', async ({
    page,
    seed,
  }) => {
    await startOnHome(page, seed)
    const { text } = await downloadedFile(page, () =>
      chooseFromMenu(page, 'Onboarding', 'Export value stream')
    )

    await importFile(page, 'Onboarding.json', text)

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
    await expect.poll(() => stepNames(page)).not.toContain('Training')
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

    await importFile(page, 'broken.json', 'this is { not json')

    await expect(importError(page)).toHaveText("This file isn't valid JSON")
    await expect(cardLinks(page)).toHaveCount(2)
    expect(await savedStreams(page)).toEqual(before)
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
    await importFile(page, file.name, file.text)

    await expect(cardLinks(page)).toHaveCount(3)
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
    await (await fileMenuItem(page, 'Import value stream')).click()

    await importFile(page, 'onboarding.json', exportValueStream(onboarding()))

    await expect(toast(page)).toContainText('Onboarding imported')
    await expect(mapName(page)).toHaveValue('Checkout delivery')
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
    await (await fileMenuItem(page, 'Import value stream')).click()

    await importFile(page, 'broken.json', 'this is { not json')

    await expect(importError(page)).toHaveText("This file isn't valid JSON")
    await expect(mapName(page)).toHaveValue('Checkout delivery')
    await openAllValueStreams(page)
    await expectValueStreams(page, ['Checkout delivery', 'Onboarding'])
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
    await importFile(page, 'broken.json', 'this is { not json')
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

    await importFile(page, 'broken.json', 'this is { not json')
    await expect(importError(page)).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Import value stream', exact: true })
    ).toBeVisible()
    await axe()
  })
})
