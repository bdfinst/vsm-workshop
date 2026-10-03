import { createMapVersion } from '../../../src/models/v2/mapVersion.js'
import { createReworkPath } from '../../../src/models/v2/reworkPath.js'
import { createStep } from '../../../src/models/v2/step.js'
import {
  test,
  expect,
  savedWorkspace,
  streamName,
  workspaceAtStage,
} from './fixtures.js'

const rows = (page) => page.getByTestId('step-row')
const row = (page, position) => rows(page).nth(position - 1)
const nextButton = (page) => page.getByRole('button', { name: 'Next' })
const addStepButton = (page) => page.getByRole('button', { name: 'Add step' })
const nameField = (scope) => scope.getByLabel('Name', { exact: true })
const moveButton = (scope, direction) =>
  scope.getByRole('button', { name: new RegExp(`^move ${direction}`, 'i') })
const handoffBox = (scope) => scope.getByLabel('Handed off to another team')
// The steps of the saved stream's active version, or undefined before the first save.
// A reload only keeps what the app has already saved, so a test waits on this first.
const savedSteps = async (page) => {
  const stream = (await savedWorkspace(page))?.streams[0]
  return stream?.versions.find((v) => v.id === stream.activeVersionId)?.steps
}
const insertButton = (scope) =>
  scope.getByRole('button', { name: /insert step here/i })
const refusal = (page) => page.getByTestId('move-refusal')

const box = async (locator) => {
  const bounds = await locator.boundingBox()
  if (!bounds) throw new Error('Not drawn')
  return bounds
}

// The app keeps a toast that has an action for 10 s (ACTION_TOAST_DURATION_MS).
const UNDO_TOAST_MS = 10000
// Far longer than the toast's own wait, to show it is being held.
const HOLD_PROBE_MS = 3 * UNDO_TOAST_MS

/**
 * Stop the page clock before the app loads, so a toast's wait only passes when
 * a test says so with page.clock.runFor.
 */
const freezeClock = async (page) => {
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)
}

/** Type into a field of a row, then leave it so the edit is saved. */
const fillField = async (page, position, label, text) => {
  const field = row(page, position).getByLabel(label, { exact: true })
  await field.fill(text)
  await field.press('Tab')
}

/**
 * A workspace on the Steps stage whose steps are Intake then the named ones, in
 * order. An entry is a name, or step fields with a name. `reworkPaths` are
 * [from, to] name pairs. The Rework stage is already reached, as it is for any
 * map that has rework paths.
 */
const workspaceWithSteps = (entries, { reworkPaths = [] } = {}) => {
  const steps = ['Intake', ...entries].map((entry) =>
    createStep(typeof entry === 'string' ? { name: entry } : entry)
  )
  const idOf = (name) => steps.find((step) => step.name === name).id
  const version = createMapVersion({
    steps,
    reworkPaths: reworkPaths.map(([from, to]) =>
      createReworkPath({ fromStepId: idOf(from), toStepId: idOf(to) })
    ),
  })
  return workspaceAtStage(2, {
    versions: [version],
    session: { activeStage: 2, furthestStage: 5 },
  })
}

/** The names shown in the step list, in order. */
const stepNames = (page) =>
  rows(page).evaluateAll((items) =>
    items.map((item) => {
      const input = item.querySelector('[data-field="name"]')
      return input
        ? input.value
        : item.querySelector('[data-testid="step-name"]').textContent
    })
  )

/** The saved step with this name, once the app has saved it. */
const savedStep = async (page, name) =>
  (await savedWorkspace(page))?.streams[0].versions[0].steps.find(
    (step) => step.name === name
  )

/** The saved rework paths as [from, to] step names. */
const savedReworkPaths = async (page) => {
  const version = (await savedWorkspace(page))?.streams[0].versions[0]
  const nameOf = (id) => version?.steps.find((step) => step.id === id)?.name
  return version?.reworkPaths.map((path) => [
    nameOf(path.fromStepId),
    nameOf(path.toStepId),
  ])
}

