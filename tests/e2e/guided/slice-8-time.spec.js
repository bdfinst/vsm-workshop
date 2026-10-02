import { createMapVersion } from '../../../src/models/v2/mapVersion.js'
import { createStep } from '../../../src/models/v2/step.js'
import { test, expect, savedWorkspace, workspaceAtStage } from './fixtures.js'

const TIME_STAGE = 3

// "Given a working day of 8 hours": the value stream's default.
const WORKDAY_LABEL = 'working days (8 h)'

const nextButton = (page) => page.getByRole('button', { name: 'Next' })

/** The Time stage's row for the step with this name. */
const rowOf = (page, name) =>
  page
    .getByTestId('time-row')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })

/**
 * A workspace on the Time stage whose steps are Intake, Development, Code
 * review and Deploy, then any outside steps. No times are entered unless
 * `timed` is set, which gives every step typical times; `times` then overrides
 * the time fields of the named steps.
 */
const workspaceOnTime = ({ outside = [], timed = false, times = {} } = {}) => {
  const teamTimes = timed
    ? { processTime: { typ: 60 }, waitTime: { typ: 120 } }
    : {}
  const outsideTimes = timed ? { elapsedTime: { typ: 240 } } : {}
  const steps = [
    ...['Intake', 'Development', 'Code review', 'Deploy'].map((name) =>
      createStep({ name, ...teamTimes, ...times[name] })
    ),
    ...outside.map((name) =>
      createStep({ name, kind: 'outside', ...outsideTimes, ...times[name] })
    ),
  ]
  return workspaceAtStage(TIME_STAGE, {
    versions: [createMapVersion({ steps })],
    session: { activeStage: TIME_STAGE, furthestStage: TIME_STAGE },
  })
}

/** The saved step with this name, once the app has saved it. */
const savedStep = async (page, name) =>
  (await savedWorkspace(page))?.streams[0].versions[0].steps.find(
    (step) => step.name === name
  )

/**
 * Type a duration into one of a row's time fields, then leave the last field
 * so the edit is saved. `kind` is "process", "wait" or "elapsed"; `unit` is
 * "minutes", "hours" or "days"; the unit is set before the numbers, which are
 * read in it.
 */
const enterTime = async (row, kind, { typ, min, max, unit }) => {
  const id = `${kind}-time`
  if (unit) await row.getByTestId(`${id}-unit-select`).selectOption(unit)
  const fields = [
    [`${id}-input`, typ],
    [`${id}-min-input`, min],
    [`${id}-max-input`, max],
  ].filter(([, text]) => text !== undefined)
  for (const [testid, text] of fields) {
    await row.getByTestId(testid).fill(text)
  }
  await row.getByTestId(fields.at(-1)[0]).press('Tab')
}

// Next is disabled, and its accessible description is exactly the reason.
const expectReason = async (page, reason) => {
  await expect(nextButton(page)).toHaveAttribute('aria-disabled', 'true')
  await expect(nextButton(page)).toHaveAccessibleDescription(reason)
}

