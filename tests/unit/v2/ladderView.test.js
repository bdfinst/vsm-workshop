import { describe, it, expect } from 'vitest'
import {
  MAX_EQUAL_WIDTH,
  MAX_PIXELS_PER_MINUTE,
  MIN_EQUAL_WIDTH,
  MIN_PIXELS_PER_MINUTE,
  TONE,
  annotationsOf,
  equalWidthFor,
  labelLanes,
  pixelsPerMinuteToFit,
} from '../../../src/utils/ui/ladderView.js'
import {
  LADDER_MODE,
  ladderModel,
  sizeLadder,
} from '../../../src/utils/ui/ladderLayout.js'
import { calculateMetrics } from '../../../src/utils/calculations/v2/index.js'
import {
  insertAfter,
  outsideStep,
  referenceSteps,
  reworkSteps,
  team,
  versionOf,
  withStep,
  withoutWait,
} from './fixtures.js'

const REFERENCE_MINUTES = 9030 // every wait and process minute of the reference map

const modelOf = (steps) => {
  const version = versionOf(steps)
  return ladderModel(version, calculateMetrics(version).flags)
}

const scaledLayout = (steps, pixelsPerMinute) =>
  sizeLadder(modelOf(steps), { mode: LADDER_MODE.SCALED, pixelsPerMinute })

describe('pixelsPerMinuteToFit', () => {
  it('fits the whole lead time into the available width', () => {
    expect(pixelsPerMinuteToFit(modelOf(referenceSteps()), 900)).toBeCloseTo(
      900 / REFERENCE_MINUTES,
      10
    )
  })

  it('counts an outside step by its elapsed time', () => {
    const steps = insertAfter(
      referenceSteps(),
      'Code review',
      outsideStep('Security review', 1440)
    )

    expect(pixelsPerMinuteToFit(modelOf(steps), 900)).toBeCloseTo(
      900 / (REFERENCE_MINUTES + 1440),
      10
    )
  })

  it('never goes below the minimum pixels per minute, so a long stream scrolls', () => {
    const steps = [team('Slow', 60, 1000000)]

    expect(pixelsPerMinuteToFit(modelOf(steps), 900)).toBe(
      MIN_PIXELS_PER_MINUTE
    )
  })

  it('never goes above the maximum pixels per minute, so a short stream is not blown up', () => {
    const steps = [team('Quick', 5, 5)]

    expect(pixelsPerMinuteToFit(modelOf(steps), 900)).toBe(
      MAX_PIXELS_PER_MINUTE
    )
  })

  it('gives a usable pixels per minute when no time is entered', () => {
    const steps = [
      {
        ...team('Intake'),
        processTime: { typ: null },
        waitTime: { typ: null },
      },
    ]

    expect(pixelsPerMinuteToFit(modelOf(steps), 900)).toBe(
      MAX_PIXELS_PER_MINUTE
    )
  })

  it('keeps the whole ladder inside the pane when boxes stay readable', () => {
    const steps = referenceSteps()
    const pixelsPerMinute = pixelsPerMinuteToFit(modelOf(steps), 900)

    const { totalWidth } = scaledLayout(steps, pixelsPerMinute)

    expect(totalWidth).toBeLessThanOrEqual(900)
  })
})

describe('pixelsPerMinuteToFit with short steps', () => {
  it('keeps the ladder inside the pane although short steps are drawn at the minimum box width', () => {
    const steps = [
      team('Intake', 1, 1),
      team('Tiny', 1, 1),
      team('Development', 480, 960),
      team('Code review', 60, 2880),
    ]
    const pixelsPerMinute = pixelsPerMinuteToFit(modelOf(steps), 900)

    const { totalWidth } = scaledLayout(steps, pixelsPerMinute)

    expect(totalWidth).toBeCloseTo(900, 5)
  })

  it('still keeps every long box proportional to its minutes', () => {
    const intakeAndDevelopment = [
      team('Intake', 1, 1),
      team('Development', 480, 960),
    ]
    const pixelsPerMinute = pixelsPerMinuteToFit(
      modelOf(intakeAndDevelopment),
      900
    )

    const { steps } = scaledLayout(intakeAndDevelopment, pixelsPerMinute)

    expect(steps[1].wait.width / steps[1].process.width).toBeCloseTo(2, 5)
  })
})

describe('equalWidthFor', () => {
  it('splits the available width between the steps', () => {
    expect(equalWidthFor(5, 700)).toBe(140)
  })

  it('stays readable for a long stream, which then scrolls', () => {
    expect(equalWidthFor(41, 900)).toBe(MIN_EQUAL_WIDTH)
  })

  it('does not stretch a few steps across the pane', () => {
    expect(equalWidthFor(2, 900)).toBe(MAX_EQUAL_WIDTH)
  })

  it('splits evenly in between', () => {
    expect(equalWidthFor(6, 720)).toBe(120)
  })
})

describe('annotationsOf', () => {
  const annotations = (steps, name) =>
    annotationsOf(scaledLayout(steps, 0.1).steps.find((s) => s.name === name))

  it('has none for a plain step', () => {
    expect(annotations(referenceSteps(), 'Development')).toEqual([])
  })

  it('names a handoff', () => {
    const steps = withStep(referenceSteps(), 'Deploy', { isHandoff: true })

    expect(annotations(steps, 'Deploy')).toEqual([
      { text: 'handoff', tone: TONE.HANDOFF },
    ])
  })

  it('names the flags the layout carries', () => {
    expect(annotations(reworkSteps(), 'Code review')).toEqual([
      { text: 'largest wait', tone: TONE.WARN },
      { text: 'lowest %C/A', tone: TONE.CRIT },
    ])
  })

  it('names the times that are not entered', () => {
    const steps = withoutWait(referenceSteps(), 'Deploy')

    expect(annotations(steps, 'Deploy')).toEqual([
      { text: 'needs wait time', tone: TONE.WARN },
    ])
  })

  it('says an outside step is outside, with its split unknown', () => {
    const steps = insertAfter(
      referenceSteps(),
      'Code review',
      outsideStep('Security review', 1440)
    )

    expect(annotations(steps, 'Security review')).toEqual([
      { text: 'outside', tone: TONE.MUTED },
      { text: 'elapsed · split unknown', tone: TONE.MUTED },
    ])
  })
})

describe('labelLanes', () => {
  const block = (x, width) => ({ x, width })

  it('puts labels that do not touch on the first lane', () => {
    expect(labelLanes([block(0, 50), block(60, 50)])).toEqual([0, 0])
  })

  it('drops a label that would run into the previous one to the next lane', () => {
    expect(labelLanes([block(0, 100), block(20, 50)])).toEqual([0, 1])
  })

  it('reuses a lane once its last label has ended', () => {
    expect(labelLanes([block(0, 100), block(20, 50), block(110, 40)])).toEqual([
      0, 1, 0,
    ])
  })

  it('keeps a gap between labels on one lane', () => {
    expect(labelLanes([block(0, 50), block(52, 50)], 8)).toEqual([0, 1])
  })

  it('has no lanes for no labels', () => {
    expect(labelLanes([])).toEqual([])
  })
})