test.describe('A new map on the Steps stage', () => {
  test.beforeEach(async ({ seed }) => {
    await seed(workspaceAtStage(2))
  })

  // What "not available" means for each control on the Intake row.
  const INTAKE_CONTROLS = [
    [
      'delete button',
      (intake) => intake.getByRole('button', { name: /delete/i }),
    ],
    ['move buttons', (intake) => intake.getByRole('button', { name: /move/i })],
    ['name field', (intake) => nameField(intake)],
    ['outside toggle', (intake) => intake.getByLabel(/outside/i)],
  ]

  for (const [control, findControl] of INTAKE_CONTROLS) {
    test(`Intake is locked: ${control}`, async ({ page }) => {
      await expect(row(page, 1)).toContainText('Intake')
      await expect(row(page, 1)).toContainText(/always first/i)

      await expect(findControl(row(page, 1))).toHaveCount(0)
    })
  }

  test('Other steps have a name field', async ({ page }) => {
    await addStepButton(page).click()

    await expect(nameField(row(page, 2))).toBeVisible()
  })

  test('Intake description and performer are editable', async ({ page }) => {
    await fillField(page, 1, 'Description', 'Request logged')
    await fillField(page, 1, 'Performed by', 'Product owner')

    const intake = row(page, 1)
    await expect(intake.getByLabel('Description')).toHaveValue('Request logged')
    await expect(intake.getByLabel('Performed by')).toHaveValue('Product owner')
    await expect
      .poll(async () => {
        const intakeStep = (await savedSteps(page))?.[0]
        return [intakeStep?.description, intakeStep?.performedBy]
      })
      .toEqual(['Request logged', 'Product owner'])

    await page.reload()
    await expect(row(page, 1).getByLabel('Description')).toHaveValue(
      'Request logged'
    )
    await expect(row(page, 1).getByLabel('Performed by')).toHaveValue(
      'Product owner'
    )
  })

  test('Add a step with name, description, performer and handoff', async ({
    page,
  }) => {
    await addStepButton(page).click()
    await fillField(page, 2, 'Name', 'Refinement')
    await fillField(page, 2, 'Description', 'Stories split and sized')
    await fillField(page, 2, 'Performed by', 'Dev team')
    await handoffBox(row(page, 2)).check()

    const refinement = row(page, 2)
    await expect(rows(page)).toHaveCount(2)
    await expect(nameField(refinement)).toHaveValue('Refinement')
    await expect(refinement.getByLabel('Description')).toHaveValue(
      'Stories split and sized'
    )
    await expect(refinement.getByLabel('Performed by')).toHaveValue('Dev team')
    await expect(handoffBox(refinement)).toBeChecked()
    await expect(handoffBox(row(page, 1))).not.toBeChecked()
    await expect
      .poll(async () => {
        const saved = (await savedSteps(page))?.[1]
        return [saved?.name, saved?.performedBy, saved?.isHandoff]
      })
      .toEqual(['Refinement', 'Dev team', true])

    await page.reload()
    await expect(rows(page)).toHaveCount(2)
    await expect(nameField(row(page, 2))).toHaveValue('Refinement')
    await expect(handoffBox(row(page, 2))).toBeChecked()
  })

  test('A new step starts with its name field focused', async ({ page }) => {
    await addStepButton(page).click()

    await expect(nameField(row(page, 2))).toBeFocused()
  })

  test('Starter suggestion adds a step', async ({ page }) => {
    const suggestions = page.getByRole('group', { name: 'Starter suggestions' })
    await suggestions.getByRole('button', { name: /^development$/i }).click()

    await suggestions.getByRole('button', { name: /^code review$/i }).click()

    await expect(rows(page)).toHaveCount(3)
    await expect(nameField(row(page, 3))).toHaveValue(/^code review$/i)
    await expect(row(page, 3).getByLabel('Description')).not.toHaveValue('')
    await expect(nameField(row(page, 2))).toHaveValue(/^development$/i)
  })

  // Next is disabled, and its accessible description is exactly the reason.
  const expectReason = async (page, reason) => {
    await expect(nextButton(page)).toHaveAttribute('aria-disabled', 'true')
    await expect(nextButton(page)).toHaveAccessibleDescription(reason)
  }

  test('Next needs at least two steps with names and performers', async ({
    page,
  }) => {
    await fillField(page, 1, 'Performed by', 'Product owner')
    await expectReason(page, 'Add at least one step after Intake')

    await addStepButton(page).click()
    await expect(row(page, 2)).toContainText('Name required')

    await nameField(row(page, 2)).fill('Refinement')
    await expect(row(page, 2)).not.toContainText('Name required')
    await expectReason(page, 'Add who does "Refinement"')

    await row(page, 2).getByLabel('Performed by').fill('Dev team')
    await expect(nextButton(page)).not.toHaveAttribute('aria-disabled', 'true')

    await nextButton(page).click()
    await expect(page.getByRole('heading', { name: 'Time' })).toBeVisible()
  })

  test('Next names the step that still needs a performer, Intake included', async ({
    page,
  }) => {
    await addStepButton(page).click()
    await nameField(row(page, 2)).fill('Refinement')
    await row(page, 2).getByLabel('Performed by').fill('Dev team')

    await expectReason(page, 'Add who does "Intake"')
  })

  test('the Steps stage has no accessibility violations', async ({
    page,
    axe,
  }) => {
    await expect(page.getByTestId('steps-stage')).toBeVisible()
    await axe({ include: '[data-testid="work-region"]' })

    await addStepButton(page).click()
    await expect(row(page, 2)).toContainText('Name required')
    await axe({ include: '[data-testid="work-region"]' })

    await fillField(page, 2, 'Name', 'Refinement')
    await expectReason(page, 'Add who does "Intake"')
    await axe({ include: '[data-testid="work-region"]' })
  })
})

