import { describe, it, expect } from 'vitest'
import {
  ladderLayout,
  ladderModel,
  sizeLadder,
  MIN_BOX_WIDTH,
} from '../../../src/utils/ui/ladderLayout.js'
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

const PX_PER_MINUTE = 0.5
const EQUAL_WIDTH = 120

const scaled = (steps, scale = PX_PER_MINUTE) =>
  ladderLayout(versionOf(steps), { mode: 'scaled', scale })

const equal = (steps, width = EQUAL_WIDTH) =>
  ladderLayout(versionOf(steps), { mode: 'equal', width })

const stepBox = (layout, name) => layout.steps.find((s) => s.name === name)

describe('ladderLayout', () => {
  describe('scaled mode', () => {
    it('draws waits in proportion to their minutes', () => {
      const layout = scaled(referenceSteps())

      const codeReview = stepBox(layout, 'Code review').wait.width
      const refinement = stepBox(layout, 'Refinement').wait.width

      expect(codeReview / refinement).toBe(6)
    })

    it('sizes each box to its wait plus process, side by side with no gaps', () => {
      const layout = scaled(referenceSteps())

      const refinement = stepBox(layout, 'Refinement')
      const development = stepBox(layout, 'Development')
      expect(refinement.width).toBe((240 + 480) * PX_PER_MINUTE)
      expect(development.x).toBe(refinement.x + refinement.width)
    })

    it('reports a total width that is the lead time to scale', () => {
      const layout = scaled(referenceSteps())

      const leadTime = 60 + 2400 + 240 + 480 + 480 + 960 + 60 + 2880 + 30 + 1440
      expect(layout.totalWidth).toBe(leadTime * PX_PER_MINUTE)
    })

    it('puts the wait first and the process after it inside the box', () => {
      const layout = scaled(referenceSteps())

      const { x, wait, process } = stepBox(layout, 'Refinement')
      expect(wait).toEqual({ x, width: 240, minutes: 480 })
      expect(process).toEqual({ x: x + 240, width: 120, minutes: 240 })
    })
  })

  describe('encodings', () => {
    it('marks a handoff with the handoff outline and the text "handoff"', () => {
      const steps = withStep(referenceSteps(), 'Deploy', { isHandoff: true })

      const layout = scaled(steps)

      expect(stepBox(layout, 'Deploy')).toMatchObject({
        outline: 'handoff',
        handoff: 'handoff',
      })
      expect(stepBox(layout, 'Development')).toMatchObject({
        outline: 'solid',
        handoff: null,
      })
    })

    it('marks a step with no wait time dashed, naming "wait time"', () => {
      const layout = scaled(withoutWait(referenceSteps(), 'Deploy'))

      const deploy = stepBox(layout, 'Deploy')
      expect(deploy).toMatchObject({
        outline: 'dashed',
        missing: ['wait time'],
      })
      expect(deploy.wait).toBeNull()
      expect(deploy.process).toMatchObject({ minutes: 30 })
      expect(stepBox(layout, 'Development').missing).toEqual([])
    })

    it('names every missing time on a step with none', () => {
      const intake = createStep({ name: 'Intake' })

      const layout = scaled([intake])

      expect(layout.steps).toHaveLength(1)
      expect(layout.steps[0]).toMatchObject({
        outline: 'dashed',
        missing: ['process time', 'wait time'],
        wait: null,
        process: null,
      })
    })

    it('keeps a step with no times visible, but never inflates its segments', () => {
      const layout = scaled([
        createStep({ name: 'Intake' }),
        team('Idle', 0, 0),
      ])

      const [intake, idle] = layout.steps
      expect(intake.width).toBeGreaterThanOrEqual(MIN_BOX_WIDTH)
      expect(idle.width).toBeGreaterThanOrEqual(MIN_BOX_WIDTH)
      expect(idle.wait).toMatchObject({ width: 0, minutes: 0 })
      expect(idle.process).toMatchObject({ width: 0, minutes: 0 })
      expect(idle.missing).toEqual([])
      expect(idle.outline).toBe('solid')
      expect(layout.totalWidth).toBe(intake.width + idle.width)
    })

    it('draws an outside step as a hatched dashed block as wide as its elapsed time', () => {
      const steps = insertAfter(
        referenceSteps(),
        'Code review',
        outsideStep('Security review', 1440)
      )

      const security = stepBox(scaled(steps), 'Security review')

      expect(security).toMatchObject({
        width: 1440 * PX_PER_MINUTE,
        outline: 'dashed',
        outside: { label: 'elapsed · split unknown', text: 'outside' },
        handoff: null,
        missing: [],
        wait: null,
        process: null,
      })
    })

    it('sizes an outside step like any other in equal mode', () => {
      const steps = insertAfter(
        referenceSteps(),
        'Code review',
        outsideStep('Security review', 1440)
      )

      const layout = equal(steps)

      expect(stepBox(layout, 'Security review').width).toBe(EQUAL_WIDTH)
      expect(stepBox(layout, 'Security review').outside).toMatchObject({
        text: 'outside',
      })
    })

    it('names the elapsed time when an outside step has none', () => {
      const layout = scaled([outsideStep('Security review', null)])

      expect(layout.steps[0]).toMatchObject({
        outline: 'dashed',
        missing: ['elapsed time'],
      })
      expect(layout.steps[0].width).toBeGreaterThanOrEqual(MIN_BOX_WIDTH)
    })

    it('leaves non-outside steps without the outside encoding', () => {
      expect(stepBox(scaled(referenceSteps()), 'Deploy').outside).toBeNull()
    })
  })

  describe('flags', () => {
    it('flags Code review as both the largest wait and the lowest %C/A', () => {
      const layout = ladderLayout(versionOf(reworkSteps()), {
        mode: 'scaled',
        scale: PX_PER_MINUTE,
      })

      expect(stepBox(layout, 'Code review').flags).toEqual([
        'largest wait',
        'lowest %C/A',
      ])
      expect(stepBox(layout, 'Development').flags).toEqual([])
    })

    it('puts each flag on the step that earns it', () => {
      const steps = withStep(referenceSteps(), 'Development', { pctCA: 70 })

      const layout = scaled(withStep(steps, 'Code review', { pctCA: 80 }))

      expect(stepBox(layout, 'Code review').flags).toEqual(['largest wait'])
      expect(stepBox(layout, 'Development').flags).toEqual(['lowest %C/A'])
    })

    it('flags the same steps in equal mode', () => {
      const layout = equal(reworkSteps())

      expect(stepBox(layout, 'Code review').flags).toEqual([
        'largest wait',
        'lowest %C/A',
      ])
    })

    it('uses the flags it is given instead of working them out', () => {
      const steps = reworkSteps()
      const deploy = steps.find((s) => s.name === 'Deploy')
      const flags = { topWaits: [{ stepId: deploy.id }], lowestCA: null }

      const layout = ladderLayout(versionOf(steps), {
        mode: 'equal',
        width: EQUAL_WIDTH,
        flags,
      })

      expect(stepBox(layout, 'Deploy').flags).toEqual(['largest wait'])
      expect(stepBox(layout, 'Code review').flags).toEqual([])
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
      expect(equal(fortyOneSteps()).totalWidth).toBe(41 * EQUAL_WIDTH)
    })
  })

  describe('options', () => {
    it.each([
      ['an unknown mode', { mode: 'fit', scale: 1, width: 1 }],
      ['scaled with no scale', { mode: 'scaled' }],
      ['scaled with a zero scale', { mode: 'scaled', scale: 0 }],
      ['equal with no width', { mode: 'equal' }],
      ['equal with a negative width', { mode: 'equal', width: -5 }],
    ])('refuses %s', (_, options) => {
      expect(() => ladderLayout(versionOf(referenceSteps()), options)).toThrow(
        RangeError
      )
    })
  })

  describe('equal mode', () => {
    it('gives every step the same width, whatever its times', () => {
      const layout = equal(referenceSteps())

      expect(layout.steps.map((s) => s.width)).toEqual(
        Array(5).fill(EQUAL_WIDTH)
      )
    })

    it('places the steps side by side and totals them', () => {
      const layout = equal(referenceSteps())

      expect(layout.steps.map((s) => s.x)).toEqual([0, 120, 240, 360, 480])
      expect(layout.totalWidth).toBe(5 * EQUAL_WIDTH)
    })

    it('draws a known wait and process across the whole column', () => {
      const { x, wait, process } = stepBox(equal(referenceSteps()), 'Deploy')

      expect(wait).toMatchObject({ x, width: EQUAL_WIDTH, minutes: 1440 })
      expect(process).toMatchObject({ x, width: EQUAL_WIDTH, minutes: 30 })
    })
  })
})

