import { describe, it, expect } from 'vitest'
import { calculateMetrics } from '../../../src/utils/calculations/v2/index.js'
import { createStep } from '../../../src/models/v2/step.js'
import { summaryModel } from '../../../src/utils/ui/summaryModel.js'
import {
  REFERENCE_WORKDAY_HOURS,
  insertAfter,
  outsideStep,
  referenceSteps,
  reworkSteps,
  team,
  versionOf,
  withStep,
  withoutWait,
} from './fixtures.js'

const summaryOf = (steps, workdayHours = REFERENCE_WORKDAY_HOURS) =>
  summaryModel(calculateMetrics(versionOf(steps)), workdayHours)

const rowTexts = (summary) =>
  Object.fromEntries(summary.rows.map((row) => [row.id, row.text]))

describe('summaryModel', () => {
  it('leads with flow efficiency, then lead time, process time, rolled %C/A and handoffs', () => {
    const summary = summaryOf(referenceSteps())

    expect(summary.hero).toMatchObject({
      id: 'flow-efficiency',
      label: 'Flow efficiency',
      text: '9.6%',
      incomplete: false,
    })
    expect(summary.rows.map(({ id, label }) => [id, label])).toEqual([
      ['lead-time', 'Lead time'],
      ['process-time', 'Process time'],
      ['rolled-ca', 'Rolled %C/A'],
      ['handoffs', 'Handoffs'],
    ])
    expect(rowTexts(summary)).toEqual({
      'lead-time': '18.8 days',
      'process-time': '1.8 days',
      'rolled-ca': '100.0%',
      handoffs: '0',
    })
  })

  it('explains flow efficiency in a short sentence', () => {
    expect(summaryOf(referenceSteps()).hero.context).toBe(
      'Share of the lead time spent working rather than waiting.'
    )
  })

  it('counts the handoffs', () => {
    const steps = withStep(referenceSteps(), 'Deploy', { isHandoff: true })

    expect(rowTexts(summaryOf(steps)).handoffs).toBe('1')
  })

  it('reads durations in the stream workday', () => {
    expect(rowTexts(summaryOf(referenceSteps(), 6))['lead-time']).toBe(
      '25.1 days'
    )
  })

  it('shows flow efficiency as a range when a step is outside, and says why', () => {
    const steps = insertAfter(
      referenceSteps(),
      'Code review',
      outsideStep('Security review', 1440)
    )
    const { hero } = summaryOf(steps)

    expect(hero.text).toBe('8.3%–22.1%')
    expect(hero.context).toMatch(/range/)
  })

  it('shows lead time as a range when min and max are entered', () => {
    const steps = withStep(referenceSteps(), 'Deploy', {
      waitTime: { typ: 1440, min: 960, max: 1920 },
    })
    const summary = summaryOf(steps)

    expect(rowTexts(summary)['lead-time']).toBe('17.8–19.8 days')
    expect(summary.hero.text).toMatch(/%–/)
  })

  it('reads a total under a working day in hours', () => {
    const steps = [team('Intake', 60, 120)]

    expect(rowTexts(summaryOf(steps))['lead-time']).toBe('3.0 hours')
  })

  it('shows "incomplete" naming the step when lead time is missing a wait', () => {
    const summary = summaryOf(withoutWait(referenceSteps(), 'Deploy'))
    const leadTime = summary.rows.find((row) => row.id === 'lead-time')

    expect(leadTime).toMatchObject({
      text: 'incomplete',
      incomplete: true,
      note: 'waiting on Deploy',
    })
    expect(summary.hero).toMatchObject({
      text: 'incomplete',
      incomplete: true,
      note: 'waiting on Deploy',
    })
  })

  it('still shows the figures that do not need the missing value', () => {
    const summary = summaryOf(withoutWait(referenceSteps(), 'Deploy'))

    expect(rowTexts(summary)['process-time']).toBe('1.8 days')
    expect(rowTexts(summary)['rolled-ca']).toBe('100.0%')
    expect(rowTexts(summary).handoffs).toBe('0')
  })

  it('names the first step missing a %C/A for rolled %C/A', () => {
    const steps = withStep(referenceSteps(), 'Refinement', { pctCA: null })
    const rolled = summaryOf(steps).rows.find((row) => row.id === 'rolled-ca')

    expect(rolled).toMatchObject({
      text: 'incomplete',
      note: 'waiting on Refinement',
    })
  })

  it('is incomplete throughout for a new map of only Intake with no times', () => {
    const summary = summaryOf([createStep({ name: 'Intake' })])

    expect(summary.hero).toMatchObject({
      text: 'incomplete',
      note: 'waiting on Intake',
    })
    expect(summary.rows.map((row) => row.text)).toEqual([
      'incomplete',
      'incomplete',
      'incomplete',
      '0',
    ])
  })

  it('says flow efficiency is not available when the lead time is 0', () => {
    const { hero } = summaryOf([team('Intake', 0, 0)])

    expect(hero).toMatchObject({ text: 'not available', incomplete: false })
  })

  it('has no flagged steps for a map with no waits', () => {
    const steps = referenceSteps().map((step) => ({
      ...step,
      waitTime: { typ: null },
    }))

    expect(summaryOf(steps).flagged).toEqual([])
  })

  it('flags only the largest wait when nothing is below 100 %C/A', () => {
    expect(summaryOf(referenceSteps()).flagged).toEqual([
      {
        kind: 'largest-wait',
        label: 'largest wait',
        tone: 'warn',
        name: 'Code review',
      },
    ])
  })

  it('flags the same step for the largest wait and the lowest %C/A', () => {
    expect(summaryOf(reworkSteps()).flagged).toEqual([
      {
        kind: 'largest-wait',
        label: 'largest wait',
        tone: 'warn',
        name: 'Code review',
      },
      {
        kind: 'lowest-ca',
        label: 'lowest %C/A',
        tone: 'crit',
        name: 'Code review',
      },
    ])
  })
})