test('Any number of steps', async ({ page, seed }) => {
  const SEEDED = 40
  await seed(
    workspaceWithSteps(
      Array.from({ length: SEEDED }, (_, index) => `Step ${index + 1}`)
    )
  )
  await expect(rows(page)).toHaveCount(SEEDED + 1)

  await addStepButton(page).click()

  await expect(rows(page)).toHaveCount(SEEDED + 2)
  await expect(nameField(row(page, SEEDED + 2))).toBeFocused()
})

test('Enter saves a text field without leaving it', async ({ page, seed }) => {
  await seed(workspaceWithSteps(['Development']))
  const performer = row(page, 2).getByLabel('Performed by')

  await performer.fill('Dev team')
  await performer.press('Enter')

  await expect
    .poll(async () => (await savedStep(page, 'Development'))?.performedBy)
    .toBe('Dev team')
  await expect(performer).toBeFocused()
})

test('Text is trimmed when it is saved', async ({ page, seed }) => {
  await seed(workspaceWithSteps(['Development']))

  await fillField(page, 2, 'Name', '  Refinement  ')

  await expect(nameField(row(page, 2))).toHaveValue('Refinement')
  await expect
    .poll(async () => Boolean(await savedStep(page, 'Refinement')))
    .toBe(true)
})

test("Clearing a saved step's name asks for a name again", async ({
  page,
  seed,
}) => {
  await seed(workspaceWithSteps(['Development']))
  await expect(row(page, 2)).not.toContainText('Name required')

  await fillField(page, 2, 'Name', '')

  await expect(row(page, 2)).toContainText('Name required')
  await expect(nextButton(page)).toHaveAttribute('aria-disabled', 'true')
})

test('Insert a step between two steps', async ({ page, seed }) => {
  await seed(workspaceWithSteps(['Development', 'Deploy']))

  await insertButton(row(page, 2)).click()
  await nameField(row(page, 3)).fill('Code review')

  await expect
    .poll(() => stepNames(page))
    .toEqual(['Intake', 'Development', 'Code review', 'Deploy'])
  await expect(nameField(row(page, 3))).toBeFocused()
})

test('Move a step down', async ({ page, seed }) => {
  await seed(workspaceWithSteps(['Development', 'Deploy']))

  const moveDown = moveButton(row(page, 2), 'down')
  await moveDown.click()

  await expect
    .poll(() => stepNames(page))
    .toEqual(['Intake', 'Deploy', 'Development'])
  await expect(moveButton(row(page, 3), 'down')).toBeFocused()
  await expect(moveButton(row(page, 3), 'down')).toHaveAccessibleName(
    /development/i
  )
  await expect(page.getByTestId('live-region')).toHaveText(
    'Development moved to position 3'
  )
})

test('Reorder a step: the Move up button', async ({ page, seed }) => {
  await seed(workspaceWithSteps(['Deploy', 'Development']))

  await moveButton(row(page, 3), 'up').click()

  await expect
    .poll(() => stepNames(page))
    .toEqual(['Intake', 'Development', 'Deploy'])
  await expect(moveButton(row(page, 2), 'up')).toBeFocused()
  await expect(page.getByTestId('live-region')).toHaveText(
    'Development moved to position 2'
  )
})

