import { createMapVersion } from '../../../src/models/v2/mapVersion.js'
import { createStep } from '../../../src/models/v2/step.js'
import { STAGE_NUMBER } from '../../../src/models/v2/constants.js'
import { test, expect, savedWorkspace, workspaceAtStage } from './fixtures.js'

// "Given a working day of 8 hours": the value stream's default.
const WORKDAY_LABEL = 'working days (8 h)'
const HOUR_MINUTES = 60
const WORKDAY_MINUTES = 8 * HOUR_MINUTES

// What a `timed` workspace gives each step, in minutes.
const TYPICAL_TIMES = Object.freeze({
  team: { processTime: { typ: 60 }, waitTime: { typ: 120 } },
  outside: { elapsedTime: { typ: 240 } },
})

const nextButton = (page) => page.getByRole('button', { name: 'Next' })

/** The Time stage's row for the step with this name. */
const rowOf = (page, name) =>
  page
    .getByTestId('time-row')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })

/**
 * A workspace on the Time stage whose steps are Intake, Development, Code
 * review and Deploy, then any outside steps. No times are entered unless
 * `timed` is set, which gives every step its `TYPICAL_TIMES`; `times` then
 * overrides the time fields of the named steps. `workdayHours` is the length
 * of the working day, 8 unless given.
 */
const workspaceOnTime = ({
  outside = [],
  timed = false,
  times = {},
  workdayHours = 8,
} = {}) => {
  const teamTimes = timed ? TYPICAL_TIMES.team : {}
  const outsideTimes = timed ? TYPICAL_TIMES.outside : {}
  const steps = [
    ...['Intake', 'Development', 'Code review', 'Deploy'].map((name) =>
      createStep({ name, ...teamTimes, ...times[name] })
    ),
    ...outside.map((name) =>
      createStep({ name, kind: 'outside', ...outsideTimes, ...times[name] })
    ),
  ]
  return workspaceAtStage(STAGE_NUMBER.TIME, {
    workdayHours,
    versions: [createMapVersion({ steps })],
    session: {
      activeStage: STAGE_NUMBER.TIME,
      furthestStage: STAGE_NUMBER.TIME,
    },
  })
}

/** The saved step with this name, once the app has saved it. */
const savedStep = async (page, name) =>
  (await savedWorkspace(page))?.streams[0].versions[0].steps.find(
    (step) => step.name === name
  )

/**
 * Type a duration into one of a row's time fields, then leave the last field
 * so the edit is saved. `timeStem` is "process", "wait" or "elapsed"; `unit` is
 * "minutes", "hours" or "days"; the unit is set before the numbers, which are
 * read in it.
 */
const enterTime = async (row, timeStem, { typ, min, max, unit }) => {
  const testidPrefix = `${timeStem}-time`
  if (unit) await row.getByTestId(`${testidPrefix}-unit-select`).selectOption(unit)
  const fields = [
    [`${testidPrefix}-input`, typ],
    [`${testidPrefix}-min-input`, min],
    [`${testidPrefix}-max-input`, max],
  ].filter(([, text]) => text !== undefined)
  for (const [testid, text] of fields) {
    await row.getByTestId(testid).fill(text)
  }
  await row.getByTestId(fields.at(-1)[0]).press('Tab')
}

/**
 * Waits until every earlier edit has been saved. A later valid edit landing
 * proves saves are done, so a check that a value was not saved does not just
 * read the state before the write arrives.
 */
