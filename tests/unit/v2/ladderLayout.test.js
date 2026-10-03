import { describe, it, expect } from 'vitest'
import { MIN_SCALED_BOX_WIDTH } from '../../../src/utils/ui/ladderGeometry.js'
import { LADDER_MODE, sizeLadder } from '../../../src/utils/ui/ladderLayout.js'
import { OUTLINE, ladderModel } from '../../../src/utils/ui/ladderModel.js'
import { calculateMetrics } from '../../../src/utils/calculations/v2/index.js'
import { createStep } from '../../../src/models/v2/step.js'
import {
  referenceSteps,
  reworkSteps,
  insertAfter,
  outsideStep,
  team,
  versionOf,
  withStep,
  withoutWait,
} from './fixtures.js'

const stepBox = (layout, name) => layout.steps.find((s) => s.name === name)

const PX_PER_MINUTE = 0.5
const EQUAL_BOX_WIDTH = 120

const modelOf = (steps) => {
  const version = versionOf(steps)
  return ladderModel(version, calculateMetrics(version).flags)
}

const scaled = (steps, pixelsPerMinute = PX_PER_MINUTE) =>
  sizeLadder(modelOf(steps), { mode: LADDER_MODE.SCALED, pixelsPerMinute })

const equal = (steps, boxWidth = EQUAL_BOX_WIDTH) =>
  sizeLadder(modelOf(steps), { mode: LADDER_MODE.EQUAL, boxWidth })

const flagLabels = (layout, name) =>
  stepBox(layout, name).flags.map(({ label }) => label)

