import { createMapVersion } from '../../../src/models/v2/mapVersion.js'
import { createStep } from '../../../src/models/v2/step.js'
import { STAGE_NAMES, STAGE_NUMBER } from '../../../src/models/v2/constants.js'
import {
  REFERENCE_WORKDAY_HOURS,
  insertAfter,
  outsideStep,
  referenceSteps,
  reworkSteps,
  team,
  withStep,
  withoutWait,
} from '../../unit/v2/stepFixtures.js'
import { test, expect, workspaceAtStage } from './fixtures.js'

// Slice 10 scenarios: the ladder (Step 10.2) and the summary strip (Step 10.3).
// A scenario split across the two carries its half in the title.

const SIX_TIMES = 6 // Code review's wait (2880) over Refinement's (480)
const STEP_COUNT_OF_A_LONG_STREAM = 41

const NARROW_VIEWPORT = { width: 400, height: 800 }
const DASHED_STROKE_DASH = '6px, 4px' // the computed form of the "6 4" dash pattern
const SM_BREAKPOINT = 640 // Tailwind `sm`: the strip collapses below it
const CJK_NAME = '価値流れ図の作成と改善のための手順書一覧' // 20 characters, each about an em wide
const ALL_CAPS_NAME = 'WORLDWIDE MEDIA MANAGEMENT WAREHOUSE' // wide bold capitals

/** A workspace on `stage` whose map has these steps. */
const workspaceWith = (
  steps,
  stage = STAGE_NUMBER.TIME,
  furthestStage = stage
) =>
  workspaceAtStage(stage, {
    workdayHours: REFERENCE_WORKDAY_HOURS,
    versions: [createMapVersion({ steps })],
    session: { activeStage: stage, furthestStage },
  })

const longStream = () =>
  Array.from({ length: STEP_COUNT_OF_A_LONG_STREAM }, (_, index) =>
    team(index === 0 ? 'Intake' : `Step ${index}`, 60, 120)
  )

const strip = (page) => page.getByTestId('summary-strip')
const figure = (page, id) => page.getByTestId(`summary-${id}`)
const figureValue = (page, id) => figure(page, id).locator('dd').first()

const stepOf = (page, name) =>
  page
    .getByTestId('ladder-step')
    .filter({ has: page.getByText(name, { exact: true }) })

const box = async (locator) => {
  const bounds = await locator.boundingBox()
  if (!bounds) throw new Error('Not drawn')
  return bounds
}

// The drawn (not stroked) width of one step's wait over another's. The ladder
// refits the pane after an edit, so widths are only compared as a ratio.
const waitRatio = async (page, over, under) => {
  const widthOf = async (name) => {
    const attribute = await stepOf(page, name)
      .getByTestId('ladder-wait')
      .getAttribute('width')
    const width = Number(attribute)
    if (!(width > 0)) {
      throw new Error(`The wait of ${name} has no drawn width: ${attribute}`)
    }
    return width
  }
  return (await widthOf(over)) / (await widthOf(under))
}

const waitWidthRatio = (page) => waitRatio(page, 'Code review', 'Refinement')

// Development's wait goes from 16 hours (960 minutes) to 3 days (1440 minutes).
const setDevelopmentWaitToThreeDays = async (page) => {
  const development = page
    .getByTestId('time-row')
    .filter({ has: page.getByRole('heading', { name: 'Development' }) })
  await development.getByTestId('wait-time-unit-select').selectOption('days')
  await development.getByTestId('wait-time-input').fill('3')
  await development.getByTestId('wait-time-input').press('Tab')
}

// A colour token of the page (a custom property on :root) as the browser
// resolves colours, e.g. '#7e22ce' -> 'rgb(126, 34, 206)', so it can be compared
// with a computed style.
const tokenColour = (page, token) =>
  page.evaluate((name) => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim()
    const probe = document.createElement('span')
    probe.style.color = value
    document.body.append(probe)
    const resolved = getComputedStyle(probe).color
    probe.remove()
    return resolved
  }, token)

const strokeOf = (locator) =>
  locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      color: style.stroke,
      width: style.strokeWidth,
      dash: style.strokeDasharray,
    }
  })

