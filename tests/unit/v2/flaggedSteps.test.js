import { describe, it, expect } from 'vitest'
import { calculateMetrics } from '../../../src/utils/calculations/v2/index.js'
import {
  FLAG_LABEL,
  flagLabelsOf,
  flaggedSteps,
} from '../../../src/utils/ui/flaggedSteps.js'
import {
  referenceSteps,
  reworkSteps,
  versionOf,
  withoutWait,
} from './fixtures.js'

// The ladder and the summary strip both ask this one module which steps are
// flagged, so the two can never name different steps.
describe('flaggedSteps', () => {
  it('names the largest wait and the lowest %C/A, in that order', () => {
    const { flags } = calculateMetrics(versionOf(reworkSteps()))

    expect(flaggedSteps(flags)).toEqual([
      expect.objectContaining({
        label: FLAG_LABEL.LARGEST_WAIT,
        name: 'Code review',
      }),
      expect.objectContaining({
        label: FLAG_LABEL.LOWEST_CA,
        name: 'Code review',
      }),
    ])
  })

  it('names no lowest %C/A when no step is below 100', () => {
    const { flags } = calculateMetrics(versionOf(referenceSteps()))

    expect(flaggedSteps(flags).map(({ label }) => label)).toEqual([
      FLAG_LABEL.LARGEST_WAIT,
    ])
  })

  it('names nothing when no step has a wait', () => {
    const steps = withoutWait(
      referenceSteps(),
      'Intake',
      'Refinement',
      'Development',
      'Code review',
      'Deploy'
    )
    const { flags } = calculateMetrics(versionOf(steps))

    expect(flaggedSteps(flags)).toEqual([])
  })

  it('gives the step id each flag sits on', () => {
    const version = versionOf(reworkSteps())
    const codeReview = version.steps.find((s) => s.name === 'Code review')

    expect(
      flaggedSteps(calculateMetrics(version).flags).map(({ stepId }) => stepId)
    ).toEqual([codeReview.id, codeReview.id])
  })
})

describe('flagLabelsOf', () => {
  it('lists the labels of the flags on one step, and none for others', () => {
    const version = versionOf(reworkSteps())
    const { flags } = calculateMetrics(version)
    const idOf = (name) => version.steps.find((s) => s.name === name).id

    expect(flagLabelsOf(flags, idOf('Code review'))).toEqual([
      'largest wait',
      'lowest %C/A',
    ])
    expect(flagLabelsOf(flags, idOf('Deploy'))).toEqual([])
  })
})