test("A step can't move above Intake", async ({ page, seed }) => {
  await seed(workspaceWithSteps(['Development']))

  const moveUp = moveButton(row(page, 2), 'up')
  await expect(moveUp).toHaveAttribute('aria-disabled', 'true')
  await expect(moveUp).toHaveAccessibleDescription('Intake is always first')

  await moveUp.click({ force: true })
  await expect.poll(() => stepNames(page)).toEqual(['Intake', 'Development'])
})

test('A step can only be inserted below Intake, never above it', async ({
  page,
  seed,
}) => {
  await seed(workspaceWithSteps(['Development']))

  await expect(insertButton(page)).toHaveCount(1)
  await expect(insertButton(row(page, 1))).toHaveCount(1)
})

test('Reorder a step: Alt+Up', async ({ page, seed }) => {
  await seed(workspaceWithSteps(['Deploy', 'Development']))

  const name = nameField(row(page, 3))
  await name.focus()
  await page.keyboard.press('Alt+ArrowUp')

  await expect
    .poll(() => stepNames(page))
    .toEqual(['Intake', 'Development', 'Deploy'])
  await expect(nameField(row(page, 2))).toBeFocused()
  await expect(page.getByTestId('live-region')).toHaveText(
    'Development moved to position 2'
  )
})

test('Alt+Down moves a step down, and stops at the ends', async ({
  page,
  seed,
}) => {
  await seed(workspaceWithSteps(['Development', 'Deploy']))

  await nameField(row(page, 2)).focus()
  const MOVED_DOWN = ['Intake', 'Deploy', 'Development']
  const MOVED_BACK = ['Intake', 'Development', 'Deploy']

  await page.keyboard.press('Alt+ArrowDown')
  await expect.poll(() => stepNames(page)).toEqual(MOVED_DOWN)

  // Now last: no further down.
  await page.keyboard.press('Alt+ArrowDown')
  await expect.poll(() => stepNames(page)).toEqual(MOVED_DOWN)

  await page.keyboard.press('Alt+ArrowUp')
  await expect.poll(() => stepNames(page)).toEqual(MOVED_BACK)

  // Now right below Intake: no further up.
  await page.keyboard.press('Alt+ArrowUp')
  await expect.poll(() => stepNames(page)).toEqual(MOVED_BACK)
})

test('Reorder a step: drag and drop', async ({ page, seed }) => {
  await seed(workspaceWithSteps(['Deploy', 'Development']))
  const dragged = row(page, 3)
  const target = row(page, 2)
  // Bring both rows into view together: the target row at the top of the
  // window (scrollIntoViewIfNeeded on each row in turn leaves the target half
  // above the window, so the drag would then scroll the page).
  await target.evaluate((element) => element.scrollIntoView({ block: 'start' }))
  // The pinned summary strip covers the bottom of the window. A drag that
  // starts or ends under it, or has to scroll between its two ends, moves the
  // page under the pointer, so both rows must be clear of it before dragging.
  const stripTop = (await box(page.getByTestId('strip-region'))).y
  const targetBox = await box(target)
  const draggedBox = await box(dragged)
  expect(targetBox.y).toBeGreaterThanOrEqual(0)
  expect(draggedBox.y + draggedBox.height).toBeLessThanOrEqual(stripTop)

  await dragged.getByTestId('drag-handle').dragTo(target)

  await expect
    .poll(() => stepNames(page))
    .toEqual(['Intake', 'Development', 'Deploy'])
  await expect(page.getByTestId('live-region')).toHaveText(
    'Development moved to position 2'
  )
})

test('Dropping a step on Intake is refused', async ({ page, seed }) => {
  await seed(workspaceWithSteps(['Development']))

  await row(page, 2).getByTestId('drag-handle').dragTo(row(page, 1))

  await expect(refusal(page)).toHaveText(/Intake is always first/)
  await expect.poll(() => stepNames(page)).toEqual(['Intake', 'Development'])
})

test('Intake cannot be dragged', async ({ page }) => {
  await expect(row(page, 1).getByTestId('drag-handle')).toHaveCount(0)
})

test('A move that would point a rework path forward is refused', async ({
  page,
  seed,
}) => {
  await seed(
    workspaceWithSteps(['Development', 'Deploy'], {
      reworkPaths: [['Deploy', 'Development']],
    })
  )

  await moveButton(row(page, 3), 'up').click()

  const message = refusal(page)
  await expect(message).toContainText(
    'A rework path would point forward — remove or change it first'
  )
  await expect
    .poll(() => stepNames(page))
    .toEqual(['Intake', 'Development', 'Deploy'])

  await message.getByRole('button', { name: /rework/i }).click()
  await expect(page.getByRole('heading', { name: 'Rework' })).toBeVisible()
})