const settleSaves = async (page) => {
  await enterTime(rowOf(page, 'Intake'), 'process', {
    typ: '5',
    unit: 'minutes',
  })
  await expect
    .poll(() => savedStep(page, 'Intake'))
    .toMatchObject({ processTime: { typ: 5 } })
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
      .toMatchObject({
        processTime: { typ: WORKDAY_MINUTES },
        waitTime: { typ: 2 * WORKDAY_MINUTES },
      })
    await expect(
      development.getByTestId('wait-time-unit-select').locator('option:checked')
    ).toHaveText(WORKDAY_LABEL)
  })

  // Wiring check, not a Gherkin scenario
  test('A working day of 7.5 hours is labelled and converts at that length', async ({
    page,
    seed,
  }) => {
    await seed(workspaceOnTime({ workdayHours: 7.5 }))
    const development = rowOf(page, 'Development')

    await enterTime(development, 'wait', { typ: '2', unit: 'days' })

    await expect(
      development.getByTestId('wait-time-unit-select').locator('option:checked')
    ).toHaveText('working days (7.5 h)')
    await expect
      .poll(() => savedStep(page, 'Development'))
      .toMatchObject({ waitTime: { typ: 2 * 7.5 * HOUR_MINUTES } })
  })

  test("Intake's times are editable", async ({ page, seed }) => {
    await seed(workspaceOnTime())
    const intake = rowOf(page, 'Intake')

    await enterTime(intake, 'process', { typ: '60', unit: 'minutes' })
    await enterTime(intake, 'wait', { typ: '5', unit: 'days' })

    await expect
      .poll(() => savedStep(page, 'Intake'))
      .toMatchObject({
        processTime: { typ: HOUR_MINUTES },
        waitTime: { typ: 5 * WORKDAY_MINUTES },
      })
  })

  test('Outside step takes one elapsed time', async ({ page, seed }) => {
    await seed(workspaceOnTime({ outside: ['Security review'] }))
    const security = rowOf(page, 'Security review')

    await expect(
      security.getByLabel('elapsed, submitted → returned')
    ).toBeVisible()
    await expect(security.getByRole('textbox')).toHaveCount(1)
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
      .toMatchObject({
        waitTime: {
          min: WORKDAY_MINUTES,
          typ: 2 * WORKDAY_MINUTES,
          max: 5 * WORKDAY_MINUTES,
        },
      })
  })

  const INVALID_INPUTS = [
    {
      description: 'process time -1 minutes',
      message: "Process time can't be negative",
      timeStem: 'process',
      testid: 'process-time',
      entry: { typ: '-1', unit: 'minutes' },
      saved: TYPICAL_TIMES.team,
    },
    {
      description: 'wait time "abc"',
      message: 'Enter a number',
      timeStem: 'wait',
      testid: 'wait-time',
      entry: { typ: 'abc' },
      saved: TYPICAL_TIMES.team,
    },
    {
      description: 'wait time min 3 days and typical 2',
      message: "Min can't be more than typical",
      timeStem: 'wait',
      testid: 'wait-time-min',
      entry: { typ: '2', min: '3', unit: 'days' },
      // The valid typical is saved as it is left; the refused min is not.
      saved: { ...TYPICAL_TIMES.team, waitTime: { typ: 2 * WORKDAY_MINUTES } },
    },
    {
      description: 'wait time typical 5 days and max 2',
      message: "Max can't be less than typical",
      timeStem: 'wait',
      testid: 'wait-time-max',
      entry: { typ: '5', max: '2', unit: 'days' },
      // The valid typical is saved as it is left; the refused max is not.
      saved: { ...TYPICAL_TIMES.team, waitTime: { typ: 5 * WORKDAY_MINUTES } },
    },
  ]

  for (const {
    description,
    message,
    timeStem,
    testid,
    entry,
    saved,
  } of INVALID_INPUTS) {
    test(`Invalid times are refused with a reason: ${description}`, async ({
      page,
      seed,
    }) => {
      // Every step has times, so only the invalid entry can disable Next.
      await seed(workspaceOnTime({ timed: true }))
      const development = rowOf(page, 'Development')
      await expect(development).toBeVisible()
      await expect(nextButton(page)).toBeEnabled()

      await enterTime(development, timeStem, entry)

      await expect(development.getByTestId(`${testid}-error`)).toHaveText(
        message
      )
      const invalid = development.getByTestId(`${testid}-input`)
      await expect(invalid).toHaveAttribute('aria-invalid', 'true')
      await expect(invalid).toHaveAccessibleDescription(message)
      await expectReason(page, 'Fix the times that show an error')

      await settleSaves(page)
      const { processTime, waitTime } = await savedStep(page, 'Development')
      expect({ processTime, waitTime }).toEqual(saved)
    })
  }

  // Wiring check, not a Gherkin scenario
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
    await expect(nextButton(page)).toBeEnabled()
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
    const invalid = security.getByTestId('elapsed-time-input')
    await expect(invalid).toHaveAttribute('aria-invalid', 'true')
    await expect(invalid).toHaveAccessibleDescription(
      'Elapsed time must be more than 0'
    )
    await expectReason(page, 'Fix the times that show an error')
  })

  // Wiring check, not a Gherkin scenario
  test('Outside elapsed time is entered in working days', async ({
    page,
    seed,
  }) => {
    await seed(workspaceOnTime({ outside: ['Security review'] }))

    await enterTime(rowOf(page, 'Security review'), 'elapsed', {
      typ: '2',
      unit: 'days',
    })

    await expect
      .poll(() => savedStep(page, 'Security review'))
      .toMatchObject({ elapsedTime: { typ: 2 * WORKDAY_MINUTES } })
  })

  // Wiring check, not a Gherkin scenario
  test('Stored times open in the unit they read best in', async ({
    page,
    seed,
  }) => {
    await seed(
      workspaceOnTime({
        times: {
          Development: {
            waitTime: { typ: 2 * WORKDAY_MINUTES },
            processTime: { typ: 1.5 * HOUR_MINUTES },
          },
        },
      })
    )
    const development = rowOf(page, 'Development')
    const selected = (testid) =>
      development.getByTestId(`${testid}-unit-select`).locator('option:checked')

    await expect(development.getByTestId('wait-time-input')).toHaveValue('2')
    await expect(selected('wait-time')).toHaveText(WORKDAY_LABEL)
    await expect(development.getByTestId('process-time-input')).toHaveValue(
      '1.5'
    )
    await expect(selected('process-time')).toHaveText('hours')
  })

  // Wiring check, not a Gherkin scenario
  test('A unit switch only re-reads the stored time', async ({
    page,
    seed,
  }) => {
    await seed(
      workspaceOnTime({
        times: { Development: { waitTime: { typ: 2 * WORKDAY_MINUTES } } },
      })
    )
    const development = rowOf(page, 'Development')

    await development.getByTestId('wait-time-unit-select').selectOption('hours')

    await expect(development.getByTestId('wait-time-input')).toHaveValue(
      String((2 * WORKDAY_MINUTES) / HOUR_MINUTES)
    )
    await settleSaves(page)
    expect((await savedStep(page, 'Development')).waitTime).toEqual({
      typ: 2 * WORKDAY_MINUTES,
    })
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
  })

  // Wiring check, not a Gherkin scenario
  test('Marking a step Measured twice returns it to Estimate', async ({
    page,
    seed,
  }) => {
    await seed(workspaceOnTime())
    const codeReview = rowOf(page, 'Code review').getByTestId(
      'time-source-button'
    )

    await codeReview.click()
    await expect
      .poll(() => savedStep(page, 'Code review'))
      .toMatchObject({ timeSource: 'measured' })
    await codeReview.click()

    await expect(codeReview).toHaveText('Estimate')
    await expect
      .poll(() => savedStep(page, 'Code review'))
      .toMatchObject({ timeSource: 'estimate' })
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

    await expect(nextButton(page)).toBeEnabled()
  })

  // Wiring check, not a Gherkin scenario
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

  // Wiring check, not a Gherkin scenario
  test('Undo reverts the last time edit', async ({ page, seed }) => {
    await seed(workspaceOnTime())
    const development = rowOf(page, 'Development')
    await enterTime(development, 'process', { typ: '8', unit: 'hours' })
    await enterTime(development, 'wait', { typ: '2', unit: 'days' })

    await page.getByRole('button', { name: 'Undo', exact: true }).click()

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
    await expect(page.getByTestId('time-stage').getByRole('alert')).toHaveCount(
      2
    )
    await axe({ include: '[data-testid="work-region"]' })
  })
})