// The text sits wholly inside the drawn SVG, and the scroll area is as wide as the SVG.
const expectInsideTheMap = async (page, text) => {
  const ladder = await box(page.getByTestId('ladder-map'))
  const bounds = await box(text)
  expect(bounds.x).toBeGreaterThanOrEqual(ladder.x)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(ladder.x + ladder.width)
  const scrollWidth = await page
    .getByTestId('ladder-scroll')
    .evaluate((el) => el.scrollWidth)
  expect(scrollWidth).toBeGreaterThanOrEqual(Math.floor(ladder.width))
}

// Once the ladder has been fitted to the pane (it fills most of it) it is not
// wider than the pane, so the pane has nothing to scroll.
const expectFittedWithoutScrolling = async (page) => {
  const scroller = page.getByTestId('ladder-scroll')
  await expect
    .poll(async () => (await box(page.getByTestId('ladder-map'))).width)
    .toBeGreaterThan((await box(scroller)).width * 0.9)
  expect(
    await scroller.evaluate((el) => el.scrollWidth <= el.clientWidth)
  ).toBe(true)
}

const pageScrollsHorizontally = (page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth
  )

// Every label as the browser drew it, in the SVG's own pixels: its text's
// measured left and right edge (getBBox covers the widest of its lines) and the
// top of its first line, which says which lane it is on. Waits for web fonts
// and for the ladder to refit to the pane, so the measure is of the final draw.
const measuredLabels = async (page) => {
  await page.evaluate(async () => {
    await document.fonts.ready
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
    await frame()
    await frame()
  })
  return page.evaluate(() => {
    const svg = document.querySelector('[data-testid="ladder-map"]')
    const intoSvg = svg.getScreenCTM().inverse()
    return {
      svgWidth: svg.width.baseVal.value,
      labels: [...svg.querySelectorAll('[data-testid="ladder-step"] text')].map(
        (text) => {
          const { x, y, width } = text.getBBox()
          const matrix = intoSvg.multiply(text.getScreenCTM())
          return {
            name: text.querySelector('tspan').textContent.trim(),
            left: matrix.e + x * matrix.a,
            right: matrix.e + (x + width) * matrix.a,
            top: Math.round(matrix.f + y * matrix.d),
          }
        }
      ),
    }
  })
}

// In both ladder modes every label, as the browser drew it, ends inside the SVG,
// and no two labels on one lane overlap.
const expectMeasuredLabelsFit = async (page, names) => {
  await expect(page.getByTestId('ladder-step')).toHaveCount(names.length)
  for (const mode of ['To scale', 'Equal width']) {
    await page.getByRole('radio', { name: mode }).check()
    const { svgWidth, labels } = await measuredLabels(page)

    expect(
      labels.map(({ name }) => name),
      mode
    ).toEqual(names)
    for (const { name, right } of labels) {
      expect(right, `${mode}: ${name} ends inside the map`).toBeLessThanOrEqual(
        svgWidth
      )
    }
    const lanes = Object.values(Object.groupBy(labels, ({ top }) => top))
    for (const lane of lanes) {
      const leftToRight = [...lane].sort((a, b) => a.left - b.left)
      leftToRight.slice(1).forEach((label, index) => {
        expect(
          label.left,
          `${mode}: ${label.name} starts after ${leftToRight[index].name} ends`
        ).toBeGreaterThanOrEqual(leftToRight[index].right)
      })
    }
  }
}