test('A refusal clears when the next move works', async ({ page, seed }) => {
  await seed(
    workspaceWithSteps(['Development', 'Deploy', 'Release'], {
      reworkPaths: [['Deploy', 'Development']],
    })
  )
  await moveButton(row(page, 3), 'up').click()
  await expect(refusal(page)).toBeVisible()

  await moveButton(row(page, 4), 'up').click()

  await expect
    .poll(() => stepNames(page))
    .toEqual(['Intake', 'Development', 'Release', 'Deploy'])
  await expect(refusal(page)).toHaveCount(0)
})

test('the Steps stage move and insert controls have no accessibility violations', async ({
  page,
  seed,
  axe,
}) => {
  await seed(
    workspaceWithSteps(['Development', 'Deploy'], {
      reworkPaths: [['Deploy', 'Development']],
    })
  )
  await axe({ include: '[data-testid="work-region"]' })

  await moveButton(row(page, 3), 'up').click()
  await expect(refusal(page)).toBeVisible()
  await axe({ include: '[data-testid="work-region"]' })
})

const outsideToggle = (item) => item.getByLabel('Outside team', { exact: true })
const confirmDialog = (page) => page.getByRole('alertdialog')
const deleteButton = (page, name) =>
  page.getByRole('button', { name: `Delete ${name}`, exact: true })
const undoToast = (page) => page.getByTestId('toast-message')
const TOAST_UNDO = { name: 'Undo', exact: true }

const WITH_REWORK = {
  steps: ['Development', 'Deploy'],
  options: { reworkPaths: [['Deploy', 'Development']] },
}
const seedWithRework = (seed) =>
  seed(workspaceWithSteps(WITH_REWORK.steps, WITH_REWORK.options))

/** Delete Development (it has a rework path) and confirm. */
const deleteDevelopment = async (page) => {
  await deleteButton(page, 'Development').click()
  await confirmDialog(page).getByRole('button', { name: 'Delete' }).click()
}

/** Insert "Security review" between two steps, performed by InfoSec, as outside. */
const addOutsideSecurityReview = async (page, seed) => {
  await seed(workspaceWithSteps(['Code review', 'Deploy']))
  await insertButton(row(page, 2)).click()
  await fillField(page, 3, 'Name', 'Security review')
  await fillField(page, 3, 'Performed by', 'InfoSec')
  await outsideToggle(row(page, 3)).check()
}

test('Mark a step as outside', async ({ page, seed }) => {
  await addOutsideSecurityReview(page, seed)

  await expect(confirmDialog(page)).toHaveCount(0)
  const security = row(page, 3)
  await expect(security.getByTestId('outside-marker')).toHaveText('outside')
  await expect(security.getByTestId('outside-hatch')).toBeVisible()
  await expect(handoffBox(security)).toBeChecked()
  await expect(handoffBox(security)).toBeDisabled()
  await expect(row(page, 2).getByTestId('outside-marker')).toHaveCount(0)
  await expect(row(page, 2).getByTestId('outside-hatch')).toHaveCount(0)
})

test('An outside step is saved as outside and handed off', async ({
  page,
  seed,
}) => {
  await addOutsideSecurityReview(page, seed)

  await expect
    .poll(async () => (await savedStep(page, 'Security review'))?.kind)
    .toBe('outside')
  expect((await savedStep(page, 'Security review')).isHandoff).toBe(true)
})

test('Switching kind asks first', async ({ page, seed }) => {
  await seed(
    workspaceWithSteps([
      {
        name: 'Code review',
        processTime: { typ: 60 },
        waitTime: { typ: 2880 },
      },
    ])
  )
  const codeReview = row(page, 2)

  await outsideToggle(codeReview).click()
  await expect(confirmDialog(page)).toContainText(
    'Its process time and wait time will be cleared'
  )
  await confirmDialog(page).getByRole('button', { name: 'Cancel' }).click()

  await expect(confirmDialog(page)).toHaveCount(0)
  await expect(outsideToggle(codeReview)).not.toBeChecked()
  await expect(outsideToggle(codeReview)).toBeFocused()
  await expect(codeReview.getByTestId('outside-marker')).toHaveCount(0)
  const kept = await savedStep(page, 'Code review')
  expect([kept.kind, kept.processTime.typ, kept.waitTime.typ]).toEqual([
    'team',
    60,
    2880,
  ])

  await outsideToggle(codeReview).click()
  await confirmDialog(page).getByRole('button', { name: 'Switch' }).click()

  await expect(outsideToggle(codeReview)).toBeChecked()
  await expect(outsideToggle(codeReview)).toBeFocused()
  await expect
    .poll(async () => (await savedStep(page, 'Code review')).kind)
    .toBe('outside')
  const cleared = await savedStep(page, 'Code review')
  expect([cleared.processTime, cleared.waitTime]).toEqual([
    undefined,
    undefined,
  ])
})

