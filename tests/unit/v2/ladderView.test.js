import { describe, it, expect } from 'vitest'
import {
  MAX_EQUAL_WIDTH,
  MAX_SCALE,
  MIN_EQUAL_WIDTH,
  MIN_SCALE,
  annotationsOf,
  equalWidthFor,
  labelLanes,
  scaleToFit,
} from '../../../src/utils/ui/ladderView.js'
import { ladderLayout } from '../../../src/utils/ui/ladderLayout.js'
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

describe('scaleToFit', () => {
  it('fits the whole lead time into the available width', () => {
    const version = versionOf(referenceSteps())

    expect(scaleToFit(version, 900)).toBeCloseTo(900 / REFERENCE_MINUTES, 10)
  })

  it('counts an outside step by its elapsed time', () => {
    const steps = insertAfter(
      referenceSteps(),
      'Code review',
      outsideStep('Security review', 1440)
    )

    expect(scaleToFit(versionOf(steps), 900)).toBeCloseTo(
      900 / (REFERENCE_MINUTES + 1440),
      10
    )
  })

  it('never goes below the minimum readable scale, so a long stream scrolls', () => {
    const steps = [team('Slow', 60, 1000000)]

    expect(scaleToFit(versionOf(steps), 900)).toBe(MIN_SCALE)
  })

  it('never goes above the maximum scale, so a short stream is not blown up', () => {
    const steps = [team('Quick', 5, 5)]

    expect(scaleToFit(versionOf(steps), 900)).toBe(MAX_SCALE)
  })

  it('gives a usable scale when no time is entered', () => {
    const steps = [
      {
        ...team('Intake'),
        processTime: { typ: null },
        waitTime: { typ: null },
      },
    ]

    expect(scaleToFit(versionOf(steps), 900)).toBe(MAX_SCALE)
  })

  it('keeps the whole ladder inside the pane when boxes stay readable', () => {
    const version = versionOf(referenceSteps())
    const scale = scaleToFit(version, 900)

    const { totalWidth } = ladderLayout(version, { mode: 'scaled', scale })

    expect(totalWidth).toBeLessThanOrEqual(900)
  })
})

describe('scaleToFit with short steps', () => {
  it('keeps the ladder inside the pane although short steps are drawn at the minimum box width', () => {
    const steps = [
      team('Intake', 1, 1),
      team('Tiny', 1, 1),
      team('Development', 480, 960),
      team('Code review', 60, 2880),
    ]
    const version = versionOf(steps)
    const scale = scaleToFit(version, 900)

    const { totalWidth } = ladderLayout(version, { mode: 'scaled', scale })

    expect(totalWidth).toBeCloseTo(900, 5)
  })

  it('still keeps every long box proportional to its minutes', () => {
    const version = versionOf([
      team('Intake', 1, 1),
      team('Development', 480, 960),
    ])
    const scale = scaleToFit(version, 900)

    const { steps } = ladderLayout(version, { mode: 'scaled', scale })

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
  const layoutOf = (steps) =>
    ladderLayout(versionOf(steps), { mode: 'scaled', scale: 0.1 })

  const annotations = (steps, name) =>
    annotationsOf(layoutOf(steps).steps.find((s) => s.name === name))

  it('has none for a plain step', () => {
    expect(annotations(referenceSteps(), 'Development')).toEqual([])
  })

  it('names a handoff', () => {
    const steps = withStep(referenceSteps(), 'Deploy', { isHandoff: true })

    expect(annotations(steps, 'Deploy')).toEqual([
      { text: 'handoff', tone: 'handoff' },
    ])
  })

  it('names the flags the layout carries', () => {
    expect(annotations(reworkSteps(), 'Code review')).toEqual([
      { text: 'largest wait', tone: 'warn' },
      { text: 'lowest %C/A', tone: 'crit' },
    ])
  })

  it('names the times that are not entered', () => {
    const steps = withoutWait(referenceSteps(), 'Deploy')

    expect(annotations(steps, 'Deploy')).toEqual([
      { text: 'needs wait time', tone: 'warn' },
    ])
  })

  it('says an outside step is outside, with its split unknown', () => {
    const steps = insertAfter(
      referenceSteps(),
      'Code review',
      outsideStep('Security review', 1440)
    )

    expect(annotations(steps, 'Security review')).toEqual([
      { text: 'outside', tone: 'muted' },
      { text: 'elapsed · split unknown', tone: 'muted' },
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