describe('sizeLadder', () => {
  describe('scaled mode', () => {
    it('draws waits in proportion to their minutes', () => {
      const layout = scaled(referenceSteps())

      const codeReview = stepBox(layout, 'Code review').waitBlock.width
      const refinement = stepBox(layout, 'Refinement').waitBlock.width

      expect(codeReview / refinement).toBe(6)
    })

    it('sizes each box to its wait plus process, side by side with no gaps', () => {
      const layout = scaled(referenceSteps())

      const refinement = stepBox(layout, 'Refinement')
      const development = stepBox(layout, 'Development')
      expect(refinement.boxWidth).toBe((240 + 480) * PX_PER_MINUTE)
      expect(development.x).toBe(refinement.x + refinement.boxWidth)
    })

    it('reports a total width that is the lead time to scale', () => {
      const layout = scaled(referenceSteps())

      const leadTime = 60 + 2400 + 240 + 480 + 480 + 960 + 60 + 2880 + 30 + 1440
      expect(layout.totalWidth).toBe(leadTime * PX_PER_MINUTE)
    })

    it('puts the wait first and the process after it inside the box', () => {
      const layout = scaled(referenceSteps())

      const { x, waitBlock, processBlock } = stepBox(layout, 'Refinement')
      expect(waitBlock).toEqual({ x, width: 240, minutes: 480 })
      expect(processBlock).toEqual({ x: x + 240, width: 120, minutes: 240 })
    })
  })

  describe('encodings', () => {
    it('marks a handoff with the handoff outline and the text "handoff"', () => {
      const steps = withStep(referenceSteps(), 'Deploy', { isHandoff: true })

      const layout = scaled(steps)

      expect(stepBox(layout, 'Deploy')).toMatchObject({
        outline: OUTLINE.HANDOFF,
        handoffText: 'handoff',
      })
      expect(stepBox(layout, 'Development')).toMatchObject({
        outline: OUTLINE.SOLID,
        handoffText: null,
      })
    })

    it('marks a step with no wait time dashed, naming "wait time"', () => {
      const layout = scaled(withoutWait(referenceSteps(), 'Deploy'))

      const deploy = stepBox(layout, 'Deploy')
      expect(deploy).toMatchObject({
        outline: OUTLINE.DASHED,
        missingTimeLabels: ['wait time'],
      })
      expect(deploy.waitBlock).toBeNull()
      expect(deploy.processBlock).toMatchObject({ minutes: 30 })
      expect(stepBox(layout, 'Development').missingTimeLabels).toEqual([])
    })

    it('names every missing time on a step with none', () => {
      const intake = createStep({ name: 'Intake' })

      const layout = scaled([intake])

      expect(layout.steps).toHaveLength(1)
      expect(layout.steps[0]).toMatchObject({
        outline: OUTLINE.DASHED,
        missingTimeLabels: ['process time', 'wait time'],
        waitBlock: null,
        processBlock: null,
      })
    })

    it('keeps a step with no times visible, but never inflates its segments', () => {
      const layout = scaled([
        createStep({ name: 'Intake' }),
        team('Idle', 0, 0),
      ])

      const [intake, idle] = layout.steps
      expect(intake.boxWidth).toBeGreaterThanOrEqual(MIN_SCALED_BOX_WIDTH)
      expect(idle.boxWidth).toBeGreaterThanOrEqual(MIN_SCALED_BOX_WIDTH)
      expect(idle.waitBlock).toMatchObject({ width: 0, minutes: 0 })
      expect(idle.processBlock).toMatchObject({ width: 0, minutes: 0 })
      expect(idle.missingTimeLabels).toEqual([])
      expect(idle.outline).toBe(OUTLINE.SOLID)
      expect(layout.totalWidth).toBe(intake.boxWidth + idle.boxWidth)
    })

    it('draws an outside step as a hatched dashed block as wide as its elapsed time', () => {
      const steps = insertAfter(
        referenceSteps(),
        'Code review',
        outsideStep('Security review', 1440)
      )

      const security = stepBox(scaled(steps), 'Security review')

      expect(security).toMatchObject({
        boxWidth: 1440 * PX_PER_MINUTE,
        outline: OUTLINE.DASHED,
        outsideText: { label: 'elapsed · split unknown', text: 'outside' },
        handoffText: 'handoff',
        missingTimeLabels: [],
        waitBlock: null,
        processBlock: null,
      })
    })

    it('sizes an outside step like any other in equal mode', () => {
      const steps = insertAfter(
        referenceSteps(),
        'Code review',
        outsideStep('Security review', 1440)
      )

      const layout = equal(steps)

      expect(stepBox(layout, 'Security review').boxWidth).toBe(EQUAL_BOX_WIDTH)
      expect(stepBox(layout, 'Security review').outsideText).toMatchObject({
        text: 'outside',
      })
    })

    it('says "handoff" on an outside step too, keeping its dashed outline', () => {
      const steps = insertAfter(
        referenceSteps(),
        'Code review',
        outsideStep('Security review', 1440)
      )

      expect(stepBox(scaled(steps), 'Security review')).toMatchObject({
        outline: OUTLINE.DASHED,
        handoffText: 'handoff',
        outsideText: { text: 'outside' },
      })
    })

    it('names the elapsed time when an outside step has none', () => {
      const layout = scaled([outsideStep('Security review', null)])

      expect(layout.steps[0]).toMatchObject({
        outline: OUTLINE.DASHED,
        missingTimeLabels: ['elapsed time'],
      })
      expect(layout.steps[0].boxWidth).toBeGreaterThanOrEqual(
        MIN_SCALED_BOX_WIDTH
      )
    })

    it('leaves non-outside steps without the outside encoding', () => {
      expect(stepBox(scaled(referenceSteps()), 'Deploy').outsideText).toBeNull()
    })
  })

  describe('names', () => {
    it('shows "an unnamed step" for a blank name', () => {
      const layout = scaled([createStep({ name: '' }), team('  ', 1, 1)])

      expect(layout.steps.map((step) => step.name)).toEqual([
        'an unnamed step',
        'an unnamed step',
      ])
    })
  })

  describe('outside steps at the ends', () => {
    it('sizes an outside step in first position by its elapsed time', () => {
      const layout = scaled([outsideStep('Vendor', 600), ...referenceSteps()])

      expect(layout.steps[0]).toMatchObject({
        x: 0,
        boxWidth: 600 * PX_PER_MINUTE,
        outline: OUTLINE.DASHED,
      })
      expect(layout.steps[1].x).toBe(600 * PX_PER_MINUTE)
    })

    it('sizes an outside step in last position by its elapsed time', () => {
      const layout = scaled([...referenceSteps(), outsideStep('Vendor', 600)])

      const vendor = stepBox(layout, 'Vendor')
      expect(vendor.boxWidth).toBe(600 * PX_PER_MINUTE)
      expect(layout.totalWidth).toBe(vendor.x + vendor.boxWidth)
    })
  })

  describe('flags', () => {
    it('flags Code review as both the largest wait and the lowest %C/A', () => {
      const layout = scaled(reworkSteps())

      expect(flagLabels(layout, 'Code review')).toEqual([
        'largest wait',
        'lowest %C/A',
      ])
      expect(flagLabels(layout, 'Development')).toEqual([])
    })

    it('puts each flag on the step that earns it', () => {
      const steps = withStep(referenceSteps(), 'Development', { pctCA: 70 })

      const layout = scaled(withStep(steps, 'Code review', { pctCA: 80 }))

      expect(flagLabels(layout, 'Code review')).toEqual(['largest wait'])
      expect(flagLabels(layout, 'Development')).toEqual(['lowest %C/A'])
    })

    it('flags the same steps in equal mode', () => {
      const layout = equal(reworkSteps())

      expect(flagLabels(layout, 'Code review')).toEqual([
        'largest wait',
        'lowest %C/A',
      ])
    })
  })

  describe('long streams', () => {
    const fortyOneSteps = () =>
      Array.from({ length: 41 }, (_, i) => team(`Step ${i + 1}`, 60, 60))

    it('grows the scaled total width with the steps rather than fitting a window', () => {
      const layout = scaled(fortyOneSteps())

      expect(layout.steps).toHaveLength(41)
      expect(layout.totalWidth).toBe(41 * 120 * PX_PER_MINUTE)
    })

    it('grows the equal total width with the steps', () => {
      expect(equal(fortyOneSteps()).totalWidth).toBe(41 * EQUAL_BOX_WIDTH)
    })
  })

  describe('options', () => {
    it.each([
      ['an unknown mode', { mode: 'fit', pixelsPerMinute: 1, boxWidth: 1 }],
      ['scaled with no pixelsPerMinute', { mode: LADDER_MODE.SCALED }],
      [
        'scaled with a zero pixelsPerMinute',
        { mode: LADDER_MODE.SCALED, pixelsPerMinute: 0 },
      ],
      ['equal with no boxWidth', { mode: LADDER_MODE.EQUAL }],
      [
        'equal with a negative boxWidth',
        { mode: LADDER_MODE.EQUAL, boxWidth: -5 },
      ],
      [
        'scaled with an infinite pixelsPerMinute',
        { mode: LADDER_MODE.SCALED, pixelsPerMinute: Infinity },
      ],
      [
        'scaled with a NaN pixelsPerMinute',
        { mode: LADDER_MODE.SCALED, pixelsPerMinute: NaN },
      ],
      [
        'equal with an infinite boxWidth',
        { mode: LADDER_MODE.EQUAL, boxWidth: Infinity },
      ],
    ])('refuses %s', (_, options) => {
      expect(() => sizeLadder(modelOf(referenceSteps()), options)).toThrow(
        RangeError
      )
    })
  })

  describe('equal mode', () => {
    it('gives every step the same width, whatever its times', () => {
      const layout = equal(referenceSteps())

      expect(layout.steps.map((s) => s.boxWidth)).toEqual(
        Array(5).fill(EQUAL_BOX_WIDTH)
      )
    })

    it('places the steps side by side and totals them', () => {
      const layout = equal(referenceSteps())

      expect(layout.steps.map((s) => s.x)).toEqual([0, 120, 240, 360, 480])
      expect(layout.totalWidth).toBe(5 * EQUAL_BOX_WIDTH)
    })

    it('draws a known wait and process across the whole column', () => {
      const { x, waitBlock, processBlock } = stepBox(
        equal(referenceSteps()),
        'Deploy'
      )

      expect(waitBlock).toMatchObject({
        x,
        width: EQUAL_BOX_WIDTH,
        minutes: 1440,
      })
      expect(processBlock).toMatchObject({
        x,
        width: EQUAL_BOX_WIDTH,
        minutes: 30,
      })
    })
  })
})