test('Switching an outside step back to team asks before clearing its elapsed time', async ({
  page,
  seed,
}) => {
  await seed(
    workspaceWithSteps([
      { name: 'Security review', kind: 'outside', elapsedTime: { typ: 480 } },
    ])
  )

  await outsideToggle(row(page, 2)).click()
  await expect(confirmDialog(page)).toContainText(
    'Its elapsed time will be cleared'
  )
  await confirmDialog(page).getByRole('button', { name: 'Switch' }).click()

  await expect(outsideToggle(row(page, 2))).not.toBeChecked()
  await expect(handoffBox(row(page, 2))).toBeEnabled()
  await expect
    .poll(async () => (await savedStep(page, 'Security review')).kind)
    .toBe('team')
  expect((await savedStep(page, 'Security review')).elapsedTime).toBe(undefined)
})

test.describe('Deleting a step', () => {
  test.beforeEach(async ({ page }) => {
    await freezeClock(page)
  })

  test('Delete with confirm and undo', async ({ page, seed }) => {
    await seedWithRework(seed)

    await deleteButton(page, 'Development').click()

    await expect(confirmDialog(page)).toContainText(
      'Delete Development? 1 rework path will be removed.'
    )
    await expect(
      confirmDialog(page).getByRole('button', { name: 'Cancel' })
    ).toBeFocused()
    await confirmDialog(page).getByRole('button', { name: 'Delete' }).click()

    await expect(undoToast(page)).toContainText('Development deleted')
    await expect.poll(() => stepNames(page)).toEqual(['Intake', 'Deploy'])

    await undoToast(page).getByRole('button', TOAST_UNDO).click()

    await expect
      .poll(() => stepNames(page))
      .toEqual(['Intake', 'Development', 'Deploy'])
    await expect(undoToast(page)).toHaveCount(0)
    await expect
      .poll(() => savedReworkPaths(page))
      .toEqual([['Deploy', 'Development']])
  })

  test('Cancelling a delete keeps the step', async ({ page, seed }) => {
    await seedWithRework(seed)

    await deleteButton(page, 'Development').click()
    await confirmDialog(page).getByRole('button', { name: 'Cancel' }).click()

    await expect(confirmDialog(page)).toHaveCount(0)
    await expect(undoToast(page)).toHaveCount(0)
    await expect
      .poll(() => stepNames(page))
      .toEqual(['Intake', 'Development', 'Deploy'])
    await expect(deleteButton(page, 'Development')).toBeFocused()
  })

  test('Escape cancels a delete', async ({ page, seed }) => {
    await seedWithRework(seed)

    await deleteButton(page, 'Development').click()
    await page.keyboard.press('Escape')

    await expect(confirmDialog(page)).toHaveCount(0)
    await expect
      .poll(() => stepNames(page))
      .toEqual(['Intake', 'Development', 'Deploy'])
  })

  test('Delete a step with no data needs no confirm', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWithSteps(['Draft step']))

    await deleteButton(page, 'Draft step').click()

    await expect(confirmDialog(page)).toHaveCount(0)
    await expect.poll(() => stepNames(page)).toEqual(['Intake'])
    await expect(undoToast(page)).toContainText('Draft step deleted')
  })

  test('A delete confirm tells how many rework paths go with a step', async ({
    page,
    seed,
  }) => {
    await seed(
      workspaceWithSteps(['Development', 'Deploy', 'Release'], {
        reworkPaths: [
          ['Deploy', 'Development'],
          ['Release', 'Development'],
        ],
      })
    )

    await deleteButton(page, 'Development').click()

    await expect(confirmDialog(page)).toContainText(
      'Delete Development? 2 rework paths will be removed.'
    )
  })

  test('A step with data asks before it is deleted', async ({ page, seed }) => {
    await seed(
      workspaceWithSteps([{ name: 'Refinement', performedBy: 'Dev team' }])
    )

    await deleteButton(page, 'Refinement').click()

    await expect(confirmDialog(page)).toContainText('Delete Refinement?')
    await expect(confirmDialog(page)).not.toContainText('rework path')
  })

  test("Focus moves to the row that takes the deleted step's place", async ({
    page,
    seed,
  }) => {
    await seed(workspaceWithSteps(['Development', 'Deploy']))

    await deleteButton(page, 'Development').click()
    await expect(nameField(row(page, 2))).toBeFocused()

    await deleteButton(page, 'Deploy').click()
    await expect(row(page, 1).getByLabel('Description')).toBeFocused()
  })

  test('The toolbar Undo still undoes a delete after the toast closes', async ({
    page,
    seed,
  }) => {
    await seedWithRework(seed)
    await deleteDevelopment(page)
    await expect(undoToast(page)).toBeVisible()

    await page.clock.runFor(UNDO_TOAST_MS - 1)
    await expect(undoToast(page)).toBeVisible()
    await page.clock.runFor(1)
    await expect(undoToast(page)).toHaveCount(0)

    await page.getByRole('button', { name: 'Undo', exact: true }).click()

    await expect
      .poll(() => stepNames(page))
      .toEqual(['Intake', 'Development', 'Deploy'])
  })

  /** After the hold ends the toast still waits its full time, then goes. */
  const expectToastWaitsFullTime = async (page) => {
    await page.clock.runFor(UNDO_TOAST_MS - 1)
    await expect(undoToast(page)).toBeVisible()
    await page.clock.runFor(1)
    await expect(undoToast(page)).toHaveCount(0)
  }

  const undoButton = (page) => undoToast(page).getByRole('button', TOAST_UNDO)
  const moveMouseAway = (page) => page.mouse.move(0, 0)
  const focusElsewhere = (page) => streamName(page).focus()

  test('The Undo toast waits while the pointer is on it', async ({
    page,
    seed,
  }) => {
    await seedWithRework(seed)
    await deleteDevelopment(page)

    await undoToast(page).hover()
    await page.clock.runFor(HOLD_PROBE_MS)
    await expect(undoToast(page)).toBeVisible()

    await moveMouseAway(page)
    await expectToastWaitsFullTime(page)
  })

  test('The Undo toast waits while focus is on it', async ({ page, seed }) => {
    await seedWithRework(seed)
    await deleteDevelopment(page)

    await undoButton(page).focus()
    await page.clock.runFor(HOLD_PROBE_MS)
    await expect(undoToast(page)).toBeVisible()

    await focusElsewhere(page)
    await expectToastWaitsFullTime(page)
  })

  test('The Undo toast keeps waiting when the pointer leaves but focus stays', async ({
    page,
    seed,
  }) => {
    await seedWithRework(seed)
    await deleteDevelopment(page)
    await undoToast(page).hover()
    await undoButton(page).focus()

    await moveMouseAway(page)
    await page.clock.runFor(HOLD_PROBE_MS)
    await expect(undoToast(page)).toBeVisible()

    await focusElsewhere(page)
    await expectToastWaitsFullTime(page)
  })

  test('The Undo toast keeps waiting when focus leaves but the pointer stays', async ({
    page,
    seed,
  }) => {
    await seedWithRework(seed)
    await deleteDevelopment(page)
    await undoButton(page).focus()
    await undoToast(page).hover()

    await focusElsewhere(page)
    await page.clock.runFor(HOLD_PROBE_MS)
    await expect(undoToast(page)).toBeVisible()

    await moveMouseAway(page)
    await expectToastWaitsFullTime(page)
  })

  test('The Undo toast keeps waiting while focus moves between its controls', async ({
    page,
    seed,
  }) => {
    await seedWithRework(seed)
    await deleteDevelopment(page)

    await undoButton(page).focus()
    await page.keyboard.press('Tab')
    await expect(
      undoToast(page).getByRole('button', { name: 'Dismiss notification' })
    ).toBeFocused()
    await page.clock.runFor(HOLD_PROBE_MS)

    await expect(undoToast(page)).toBeVisible()
  })

  test('Another edit closes the Undo toast so it cannot undo the wrong change', async ({
    page,
    seed,
  }) => {
    await seedWithRework(seed)
    await deleteDevelopment(page)
    await expect(undoToast(page)).toBeVisible()

    await fillField(page, 1, 'Performed by', 'Product owner')

    await expect(undoToast(page)).toHaveCount(0)
  })

  test('the outside, kind-switch and delete controls have no accessibility violations', async ({
    page,
    seed,
    axe,
  }) => {
    await seed(
      workspaceWithSteps(
        [
          { name: 'Development', processTime: { typ: 60 } },
          {
            name: 'Security review',
            kind: 'outside',
            elapsedTime: { typ: 480 },
          },
          'Deploy',
        ],
        { reworkPaths: [['Deploy', 'Development']] }
      )
    )
    // axe needs the page's timers, so time runs for this test.
    await page.clock.resume()
    await axe({ include: '[data-testid="work-region"]' })

    await outsideToggle(row(page, 2)).click()
    await expect(confirmDialog(page)).toBeVisible()
    await axe({ include: '[data-testid="work-region"]' })
    await confirmDialog(page).getByRole('button', { name: 'Cancel' }).click()

    await deleteButton(page, 'Development').click()
    await expect(confirmDialog(page)).toBeVisible()
    await axe({ include: '[data-testid="work-region"]' })
    await confirmDialog(page).getByRole('button', { name: 'Delete' }).click()

    await expect(undoToast(page)).toBeVisible()
    // The pointer holds the toast while axe scans it.
    await undoToast(page).hover()
    await axe({ include: '[data-testid="toast-container"]' })
  })

  test('Leaving the Steps stage closes the Undo toast', async ({
    page,
    seed,
  }) => {
    await seedWithRework(seed)
    await deleteDevelopment(page)
    await expect(undoToast(page)).toBeVisible()

    await page.getByTestId('stage-scope').click()

    await expect(page.getByRole('heading', { name: 'Scope' })).toBeVisible()
    await expect(undoToast(page)).toHaveCount(0)
  })

  test('Two deletes in a row leave one Undo toast that restores only the latest', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWithSteps(['Alpha', 'Beta', 'Gamma']))

    await deleteButton(page, 'Alpha').click()
    await deleteButton(page, 'Beta').click()

    await expect(undoToast(page)).toHaveCount(1)
    await expect(undoToast(page)).toContainText('Beta deleted')

    await undoToast(page).getByRole('button', TOAST_UNDO).click()

    await expect
      .poll(() => stepNames(page))
      .toEqual(['Intake', 'Beta', 'Gamma'])
  })
})