describe('ladderModel and sizeLadder', () => {
  it('the model holds what does not depend on the view: minutes, encodings, flags', () => {
    const model = ladderModel(versionOf(reworkSteps()))

    const codeReview = model.steps.find((s) => s.name === 'Code review')
    expect(codeReview).toMatchObject({
      minutes: { wait: 2880, process: 60 },
      outline: 'solid',
      flags: ['largest wait', 'lowest %C/A'],
    })
    expect(codeReview).not.toHaveProperty('x')
    expect(codeReview).not.toHaveProperty('width')
  })

  it('uses the flags it is given instead of working them out again', () => {
    const version = versionOf(reworkSteps())
    const { flags } = calculateMetrics(version)

    const model = ladderModel(version, { ...flags, lowestCA: null })

    expect(model.steps.find((s) => s.name === 'Code review').flags).toEqual([
      'largest wait',
    ])
  })

  it('sizing a model gives the same layout as laying out the version', () => {
    const version = versionOf(reworkSteps())
    const { flags } = calculateMetrics(version)

    expect(
      sizeLadder(ladderModel(version, flags), { mode: 'scaled', scale: 0.1 })
    ).toEqual(ladderLayout(version, { mode: 'scaled', scale: 0.1 }))
    expect(
      sizeLadder(ladderModel(version, flags), { mode: 'equal', width: 100 })
    ).toEqual(ladderLayout(version, { mode: 'equal', width: 100 }))
  })
})