test.describe('Live time-ladder map', () => {
  test('Wait above the track, process below, to scale', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(referenceSteps()))
    await expect(page.getByTestId('ladder-map')).toBeVisible()

    const track = await box(page.getByTestId('ladder-track'))
    for (const name of [
      'Intake',
      'Refinement',
      'Development',
      'Code review',
      'Deploy',
    ]) {
      const wait = await box(stepOf(page, name).getByTestId('ladder-wait'))
      const process = await box(
        stepOf(page, name).getByTestId('ladder-process')
      )
      expect(
        wait.y + wait.height,
        `${name} wait is above the track`
      ).toBeLessThanOrEqual(track.y)
      expect(
        process.y,
        `${name} process is below the track`
      ).toBeGreaterThanOrEqual(track.y + track.height)
    }

    await expect.poll(() => waitWidthRatio(page)).toBeCloseTo(SIX_TIMES, 5)
  })

  test('Equal width', async ({ page, seed }) => {
    await seed(workspaceWith(referenceSteps()))
    await expect(page.getByTestId('ladder-map')).toBeVisible()
    const widthsOf = async () =>
      Promise.all(
        (await page.getByTestId('ladder-box').all()).map(
          async (outline) => (await box(outline)).width
        )
      )
    const distinctWidths = async () =>
      new Set((await widthsOf()).map(Math.round)).size
    await expect.poll(distinctWidths).toBeGreaterThan(1)

    await page.getByRole('radio', { name: 'Equal width' }).check()

    await expect.poll(distinctWidths).toBe(1)
    expect(await widthsOf()).toHaveLength(5)
  })

  test('the ladder switches back to scale', async ({ page, seed }) => {
    await seed(workspaceWith(referenceSteps()))
    await expect(page.getByRole('radio', { name: 'To scale' })).toBeChecked()

    await page.getByRole('radio', { name: 'Equal width' }).check()
    await page.getByRole('radio', { name: 'To scale' }).check()

    await expect.poll(() => waitWidthRatio(page)).toBeCloseTo(SIX_TIMES, 5)
  })

  test('Handoff encoding', async ({ page, seed }) => {
    await seed(
      workspaceWith(withStep(referenceSteps(), 'Deploy', { isHandoff: true }))
    )

    const deploy = stepOf(page, 'Deploy')
    await expect(deploy).toHaveAttribute('data-outline', 'handoff')
    await expect(deploy.getByText('handoff', { exact: true })).toBeVisible()
    const handoffStroke = await strokeOf(deploy.getByTestId('ladder-box'))
    expect(handoffStroke).toEqual({
      color: await tokenColour(page, '--map-handoff-outline'),
      width: '3px',
      dash: 'none',
    })
    const planStroke = await strokeOf(
      stepOf(page, 'Development').getByTestId('ladder-box')
    )
    expect(planStroke.width).toBe('0px')
    await expect(stepOf(page, 'Development').getByText('handoff')).toHaveCount(
      0
    )
  })

  test('Incomplete encoding', async ({ page, seed }) => {
    await seed(workspaceWith(withoutWait(referenceSteps(), 'Deploy')))

    const deploy = stepOf(page, 'Deploy')
    await expect(deploy).toHaveAttribute('data-outline', 'dashed')
    expect(await strokeOf(deploy.getByTestId('ladder-box'))).toEqual({
      color: await tokenColour(page, '--map-dashed-outline'),
      width: '2px',
      dash: DASHED_STROKE_DASH,
    })
    await expect(deploy.getByText('needs wait time')).toBeVisible()
    await expect(deploy.getByTestId('ladder-wait')).toHaveCount(0)
  })

  test('Outside encoding', async ({ page, seed }) => {
    const steps = insertAfter(
      referenceSteps(),
      'Code review',
      outsideStep('Security review', 1440)
    )
    await seed(workspaceWith(steps))

    const security = stepOf(page, 'Security review')
    await expect(security.getByTestId('ladder-hatched')).toBeVisible()
    await expect(security).toHaveAttribute('data-outline', 'dashed')
    expect(await strokeOf(security.getByTestId('ladder-box'))).toEqual({
      color: await tokenColour(page, '--map-dashed-outline'),
      width: '2px',
      dash: DASHED_STROKE_DASH,
    })
    await expect(security.getByText('elapsed · split unknown')).toBeVisible()
    await expect(security.getByText('outside', { exact: true })).toBeVisible()
    await expect(security.getByText('handoff', { exact: true })).toBeVisible()
    await expect(
      stepOf(page, 'Development').getByTestId('ladder-hatched')
    ).toHaveCount(0)
  })

  test('the last label is fully inside the map when no times are entered', async ({
    page,
    seed,
  }) => {
    await seed(
      workspaceWith(
        ['Intake', 'Review', 'Deploy'].map((name) => createStep({ name }))
      )
    )
    await expect(page.getByTestId('ladder-map')).toBeVisible()

    const label = stepOf(page, 'Deploy').getByText('needs process time')
    await expect(label).toBeVisible()
    await expectInsideTheMap(page, label)
  })

  test('an outside step in last position shows its full label inside the map', async ({
    page,
    seed,
  }) => {
    await seed(
      workspaceWith([...referenceSteps(), outsideStep('Security review', 60)])
    )
    await expect(page.getByTestId('ladder-map')).toBeVisible()

    const label = stepOf(page, 'Security review').getByText(
      'elapsed · split unknown'
    )
    await expect(label).toBeVisible()
    await expectInsideTheMap(page, label)
  })

  test('a long CJK name and a long all-caps name on the last step stay inside the map and clear of the labels beside them', async ({
    page,
    seed,
  }) => {
    // Tiny times make every box the minimum width, so the labels crowd into
    // lanes: the CJK label is 240 px wide and the ten boxes after it are 24 px.
    const names = [
      'Intake',
      CJK_NAME,
      ...['Review', 'Deploy', 'Test', 'Build', 'Plan', 'Ship', 'Close'],
      ALL_CAPS_NAME,
    ]
    await seed(workspaceWith(names.map((name) => team(name, 5, 5))))

    await expectMeasuredLabelsFit(page, names)
  })

  test('a CJK name on the last step ends inside the map', async ({
    page,
    seed,
  }) => {
    const names = ['Intake', 'Review', 'Deploy', CJK_NAME]
    await seed(workspaceWith(names.map((name) => team(name, 5, 5))))

    await expectMeasuredLabelsFit(page, names)
  })

  test('the ladder says what its encodings mean', async ({ page, seed }) => {
    await seed(workspaceWith(referenceSteps()))

    const ladder = page.getByTestId('ladder-map')
    await expect(ladder).toHaveAttribute('aria-describedby', 'ladder-desc')
    await expect(ladder.locator('title')).toHaveText('Time ladder, to scale')
    await expect(page.getByTestId('ladder-desc')).toContainText(
      'wait time is drawn above the track'
    )
    await expect(page.getByTestId('ladder-desc')).toContainText('below it')
    await expect(page.getByTestId('ladder-desc')).toContainText('hatched')
  })

  test('Flags agree across map and summary: Code review at %C/A 80', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(reworkSteps()))

    const codeReview = stepOf(page, 'Code review')
    await expect(
      codeReview.getByText('largest wait', { exact: true })
    ).toBeVisible()
    await expect(
      codeReview.getByText('lowest %C/A', { exact: true })
    ).toBeVisible()
    const ladder = page.getByTestId('ladder-map')
    await expect(ladder.getByText('largest wait', { exact: true })).toHaveCount(
      1
    )
    await expect(ladder.getByText('lowest %C/A', { exact: true })).toHaveCount(
      1
    )
  })

  test('each flag names its own step when they differ: Development at %C/A 70, Code review the largest wait', async ({
    page,
    seed,
  }) => {
    await seed(
      workspaceWith(withStep(referenceSteps(), 'Development', { pctCA: 70 }))
    )

    const codeReview = stepOf(page, 'Code review')
    const development = stepOf(page, 'Development')
    await expect(codeReview.getByText('largest wait')).toBeVisible()
    await expect(codeReview.getByText('lowest %C/A')).toHaveCount(0)
    await expect(development.getByText('lowest %C/A')).toBeVisible()
    await expect(development.getByText('largest wait')).toHaveCount(0)
    const flag = (label) =>
      page.getByTestId('summary-flag').filter({ hasText: label })
    await expect(flag('largest wait')).toContainText('Code review')
    await expect(flag('largest wait')).not.toContainText('Development')
    await expect(flag('lowest %C/A')).toContainText('Development')
    await expect(flag('lowest %C/A')).not.toContainText('Code review')
  })

  test('the reference map at %C/A 100 flags no lowest %C/A', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(referenceSteps()))

    await expect(
      stepOf(page, 'Code review').getByText('largest wait', { exact: true })
    ).toBeVisible()
    await expect(page.getByText('lowest %C/A', { exact: true })).toHaveCount(0)
    await expect(page.getByTestId('summary-flag')).toHaveCount(1)
  })

  test('the map follows an edit to the steps', async ({ page, seed }) => {
    await seed(workspaceWith(referenceSteps(), STAGE_NUMBER.STEPS))
    await expect(page.getByTestId('ladder-step')).toHaveCount(5)

    await page
      .getByRole('button', { name: 'Add step', exact: false })
      .first()
      .click()

    await expect(page.getByTestId('ladder-step')).toHaveCount(6)
  })

  for (const stage of [
    STAGE_NUMBER.STEPS,
    STAGE_NUMBER.TIME,
    STAGE_NUMBER.QUALITY,
    STAGE_NUMBER.REWORK,
    STAGE_NUMBER.REVIEW,
    STAGE_NUMBER.FUTURE,
  ]) {
    test(`the map pane is shown on the ${STAGE_NAMES[stage - 1]} stage`, async ({
      page,
      seed,
    }) => {
      await seed(workspaceWith(referenceSteps(), stage))

      await expect(page.getByTestId('map-pane')).toBeVisible()
      await expect(page.getByTestId('ladder-map')).toBeVisible()
    })
  }

  test('the map pane is absent on the Scope stage', async ({ page, seed }) => {
    await seed(workspaceWith(referenceSteps(), STAGE_NUMBER.SCOPE))

    await expect(page.getByTestId('session-shell')).toBeVisible()
    await expect(page.getByTestId('map-pane')).toHaveCount(0)
  })

  test('the map pane is a full-width band under the stage content', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(referenceSteps()))
    await expect(page.getByTestId('ladder-map')).toBeVisible()

    const shell = await box(page.getByTestId('session-shell'))
    await expect
      .poll(async () => {
        const work = await box(page.getByTestId('work-region'))
        const pane = await box(page.getByTestId('map-pane'))
        return pane.y - (work.y + work.height)
      })
      .toBeGreaterThanOrEqual(0)
    expect((await box(page.getByTestId('map-pane'))).width).toBeGreaterThan(
      shell.width * 0.9
    )
  })

  test('the reference map fits the pane with no scrolling', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(referenceSteps()))
    await expect(page.getByTestId('ladder-map')).toBeVisible()

    await expectFittedWithoutScrolling(page)
    expect(await pageScrollsHorizontally(page)).toBe(false)
  })

  test('a map with a very short step still fits the pane with no scrolling', async ({
    page,
    seed,
  }) => {
    await seed(
      workspaceWith([
        ...referenceSteps(),
        team('Tiny', 1, 1),
        team('Tinier', 1, 1),
      ])
    )
    await expect(page.getByTestId('ladder-map')).toBeVisible()

    await expectFittedWithoutScrolling(page)
  })

  test('the map has no accessibility violations', async ({
    page,
    seed,
    axe,
  }) => {
    await seed(
      workspaceWith(
        insertAfter(
          withStep(reworkSteps(), 'Deploy', { isHandoff: true }),
          'Code review',
          outsideStep('Security review', 1440)
        )
      )
    )
    await expect(page.getByTestId('ladder-map')).toBeVisible()

    await axe({ include: '[data-testid="map-pane"]' })

    await page.getByRole('radio', { name: 'Equal width' }).check()
    await axe({ include: '[data-testid="map-pane"]' })
    await axe()
  })

  test('Map is visible from the Steps stage on', async ({ page, seed }) => {
    await seed(
      workspaceWith(referenceSteps(), STAGE_NUMBER.STEPS, STAGE_NUMBER.FUTURE)
    )

    for (const number of [
      STAGE_NUMBER.STEPS,
      STAGE_NUMBER.TIME,
      STAGE_NUMBER.QUALITY,
      STAGE_NUMBER.REWORK,
      STAGE_NUMBER.REVIEW,
    ]) {
      const name = STAGE_NAMES[number - 1]
      await page.getByTestId(`stage-${name.toLowerCase()}`).click()
      await expect(
        page.getByTestId('stage-' + name.toLowerCase()),
        `${name} is the current stage`
      ).toHaveAttribute('aria-current', 'step')
      await expect(page.getByTestId('map-pane'), `${name} map`).toBeVisible()
      await expect(strip(page), `${name} strip`).toBeVisible()
    }
  })

  test('the summary strip is absent on the Scope stage', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(referenceSteps(), STAGE_NUMBER.SCOPE))

    await expect(page.getByTestId('session-shell')).toBeVisible()
    await expect(strip(page)).toHaveCount(0)
  })

  test('Summary strip leads with flow efficiency', async ({ page, seed }) => {
    await seed(workspaceWith(referenceSteps()))

    await expect(strip(page).locator('dt')).toHaveText([
      'Flow efficiency',
      'Lead time',
      'Process time',
      'Rolled %C/A',
      'Handoffs',
    ])
    // Process 870 min (60+240+480+60+30), lead 9030 min (870 + 8160 waiting):
    // 870 / 9030 = 9.6%; 9030 / 480 (an 8-hour day) = 18.8 days; 870 / 480 = 1.8.
    await expect(figureValue(page, 'flow-efficiency')).toHaveText('9.6%')
    await expect(figureValue(page, 'lead-time')).toHaveText('18.8 days')
    await expect(figureValue(page, 'process-time')).toHaveText('1.8 days')
    await expect(figureValue(page, 'rolled-ca')).toHaveText('100.0%')
    await expect(figureValue(page, 'handoffs')).toHaveText('0')
    await expect(figure(page, 'flow-efficiency')).toContainText(
      'Share of the lead time spent working rather than waiting.'
    )
  })

  test('Flags agree across map and summary: the summary strip names Code review', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(reworkSteps()))

    const largestWait = page
      .getByTestId('summary-flag')
      .filter({ hasText: 'largest wait' })
    const lowestCA = page
      .getByTestId('summary-flag')
      .filter({ hasText: 'lowest %C/A' })
    await expect(largestWait).toContainText('Code review')
    await expect(lowestCA).toContainText('Code review')
  })

  test('the map and the strip follow an edit to a time on the Time stage', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(referenceSteps(), STAGE_NUMBER.TIME))
    await expect
      .poll(() => waitRatio(page, 'Development', 'Refinement'))
      .toBeCloseTo(2, 5)
    await expect(figureValue(page, 'flow-efficiency')).toHaveText('9.6%')
    await expect(figureValue(page, 'lead-time')).toHaveText('18.8 days')

    await setDevelopmentWaitToThreeDays(page)

    await expect(figureValue(page, 'lead-time')).toHaveText('19.8 days')
    await expect(figureValue(page, 'flow-efficiency')).toHaveText('9.1%')
    await expect
      .poll(() => waitRatio(page, 'Development', 'Refinement'))
      .toBeCloseTo(3, 5)
  })

  test('Undo of a time edit restores the map and the strip', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(referenceSteps(), STAGE_NUMBER.TIME))
    await setDevelopmentWaitToThreeDays(page)
    await expect(figureValue(page, 'lead-time')).toHaveText('19.8 days')
    await expect
      .poll(() => waitRatio(page, 'Development', 'Refinement'))
      .toBeCloseTo(3, 5)

    await page.getByRole('button', { name: 'Undo', exact: true }).click()

    await expect(figureValue(page, 'lead-time')).toHaveText('18.8 days')
    await expect(figureValue(page, 'flow-efficiency')).toHaveText('9.6%')
    await expect
      .poll(() => waitRatio(page, 'Development', 'Refinement'))
      .toBeCloseTo(2, 5)
  })

  test('the strip follows an edit to the steps', async ({ page, seed }) => {
    await seed(workspaceWith(referenceSteps(), STAGE_NUMBER.STEPS))
    await expect(figureValue(page, 'flow-efficiency')).toHaveText('9.6%')

    await page
      .getByRole('button', { name: 'Add step', exact: false })
      .first()
      .click()

    await expect(page.getByTestId('ladder-step')).toHaveCount(6)
    await expect(figureValue(page, 'flow-efficiency')).toHaveText('incomplete')
  })

  test('Incomplete encoding: the summary strip shows lead time incomplete naming Deploy', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(withoutWait(referenceSteps(), 'Deploy')))

    await expect(figureValue(page, 'lead-time')).toHaveText('incomplete')
    await expect(figure(page, 'lead-time')).toContainText('Deploy')
    await expect(figureValue(page, 'process-time')).toHaveText('1.8 days')
  })

  test('Outside encoding: the summary strip shows flow efficiency 8.3%–22.1%', async ({
    page,
    seed,
  }) => {
    await seed(
      workspaceWith(
        insertAfter(
          referenceSteps(),
          'Code review',
          outsideStep('Security review', 1440)
        )
      )
    )

    // Lead 9030 + the outside step's 1440 elapsed = 10470 min. Worst case all
    // 1440 is waiting: 870 / 10470 = 8.3%. Best case all of it is work:
    // (870 + 1440) / 10470 = 2310 / 10470 = 22.1%.
    await expect(figureValue(page, 'flow-efficiency')).toHaveText('8.3%–22.1%')
  })

  test('Long streams scroll with the strip pinned', async ({ page, seed }) => {
    await seed(workspaceWith(longStream()))
    await expect(page.getByTestId('ladder-map')).toBeVisible()
    await page.getByRole('radio', { name: 'Equal width' }).check()

    const scroller = page.getByTestId('ladder-scroll')
    await expect
      .poll(() => scroller.evaluate((el) => el.scrollWidth > el.clientWidth))
      .toBe(true)
    await scroller.scrollIntoViewIfNeeded()
    await scroller.evaluate((el) => {
      el.scrollLeft = el.scrollWidth
    })
    expect(await scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
    expect(await pageScrollsHorizontally(page)).toBe(false)
    await expect(strip(page)).toBeInViewport()

    // The strip is pinned to the bottom of the window, not only below the
    // ladder: it is still there with the ladder scrolled out of view.
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(scroller).not.toBeInViewport()
    await expect(strip(page)).toBeInViewport()
    await expect
      .poll(async () => {
        const bounds = await box(strip(page))
        return bounds.y + bounds.height
      })
      .toBeCloseTo(page.viewportSize().height, 0)
  })

  test('the pinned strip does not cover the element that takes focus', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(referenceSteps(), STAGE_NUMBER.TIME))
    await expect(page.getByTestId('ladder-map')).toBeVisible()
    const scroller = page.getByTestId('ladder-scroll')
    // Scroll until only the top of the ladder pane shows at the bottom edge of
    // the window, so focusing it scrolls it into view the shortest way.
    const edgeOfWindow = page.viewportSize().height
    await scroller.evaluate((el, visible) => {
      window.scrollTo(
        0,
        window.scrollY + el.getBoundingClientRect().top - visible
      )
    }, edgeOfWindow - 20)

    await scroller.focus()

    await expect(scroller).toBeFocused()
    await expect
      .poll(async () => {
        const focused = await box(scroller)
        const pinned = await box(strip(page))
        return pinned.y - (focused.y + focused.height)
      })
      .toBeGreaterThanOrEqual(0)
  })

  // Measured at 1280x720: the strip is 101 px (14% of the window), so it starts
  // at 619 px, and the work region starts at 99 px, so 520 px (72% of the
  // window) of work shows above the strip. The floor is a half: far enough
  // below the measured share to survive small layout changes, high enough to
  // fail if the strip or the header grows to crowd the work out.
  const MIN_WORK_SHARE_OF_WINDOW = 0.5

  test('the work region keeps at least half the window above the pinned strip on the Steps stage', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(longStream(), STAGE_NUMBER.STEPS))
    await expect(strip(page)).toBeVisible()

    const stripTop = (await box(page.getByTestId('strip-region'))).y
    const work = await box(page.getByTestId('work-region'))
    const shownAboveStrip = stripTop - Math.max(work.y, 0)

    expect(shownAboveStrip / page.viewportSize().height).toBeGreaterThanOrEqual(
      MIN_WORK_SHARE_OF_WINDOW
    )
  })

  test('Tab through a tall Steps list never leaves the focused field under the pinned strip', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(longStream(), STAGE_NUMBER.STEPS))
    await expect(page.getByTestId('step-row')).toHaveCount(
      STEP_COUNT_OF_A_LONG_STREAM
    )
    const stripTop = (await box(page.getByTestId('strip-region'))).y
    const MAX_TABS = 200
    const ROW_BELOW_THE_FOLD = 12 // rows are about 220 px, so row 12 starts well past the first screen
    const rowOfFocus = () =>
      page.evaluate(() => {
        const focused = document.activeElement
        const row = focused.closest('[data-testid="step-row"]')
        return {
          bottom: focused.getBoundingClientRect().bottom,
          row: row
            ? [
                ...document.querySelectorAll('[data-testid="step-row"]'),
              ].indexOf(row) + 1
            : 0,
        }
      })

    let focus = { row: 0 }
    for (let tabs = 0; focus.row < ROW_BELOW_THE_FOLD; tabs += 1) {
      expect(tabs, 'Tab reaches a row below the fold').toBeLessThan(MAX_TABS)
      await page.keyboard.press('Tab')
      focus = await rowOfFocus()
      if (focus.row > 0) {
        expect(
          focus.bottom,
          `the field focused in row ${focus.row} ends above the strip`
        ).toBeLessThanOrEqual(stripTop)
      }
    }

    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  })

  test('Narrow screen', async ({ page, seed }) => {
    await page.setViewportSize(NARROW_VIEWPORT)
    await seed(workspaceWith(referenceSteps()))

    const toggle = strip(page).getByRole('button', { name: 'Show all metrics' })
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(strip(page).locator('dt:visible')).toHaveText([
      'Flow efficiency',
    ])
    await expect(figureValue(page, 'flow-efficiency')).toHaveText('9.6%')
    await expect(figure(page, 'lead-time')).toBeHidden()
    expect(await pageScrollsHorizontally(page)).toBe(false)

    await toggle.click()

    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(figureValue(page, 'lead-time')).toHaveText('18.8 days')
    await expect(figureValue(page, 'handoffs')).toBeVisible()
    expect(await pageScrollsHorizontally(page)).toBe(false)
  })

  test('the narrow strip collapses again, hiding the figures and the flagged steps', async ({
    page,
    seed,
  }) => {
    await page.setViewportSize(NARROW_VIEWPORT)
    await seed(workspaceWith(reworkSteps()))
    const toggle = strip(page).getByRole('button', { name: 'Show all metrics' })
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByTestId('summary-flag')).toHaveCount(2)
    await expect(page.getByTestId('summary-flag').first()).toBeVisible()

    await toggle.click()

    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(figure(page, 'lead-time')).toBeHidden()
    await expect(figure(page, 'handoffs')).toBeHidden()
    await expect(page.getByTestId('summary-flag').first()).toBeHidden()
    await expect(figureValue(page, 'flow-efficiency')).toBeVisible()
  })

  test('the strip collapses below 640 px and shows everything from 640 px', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(referenceSteps()))
    const toggle = strip(page).getByRole('button', { name: 'Show all metrics' })

    await page.setViewportSize({ width: SM_BREAKPOINT - 1, height: 800 })
    await expect(toggle).toBeVisible()
    await expect(figure(page, 'lead-time')).toBeHidden()

    await page.setViewportSize({ width: SM_BREAKPOINT, height: 800 })
    await expect(toggle).toBeHidden()
    await expect(figure(page, 'lead-time')).toBeVisible()
    await expect(strip(page).locator('dt:visible')).toHaveCount(5)
  })

  test('the strip shows every figure and no toggle on a wide screen', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(referenceSteps()))

    await expect(strip(page).locator('dt:visible')).toHaveCount(5)
    await expect(
      strip(page).getByRole('button', { name: 'Show all metrics' })
    ).toBeHidden()
  })

  test('Only Intake with no times', async ({ page, seed }) => {
    await seed(workspaceAtStage(STAGE_NUMBER.STEPS))

    await expect(stepOf(page, 'Intake')).toHaveAttribute(
      'data-outline',
      'dashed'
    )
    await expect(page.getByTestId('ladder-step')).toHaveCount(1)
    const label = stepOf(page, 'Intake').getByText('needs process time')
    await expect(label).toBeVisible()
    await expectInsideTheMap(page, label)
    await expect(figureValue(page, 'flow-efficiency')).toHaveText('incomplete')
  })

  test('the summary strip has no accessibility violations, collapsed or expanded', async ({
    page,
    seed,
    axe,
  }) => {
    await seed(
      workspaceWith(
        insertAfter(
          withStep(reworkSteps(), 'Deploy', { isHandoff: true }),
          'Code review',
          outsideStep('Security review', 1440)
        )
      )
    )
    await expect(strip(page)).toBeVisible()
    await axe({ include: '[data-testid="summary-strip"]' })
    await axe()

    await page.setViewportSize(NARROW_VIEWPORT)
    await expect(
      strip(page).getByRole('button', { name: 'Show all metrics' })
    ).toBeVisible()
    await axe({ include: '[data-testid="summary-strip"]' })

    await strip(page).getByRole('button', { name: 'Show all metrics' }).click()
    await expect(figureValue(page, 'lead-time')).toBeVisible()
    await axe({ include: '[data-testid="summary-strip"]' })
    await axe()
  })

  test('the view switch is a keyboard-reachable tab for the Map view', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(referenceSteps()))
    const tab = page.getByRole('tab', { name: 'Map' })
    await expect(tab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tabpanel', { name: 'Map' })).toBeVisible()

    // The ladder's first control follows the tab, so Shift+Tab reaches it.
    await page.getByRole('radio', { name: 'To scale' }).focus()
    await page.keyboard.press('Shift+Tab')

    await expect(tab).toBeFocused()
  })
})