const REFUSAL_CLEARERS = [
  ['Add step', (page) => addStepButton(page).click()],
  ['Insert step', (page) => insertButton(row(page, 2)).click()],
  ['a handoff change', (page) => handoffBox(row(page, 2)).check()],
  ['a saved edit', (page) => fillField(page, 2, 'Performed by', 'Dev team')],
]

for (const [action, clearRefusal] of REFUSAL_CLEARERS) {
  test(`A refusal clears on ${action}`, async ({ page, seed }) => {
    await seed(
      workspaceWithSteps(['Development', 'Deploy', 'Release'], {
        reworkPaths: [['Deploy', 'Development']],
      })
    )
    await moveButton(row(page, 3), 'up').click()
    await expect(refusal(page)).toBeVisible()

    await clearRefusal(page)

    await expect(refusal(page)).toHaveCount(0)
  })
}

/** Dispatch a drag event on an element; true when the page claimed the drop. */
const dragEventClaimed = (locator, type) =>
  locator.evaluate((element, eventType) => {
    const event = new DragEvent(eventType, {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer(),
    })
    element.dispatchEvent(event)
    return event.defaultPrevented
  }, type)

test('Synthetic drag events: rows accept a dragged row, not text dropped into a field', async ({
  page,
  seed,
}) => {
  await seed(workspaceWithSteps(['Deploy', 'Development']))
  const handle = row(page, 3).getByTestId('drag-handle')
  const description = row(page, 2).getByLabel('Description')

  expect(await dragEventClaimed(description, 'dragover')).toBe(false)
  expect(await dragEventClaimed(description, 'drop')).toBe(false)

  await dragEventClaimed(handle, 'dragstart')
  expect(await dragEventClaimed(description, 'dragover')).toBe(true)

  await dragEventClaimed(handle, 'dragend')
  expect(await dragEventClaimed(description, 'dragover')).toBe(false)
})