test.describe('The Time stage', () => {
  test('Enter process and wait time in working units', async ({
    page,
    seed,
  }) => {
    await seed(workspaceOnTime())
    const development = rowOf(page, 'Development')

    await enterTime(development, 'process', { typ: '8', unit: 'hours' })
    await enterTime(development, 'wait', { typ: '2', unit: 'days' })

    await expect
      .poll(() => savedStep(page, 'Development'))
      .toMatchObject({ processTime: { typ: 480 }, waitTime: { typ: 960 } })
    await expect(
      development.getByTestId('wait-time-unit-select').locator('option:checked')
    ).toHaveText(WORKDAY_LABEL)
  })

  test("Intake's times are editable", async ({ page, seed }) => {
    await seed(workspaceOnTime())
    const intake = rowOf(page, 'Intake')

    await enterTime(intake, 'process', { typ: '60', unit: 'minutes' })
    await enterTime(intake, 'wait', { typ: '5', unit: 'days' })

    await expect
      .poll(() => savedStep(page, 'Intake'))
      .toMatchObject({ processTime: { typ: 60 }, waitTime: { typ: 2400 } })
  })

  test('Outside step takes one elapsed time', async ({ page, seed }) => {
    await seed(workspaceOnTime({ outside: ['Security review'] }))
    const security = rowOf(page, 'Security review')

    await expect(
      security.getByLabel('elapsed, submitted → returned')
    ).toBeVisible()
    await expect(security.getByRole('textbox')).toHaveCount(1)
    await expect(security.getByTestId('process-time-input')).toHaveCount(0)
    await expect(security.getByTestId('wait-time-input')).toHaveCount(0)
    await expect(security.getByText(/process time|wait time/i)).toHaveCount(0)
  })

  test('Optional min and max', async ({ page, seed }) => {
    await seed(workspaceOnTime())

    await enterTime(rowOf(page, 'Code review'), 'wait', {
      typ: '2',
      min: '1',
      max: '5',
      unit: 'days',
    })

    await expect
      .poll(() => savedStep(page, 'Code review'))
      .toMatchObject({ waitTime: { min: 480, typ: 960, max: 2400 } })
  })

  const INVALID_INPUTS = [
    {
      input: 'process time -1 minutes',
      message: "Process time can't be negative",
      kind: 'process',
      errorTestid: 'process-time-error',
      entry: { typ: '-1', unit: 'minutes' },
      saved: { processTime: { typ: 60 }, waitTime: { typ: 120 } },
    },
    {
      input: 'wait time "abc"',
      message: 'Enter a number',
      kind: 'wait',
      errorTestid: 'wait-time-error',
      entry: { typ: 'abc' },
      saved: { processTime: { typ: 60 }, waitTime: { typ: 120 } },
    },
    {
      input: 'wait time min 3 days and typical 2',
      message: "Min can't be more than typical",
      kind: 'wait',
      errorTestid: 'wait-time-min-error',
      entry: { typ: '2', min: '3', unit: 'days' },
      // The valid typical is saved as it is left; the refused min is not.
      saved: { processTime: { typ: 60 }, waitTime: { typ: 960 } },
    },
    {
      input: 'wait time typical 5 days and max 2',
      message: "Max can't be less than typical",
      kind: 'wait',
      errorTestid: 'wait-time-max-error',
      entry: { typ: '5', max: '2', unit: 'days' },
      // The valid typical is saved as it is left; the refused max is not.
      saved: { processTime: { typ: 60 }, waitTime: { typ: 2400 } },
    },
  ]

  for (const {
    input,
    message,
    kind,
    errorTestid,
    entry,
    saved,
  } of INVALID_INPUTS) {
    test(`Invalid times are refused with a reason: ${input}`, async ({
      page,
      seed,
    }) => {
      // Every step has times, so only the invalid entry can disable Next.
      await seed(workspaceOnTime({ timed: true }))
      const development = rowOf(page, 'Development')
      await expect(nextButton(page)).not.toHaveAttribute('aria-disabled')

      await enterTime(development, kind, entry)

      await expect(development.getByTestId(errorTestid)).toHaveText(message)
      await expect(nextButton(page)).toHaveAttribute('aria-disabled', 'true')
      await expect
        .poll(async () => {
          const { processTime, waitTime } = await savedStep(page, 'Development')
          return { processTime, waitTime }
        })
        .toEqual(saved)
    })
  }

  test('Next is allowed again once an invalid time is corrected', async ({
    page,
    seed,
  }) => {
    await seed(workspaceOnTime({ timed: true }))
    const development = rowOf(page, 'Development')
    await enterTime(development, 'wait', { typ: 'abc' })
    await expect(nextButton(page)).toHaveAttribute('aria-disabled', 'true')

    await enterTime(development, 'wait', { typ: '3', unit: 'hours' })

    await expect(development.getByRole('alert')).toHaveCount(0)
    await expect(nextButton(page)).not.toHaveAttribute('aria-disabled')
  })

  test('Zero is a valid process or wait time', async ({ page, seed }) => {
    await seed(workspaceOnTime())
    const deploy = rowOf(page, 'Deploy')

    await enterTime(deploy, 'process', { typ: '0' })
    await enterTime(deploy, 'wait', { typ: '0' })

    await expect
      .poll(() => savedStep(page, 'Deploy'))
      .toMatchObject({ processTime: { typ: 0 }, waitTime: { typ: 0 } })
    await expect(deploy.getByRole('alert')).toHaveCount(0)
    await expect(deploy.locator('[aria-invalid="true"]')).toHaveCount(0)
  })

  test('Outside elapsed time must be more than zero', async ({
    page,
    seed,
  }) => {
    await seed(workspaceOnTime({ outside: ['Security review'] }))
    const security = rowOf(page, 'Security review')

    await enterTime(security, 'elapsed', { typ: '0' })

    await expect(security.getByTestId('elapsed-time-error')).toHaveText(
      'Elapsed time must be more than 0'
    )
  })

  test('Source flag per step', async ({ page, seed }) => {
    await seed(workspaceOnTime())
    const source = (name) => rowOf(page, name).getByTestId('time-source-button')

    await source('Code review').click()

    await expect(source('Code review')).toHaveText('Measured')
    for (const other of ['Intake', 'Development', 'Deploy']) {
      await expect(source(other)).toHaveText('Estimate')
    }
    await expect
      .poll(() => savedStep(page, 'Code review'))
      .toMatchObject({ timeSource: 'measured' })
    expect(await savedStep(page, 'Development')).toMatchObject({
      timeSource: 'estimate',
    })
  })

  test('Next needs every typical time', async ({ page, seed }) => {
    await seed(
      workspaceOnTime({
        timed: true,
        times: { Deploy: { waitTime: { typ: null } } },
      })
    )

    await expectReason(page, 'Add the wait time for "Deploy"')

    await enterTime(rowOf(page, 'Deploy'), 'wait', { typ: '1', unit: 'days' })

    await expect(nextButton(page)).not.toHaveAttribute('aria-disabled')
  })

  test('Next names every missing time', async ({ page, seed }) => {
    await seed(
      workspaceOnTime({
        outside: ['Security review'],
        timed: true,
        times: {
          Intake: { processTime: { typ: null } },
          'Security review': { elapsedTime: { typ: null } },
        },
      })
    )

    await expectReason(
      page,
      'Add the process time for "Intake" and the elapsed time for "Security review"'
    )
  })

  test('Edits through the stage are single undo steps', async ({
    page,
    seed,
  }) => {
    await seed(workspaceOnTime())
    const development = rowOf(page, 'Development')
    await enterTime(development, 'process', { typ: '8', unit: 'hours' })
    await enterTime(development, 'wait', { typ: '2', unit: 'days' })

    await page.getByRole('button', { name: /undo/i }).click()

    await expect(development.getByTestId('wait-time-input')).toHaveValue('')
    await expect(development.getByTestId('process-time-input')).toHaveValue('8')
  })

  test('the Time stage has no accessibility violations', async ({
    page,
    seed,
    axe,
  }) => {
    await seed(workspaceOnTime({ outside: ['Security review'] }))
    await expect(page.getByTestId('time-stage')).toBeVisible()
    await axe({ include: '[data-testid="work-region"]' })

    await enterTime(rowOf(page, 'Development'), 'wait', { typ: 'abc' })
    await enterTime(rowOf(page, 'Security review'), 'elapsed', { typ: '0' })
    await expect(page.getByRole('alert')).toHaveCount(2)
    await axe({ include: '[data-testid="work-region"]' })
  })
})
