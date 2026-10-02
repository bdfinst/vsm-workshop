import { describe, it, expect } from 'vitest'
import { calculateMetrics } from '../../../src/utils/calculations/v2/index.js'
import { rejectRate } from '../../../src/utils/calculations/v2/rework.js'
import {
  formatDuration,
  formatDurationRange,
  formatPercent,
  formatPercentRange,
} from '../../../src/utils/calculations/v2/format.js'
import {
  REFERENCE_WORKDAY_HOURS,
  insertAfter,
  outsideStep,
  pathBetween,
  referenceReworkVersion,
  referenceSteps,
  referenceVersion,
  reworkSteps,
  team,
  versionOf,
  withStep,
  withoutWait,
} from './fixtures.js'

// Feature: Value stream metrics. Each scenario is one test, titled with its name;
// an outline is one test per example row. Background: a working day of 8 hours
// and the reference steps (see fixtures.js).
const WORKDAY = REFERENCE_WORKDAY_HOURS
const days = (minutes, workday = WORKDAY) => formatDuration(minutes, workday)
const ratio = { scale: 'ratio' }

describe('Feature: Value stream metrics', () => {
  it('Reference map totals', () => {
    const metrics = calculateMetrics(referenceVersion())

    expect(metrics.totals.leadTime.typ).toBe(9030)
    expect(days(metrics.totals.leadTime.typ)).toBe('18.8 days')
    expect(metrics.totals.processTime.typ).toBe(870)
    expect(days(metrics.totals.processTime.typ)).toBe('1.8 days')
    expect(formatPercent(metrics.flowEfficiency.typ, ratio)).toBe('9.6%')
    expect(formatPercent(metrics.rolledCA)).toBe('100.0%')
    expect(metrics.handoffCount).toBe(0)
  })

  it('Rework loop cost assuming each loop is used at most once per item', () => {
    const version = referenceReworkVersion()
    const metrics = calculateMetrics(version)
    const [path] = metrics.rework.paths

    expect(formatPercent(rejectRate(version.steps[3]), { decimals: 0 })).toBe(
      '20%'
    )
    expect(path.depth).toBe(3)
    expect(formatPercent(path.shareOfItems, { decimals: 0 })).toBe('20%')
    expect(path.reworkTime.typ).toBe(4620)
    expect(metrics.rework.timeOnRework.typ).toBe(924)
    expect(days(metrics.rework.timeOnRework.typ)).toBe('1.9 days')
    expect(metrics.adjustedLeadTime.typ).toBe(9954)
    expect(days(metrics.adjustedLeadTime.typ)).toBe('20.7 days')
    expect(formatPercent(metrics.adjustedFlowEfficiency.typ, ratio)).toBe(
      '8.7%'
    )
    expect(formatPercent(metrics.rolledCA)).toBe('80.0%')
  })

  it('Rework process time adds to the loop', () => {
    const steps = reworkSteps()
    const metrics = calculateMetrics(
      versionOf(steps, [
        pathBetween(steps, 'Code review', 'Intake', { reworkProcessTime: 60 }),
      ])
    )

    expect(metrics.rework.paths[0].reworkTime.typ).toBe(4680)
    expect(metrics.rework.timeOnRework.typ).toBe(936)
  })

  it('Rework split across two paths, including a depth-0 path', () => {
    const steps = reworkSteps()
    const metrics = calculateMetrics(
      versionOf(steps, [
        pathBetween(steps, 'Code review', 'Development', {
          shareOfRejects: 75,
        }),
        pathBetween(steps, 'Code review', 'Code review', {
          shareOfRejects: 25,
        }),
      ])
    )
    const [toDevelopment, toCodeReview] = metrics.rework.paths

    expect(formatPercent(toDevelopment.shareOfItems, { decimals: 0 })).toBe(
      '15%'
    )
    expect(formatPercent(toCodeReview.shareOfItems, { decimals: 0 })).toBe('5%')
    expect(toCodeReview.depth).toBe(0)
    expect(metrics.rework.timeOnRework.typ).toBe(216)
  })

  it('Outside step makes flow efficiency a range', () => {
    const steps = insertAfter(
      referenceSteps(),
      'Code review',
      outsideStep('Security review', 1440)
    )
    const metrics = calculateMetrics(versionOf(steps))

    expect(metrics.totals.leadTime.typ).toBe(10470)
    expect(days(metrics.totals.leadTime.typ)).toBe('21.8 days')
    expect(formatPercentRange(metrics.flowEfficiency, ratio)).toBe('8.3%–22.1%')
    expect(metrics.handoffCount).toBe(1)
    expect(metrics.flags.topWaits.map((wait) => wait.name).join(', ')).toBe(
      'Code review, Intake, Deploy'
    )
  })

  it('Outside step inside a rework loop', () => {
    const steps = insertAfter(
      reworkSteps(),
      'Development',
      outsideStep('Security review', 1440)
    )
    const metrics = calculateMetrics(
      versionOf(steps, [pathBetween(steps, 'Code review', 'Intake')])
    )

    expect(metrics.rework.paths[0].depth).toBe(4)
    expect(metrics.rework.paths[0].reworkTime.typ).toBe(6060)
    expect(metrics.rework.timeOnRework.typ).toBe(1212)
    expect(metrics.adjustedLeadTime.typ).toBe(11682)
  })

  it('Min and max produce a range', () => {
    const steps = withStep(referenceSteps(), 'Code review', {
      waitTime: { typ: 2880, min: 1440, max: 4800 },
    })
    const { leadTime } = calculateMetrics(versionOf(steps)).totals

    expect(formatDurationRange(leadTime, WORKDAY)).toBe('15.8–22.8 days')
  })

  it('A team step may have zero process time', () => {
    const steps = withStep(referenceSteps(), 'Deploy', {
      processTime: { typ: 0 },
    })
    const { totals } = calculateMetrics(versionOf(steps))

    expect(totals.processTime.typ).toBe(840)
    expect(totals.leadTime.typ).toBe(9000)
  })

  describe('Missing values make dependent metrics incomplete', () => {
    const metricOf = {
      'lead time': (metrics) => metrics.totals.leadTime,
      'flow efficiency': (metrics) => metrics.flowEfficiency,
      'rolled %C/A': (metrics) => metrics.rolledCA,
    }

    const noWait =
      (...names) =>
      (steps) =>
        withoutWait(steps, ...names)
    const noCA = (name) => (steps) => withStep(steps, name, { pctCA: null })

    it.each([
      ['"Deploy" has no wait time', 'lead time', 'Deploy', noWait('Deploy')],
      [
        '"Deploy" has no wait time',
        'flow efficiency',
        'Deploy',
        noWait('Deploy'),
      ],
      [
        '"Code review" has no wait time and "Deploy" has no wait time',
        'lead time',
        'Code review',
        noWait('Code review', 'Deploy'),
      ],
      ['"Deploy" has no %C/A', 'rolled %C/A', 'Deploy', noCA('Deploy')],
    ])(
      '%s: the %s shows "incomplete" naming "%s"',
      (_missing, metric, step, applyMissing) => {
        const metrics = calculateMetrics(
          versionOf(applyMissing(referenceSteps()))
        )

        expect(metricOf[metric](metrics)).toEqual({
          incomplete: true,
          stepName: step,
        })
      }
    )
  })

  describe('Duration display boundary', () => {
    it.each([
      [210, '3.5 hours'],
      [479, '8.0 hours'],
      [480, '1.0 days'],
      [9030, '18.8 days'],
    ])('a duration of %i minutes is shown as "%s"', (minutes, display) => {
      expect(days(minutes)).toBe(display)
    })
  })

  it('Working day length changes display, not stored minutes', () => {
    const metrics = calculateMetrics(referenceVersion())

    expect(metrics.totals.leadTime.typ).toBe(9030)
    expect(days(metrics.totals.leadTime.typ, 7.5)).toBe('20.1 days')
  })

  describe('Metrics facade', () => {
    it('counts steps and handoffs', () => {
      const steps = insertAfter(
        referenceSteps(),
        'Code review',
        outsideStep('Security review', 1440)
      )
      const metrics = calculateMetrics(versionOf(steps))

      expect(metrics.stepCount).toBe(6)
      expect(metrics.handoffCount).toBe(1)
    })

    it('gives the share of lead time spent waiting', () => {
      const metrics = calculateMetrics(referenceVersion())

      expect(formatPercent(metrics.waitShareOfLeadTime.typ, ratio)).toBe(
        '90.4%'
      )
    })

    it('makes the wait share a range when an outside step exists', () => {
      const steps = insertAfter(
        referenceSteps(),
        'Code review',
        outsideStep('Security review', 1440)
      )
      const metrics = calculateMetrics(versionOf(steps))

      expect(formatPercentRange(metrics.waitShareOfLeadTime, ratio)).toBe(
        '77.9%–91.7%'
      )
    })

    it('has no wait share when the lead time is 0, and passes incompleteness on', () => {
      const zero = calculateMetrics(
        versionOf([team('Intake', 0, 0), team('Deploy', 0, 0)])
      )
      const missing = calculateMetrics(
        versionOf(withoutWait(referenceSteps(), 'Deploy'))
      )

      expect(zero.waitShareOfLeadTime).toBeNull()
      expect(missing.waitShareOfLeadTime).toEqual({
        incomplete: true,
        stepName: 'Deploy',
      })
    })

    it('rolls %C/A over team steps when an outside step has none', () => {
      const steps = insertAfter(
        reworkSteps(),
        'Code review',
        outsideStep('Security review', 1440)
      )
      const metrics = calculateMetrics(versionOf(steps))

      expect(formatPercent(metrics.rolledCA)).toBe('80.0%')
    })

    it('gives the rework-adjusted lead time and flow efficiency as ranges', () => {
      const steps = withStep(reworkSteps(), 'Development', {
        waitTime: { typ: 960, min: 480, max: 1920 },
      })
      const metrics = calculateMetrics(
        versionOf(steps, [pathBetween(steps, 'Code review', 'Intake')])
      )

      expect(metrics.adjustedLeadTime).toEqual({
        typ: 9954,
        low: 9378,
        high: 11106,
      })
      expect(metrics.adjustedFlowEfficiency.typ).toBeCloseTo(870 / 9954)
      expect(metrics.adjustedFlowEfficiency.low).toBeCloseTo(870 / 9378)
      expect(metrics.adjustedFlowEfficiency.high).toBeCloseTo(870 / 11106)
    })
  })
})
