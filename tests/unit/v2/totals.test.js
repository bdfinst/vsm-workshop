import { describe, it, expect } from 'vitest'
import {
  calculateTotals,
  calculateFlowEfficiency,
  calculateWaitShare,
} from '../../../src/utils/calculations/v2/totals.js'
import {
  insertAfter,
  outsideStep,
  referenceSteps,
  team,
  withStep,
  withWait,
  withoutWait,
} from './fixtures.js'

const asPercent = (ratio) => Math.round(ratio * 1000) / 10

describe('Value stream totals', () => {
  it('Reference map totals', () => {
    const totals = calculateTotals(referenceSteps())
    const efficiency = calculateFlowEfficiency(totals)

    expect(totals.leadTime.typ).toBe(9030)
    expect(totals.processTime.typ).toBe(870)
    expect(asPercent(efficiency.typ)).toBe(9.6)
    expect(totals.handoffCount).toBe(0)
  })

  it('keeps the range ascending when the shortest lead time is not the least waiting', () => {
    const steps = withWait([team('Build', 60, 100)], 'Build', {
      typ: 100,
      min: 40,
      max: 400,
    })
    const efficiency = calculateFlowEfficiency(calculateTotals(steps))

    expect(asPercent(efficiency.low)).toBe(13)
    expect(asPercent(efficiency.high)).toBe(60)
  })

  it('Outside step makes flow efficiency a range', () => {
    const steps = insertAfter(
      referenceSteps(),
      'Code review',
      outsideStep('Security review', 1440)
    )
    const totals = calculateTotals(steps)
    const efficiency = calculateFlowEfficiency(totals)

    expect(totals.leadTime.typ).toBe(10470)
    expect(asPercent(efficiency.low)).toBe(8.3)
    expect(asPercent(efficiency.high)).toBe(22.1)
    expect(totals.handoffCount).toBe(1)
  })

  it('Min and max produce a range', () => {
    const steps = withStep(referenceSteps(), 'Code review', {
      waitTime: { typ: 2880, min: 1440, max: 4800 },
    })
    const totals = calculateTotals(steps)

    expect(totals.leadTime.low).toBe(7590)
    expect(totals.leadTime.high).toBe(10950)
    expect(totals.leadTime.typ).toBe(9030)
  })

  it('A team step may have zero process time', () => {
    const steps = withStep(referenceSteps(), 'Deploy', {
      processTime: { typ: 0 },
    })
    const totals = calculateTotals(steps)

    expect(totals.processTime.typ).toBe(840)
    expect(totals.leadTime.typ).toBe(9000)
  })

  it('flow efficiency is null when the lead time is 0', () => {
    const steps = [team('Intake', 0, 0), team('Deploy', 0, 0)]

    expect(calculateFlowEfficiency(calculateTotals(steps))).toBeNull()
  })

  describe('Missing values make dependent metrics incomplete', () => {
    it.each([
      ['"Deploy" has no wait time', 'lead time', 'Deploy', ['Deploy']],
      ['"Deploy" has no wait time', 'flow efficiency', 'Deploy', ['Deploy']],
      [
        '"Code review" has no wait time and "Deploy" has no wait time',
        'lead time',
        'Code review',
        ['Code review', 'Deploy'],
      ],
    ])(
      '%s: the %s shows "incomplete" naming "%s"',
      (_, metric, stepName, missing) => {
        const totals = calculateTotals(
          withoutWait(referenceSteps(), ...missing)
        )
        const shown =
          metric === 'lead time'
            ? totals.leadTime
            : calculateFlowEfficiency(totals)

        expect(shown).toEqual({ incomplete: true, stepName })
      }
    )

    it('an outside step with no elapsed time makes the lead time incomplete', () => {
      const steps = insertAfter(
        referenceSteps(),
        'Code review',
        outsideStep('Security review', null)
      )

      expect(calculateTotals(steps).leadTime).toEqual({
        incomplete: true,
        stepName: 'Security review',
      })
    })

    it('metrics that do not depend on the missing value stay complete', () => {
      const totals = calculateTotals(withoutWait(referenceSteps(), 'Deploy'))

      expect(totals.processTime.typ).toBe(870)
      expect(totals.waitTime).toEqual({ incomplete: true, stepName: 'Deploy' })
    })
  })

  describe('Lead time of 0 gives no flow efficiency', () => {
    const zero = { typ: 0, low: 0, high: 0 }

    it.each([
      ['typical', { typ: 0, low: 0, high: 0 }],
      ['low', { typ: 10, low: 0, high: 10 }],
      ['high', { typ: 10, low: 10, high: 0 }],
    ])('is null, never NaN, when the %s lead time is 0', (_, leadTime) => {
      expect(
        calculateFlowEfficiency({
          processTime: zero,
          elapsedTime: zero,
          leadTime,
        })
      ).toBeNull()
    })

    it('is null when every min is 0 although the typical lead time is not', () => {
      const steps = withStep([team('Intake', 10, 0)], 'Intake', {
        processTime: { typ: 10, min: 0 },
      })

      expect(calculateFlowEfficiency(calculateTotals(steps))).toBeNull()
    })
  })

  describe('Steps without a time object are treated as unset', () => {
    const bare = () =>
      withStep(referenceSteps(), 'Deploy', {
        processTime: undefined,
        waitTime: undefined,
      })

    it('a team step with no process or wait time object makes those totals incomplete', () => {
      const totals = calculateTotals(bare())
      const missing = { incomplete: true, stepName: 'Deploy' }

      expect(totals.processTime).toEqual(missing)
      expect(totals.waitTime).toEqual(missing)
      expect(totals.leadTime).toEqual(missing)
      expect(totals.elapsedTime).toEqual({ typ: 0, low: 0, high: 0 })
    })

    it('an outside step with no elapsed time object makes the lead time incomplete', () => {
      const steps = insertAfter(referenceSteps(), 'Code review', {
        ...outsideStep('Security review', 1440),
        elapsedTime: undefined,
      })
      const totals = calculateTotals(steps)

      expect(totals.leadTime).toEqual({
        incomplete: true,
        stepName: 'Security review',
      })
      expect(totals.processTime.typ).toBe(870)
    })
  })

  it('counts steps and handoffs', () => {
    const steps = insertAfter(
      referenceSteps(),
      'Code review',
      outsideStep('Security review', 1440)
    )

    expect(calculateTotals(steps)).toMatchObject({
      stepCount: 6,
      handoffCount: 1,
    })
  })

  describe('calculateWaitShare', () => {
    it('is the wait time over the lead time', () => {
      const share = calculateWaitShare(calculateTotals(referenceSteps()))

      expect(asPercent(share.typ)).toBe(90.4)
      expect(asPercent(share.low)).toBe(90.4)
      expect(asPercent(share.high)).toBe(90.4)
    })

    it('spans from WT / LT to (WT + EL) / LT when an outside step exists', () => {
      const steps = insertAfter(
        referenceSteps(),
        'Code review',
        outsideStep('Security review', 1440)
      )
      const share = calculateWaitShare(calculateTotals(steps))

      expect(asPercent(share.low)).toBe(77.9)
      expect(asPercent(share.high)).toBe(91.7)
    })

    it('is null when the lead time is 0', () => {
      const steps = [team('Intake', 0, 0)]

      expect(calculateWaitShare(calculateTotals(steps))).toBeNull()
    })

    it('is incomplete when the lead time is', () => {
      const steps = withoutWait(referenceSteps(), 'Deploy')

      expect(calculateWaitShare(calculateTotals(steps))).toEqual({
        incomplete: true,
        stepName: 'Deploy',
      })
    })
  })
})
