import { createMapVersion } from '../../../src/models/v2/mapVersion.js'
import { STAGE_NAMES, STAGE_NUMBER } from '../../../src/models/v2/constants.js'
import {
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
const NORMAL_VIEWPORT_HEIGHT = 720 // playwright.config.js

/** A workspace on `stage` whose map has these steps. */
const workspaceWith = (
  steps,
  stage = STAGE_NUMBER.TIME,
  furthestStage = stage
) =>
  workspaceAtStage(stage, {
    workdayHours: 8,
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

// The drawn (not stroked) width of Code review's wait over Refinement's.
const waitWidthRatio = async (page) => {
  const widthOf = async (name) =>
    Number(
      await stepOf(page, name).getByTestId('ladder-wait').getAttribute('width')
    )
  return (await widthOf('Code review')) / (await widthOf('Refinement'))
}

const strokeOf = (locator) =>
  locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      color: style.stroke,
      width: style.strokeWidth,
      dash: style.strokeDasharray,
    }
  })

const pageScrollsHorizontally = (page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth
  )

test.describe('Live time-ladder map', () => {
  test('Wait above the track, process below, to scale', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(referenceSteps()))

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

    expect(await waitWidthRatio(page)).toBeCloseTo(SIX_TIMES, 5)
  })

  test('Equal width', async ({ page, seed }) => {
    await seed(workspaceWith(referenceSteps()))
    const widthsOf = async () =>
      Promise.all(
        (await page.getByTestId('ladder-box').all()).map(
          async (outline) => (await box(outline)).width
        )
      )
    expect(new Set((await widthsOf()).map(Math.round)).size).toBeGreaterThan(1)

    await page.getByRole('radio', { name: 'Equal width' }).check()

    const widths = await widthsOf()
    expect(widths).toHaveLength(5)
    expect(new Set(widths.map((width) => Math.round(width))).size).toBe(1)
  })

  test('the ladder switches back to scale', async ({ page, seed }) => {
    await seed(workspaceWith(referenceSteps()))
    await expect(page.getByRole('radio', { name: 'To scale' })).toBeChecked()

    await page.getByRole('radio', { name: 'Equal width' }).check()
    await page.getByRole('radio', { name: 'To scale' }).check()

    expect(await waitWidthRatio(page)).toBeCloseTo(SIX_TIMES, 5)
  })

  test('Handoff encoding', async ({ page, seed }) => {
    await seed(
      workspaceWith(withStep(referenceSteps(), 'Deploy', { isHandoff: true }))
    )

    const deploy = stepOf(page, 'Deploy')
    await expect(deploy).toHaveAttribute('data-outline', 'handoff')
    await expect(deploy.getByText('handoff', { exact: true })).toBeVisible()
    const handoffStroke = await strokeOf(deploy.getByTestId('ladder-box'))
    const planStroke = await strokeOf(
      stepOf(page, 'Development').getByTestId('ladder-box')
    )
    expect(handoffStroke.color).not.toBe(planStroke.color)
    expect(handoffStroke.dash).toBe('none')
    await expect(stepOf(page, 'Development').getByText('handoff')).toHaveCount(
      0
    )
  })

  test('Incomplete encoding', async ({ page, seed }) => {
    await seed(workspaceWith(withoutWait(referenceSteps(), 'Deploy')))

    const deploy = stepOf(page, 'Deploy')
    await expect(deploy).toHaveAttribute('data-outline', 'dashed')
    expect((await strokeOf(deploy.getByTestId('ladder-box'))).dash).not.toBe(
      'none'
    )
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
    expect((await strokeOf(security.getByTestId('ladder-box'))).dash).not.toBe(
      'none'
    )
    await expect(security.getByText('elapsed · split unknown')).toBeVisible()
    await expect(security.getByText('outside', { exact: true })).toBeVisible()
    await expect(
      stepOf(page, 'Development').getByTestId('ladder-hatched')
    ).toHaveCount(0)
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
    test(`the map pane is shown on stage ${stage}`, async ({ page, seed }) => {
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

    const work = await box(page.getByTestId('work-region'))
    const pane = await box(page.getByTestId('map-pane'))
    const shell = await box(page.getByTestId('session-shell'))
    expect(pane.y).toBeGreaterThanOrEqual(work.y + work.height)
    expect(pane.width).toBeGreaterThan(shell.width * 0.9)
  })

  test('a long stream scrolls inside the pane and the page does not', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(longStream()))
    await page.getByRole('radio', { name: 'Equal width' }).check()

    const scroller = page.getByTestId('ladder-scroll')
    expect(
      await scroller.evaluate((el) => el.scrollWidth > el.clientWidth)
    ).toBe(true)
    expect(await pageScrollsHorizontally(page)).toBe(false)
  })

  test('the reference map fits the pane with no scrolling', async ({
    page,
    seed,
  }) => {
    await seed(workspaceWith(referenceSteps()))
    await expect(page.getByTestId('ladder-map')).toBeVisible()

    const scroller = page.getByTestId('ladder-scroll')
    expect(
      await scroller.evaluate((el) => el.scrollWidth <= el.clientWidth)
    ).toBe(true)
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

    const scroller = page.getByTestId('ladder-scroll')
    expect(
      await scroller.evaluate((el) => el.scrollWidth <= el.clientWidth)
    ).toBe(true)
  })

  test('the map has no accessibility violations', async ({
    page,
    seed,
    axe,
  }) => {
    await page.clock.install({ time: 0 })
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
    await page.clock.resume()

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

    await expect(figureValue(page, 'flow-efficiency')).toHaveText('8.3%–22.1%')
  })

  test('Long streams scroll with the strip pinned', async ({ page, seed }) => {
    await seed(workspaceWith(longStream()))
    await page.getByRole('radio', { name: 'Equal width' }).check()

    const scroller = page.getByTestId('ladder-scroll')
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
    const bounds = await box(strip(page))
    expect(bounds.y + bounds.height).toBeCloseTo(NORMAL_VIEWPORT_HEIGHT, 0)
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
    await tab.focus()
    await expect(tab).toBeFocused()
    await expect(page.getByRole('tabpanel', { name: 'Map' })).toBeVisible()
  })
})
