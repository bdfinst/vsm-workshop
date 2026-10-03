import { describe, it, expect } from 'vitest'
import { calculateMetrics } from '../../../src/utils/calculations/v2/index.js'
import {
  FLAG_KIND,
  TONE,
  displayNameOf,
  flaggedSteps,
  flagsOf,
} from '../../../src/utils/ui/flaggedSteps.js'
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

// The ladder and the summary strip both ask this one module which steps are
// flagged, so the two can never name different steps.
describe('flaggedSteps', () => {
  it('names the largest wait and the lowest %C/A, in that order', () => {
    const { flags } = calculateMetrics(versionOf(reworkSteps()))

    expect(flaggedSteps(flags)).toEqual([
      expect.objectContaining({
        kind: FLAG_KIND.LARGEST_WAIT,
        label: 'largest wait',
        tone: TONE.WARN,
        name: 'Code review',
      }),
      expect.objectContaining({
        kind: FLAG_KIND.LOWEST_CA,
        label: 'lowest %C/A',
        tone: TONE.CRIT,
        name: 'Code review',
      }),
    ])
  })

  it('names no lowest %C/A when no step is below 100', () => {
    const { flags } = calculateMetrics(versionOf(referenceSteps()))

    expect(flaggedSteps(flags).map(({ kind }) => kind)).toEqual([
      FLAG_KIND.LARGEST_WAIT,
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

describe('flaggedSteps with two distinct steps', () => {
  // Code review has the largest wait; Development has the lowest %C/A.
  const twoStepVersion = () =>
    versionOf(
      withStep(
        withStep(referenceSteps(), 'Development', { pctCA: 70 }),
        'Code review',
        { pctCA: 80 }
      )
    )

  it('puts each flag on the step that earns it', () => {
    const { flags } = calculateMetrics(twoStepVersion())

    expect(flaggedSteps(flags).map(({ kind, name }) => [kind, name])).toEqual([
      [FLAG_KIND.LARGEST_WAIT, 'Code review'],
      [FLAG_KIND.LOWEST_CA, 'Development'],
    ])
  })

  it('lists on each step only its own flag', () => {
    const version = twoStepVersion()
    const { flags } = calculateMetrics(version)
    const idOf = (name) => version.steps.find((s) => s.name === name).id

    expect(flagsOf(flags, idOf('Code review')).map(({ kind }) => kind)).toEqual(
      [FLAG_KIND.LARGEST_WAIT]
    )
    expect(flagsOf(flags, idOf('Development')).map(({ kind }) => kind)).toEqual(
      [FLAG_KIND.LOWEST_CA]
    )
  })
})

describe('flaggedSteps at the edges of %C/A', () => {
  const lowestFlag = (pctCA) => {
    const steps = withStep(referenceSteps(), 'Development', { pctCA })
    const { flags } = calculateMetrics(versionOf(steps))
    return flaggedSteps(flags).find(({ kind }) => kind === FLAG_KIND.LOWEST_CA)
  }

  it.each([0, 99])('flags a step at %C/A %i as the lowest', (pctCA) => {
    expect(lowestFlag(pctCA)).toMatchObject({
      name: 'Development',
      tone: TONE.CRIT,
    })
  })

  it('flags no step at %C/A 100', () => {
    expect(lowestFlag(100)).toBeUndefined()
  })
})

// Ties go to the first step in map order. The ladder and the strip both read
// these flags, so they agree on which step it is.
describe('flaggedSteps with a tie', () => {
  const flaggedNames = (steps) =>
    flaggedSteps(calculateMetrics(versionOf(steps)).flags).map(
      ({ kind, name }) => [kind, name]
    )

  it('gives the largest wait to the first of two steps with the same wait', () => {
    const steps = [team('First', 60, 500), team('Second', 60, 500)]

    expect(flaggedNames(steps)).toEqual([[FLAG_KIND.LARGEST_WAIT, 'First']])
  })

  it('gives the lowest %C/A to the first of two steps with the same %C/A', () => {
    const steps = [team('First', 60, 0, 80), team('Second', 60, 0, 80)]

    expect(flaggedNames(steps)).toEqual([[FLAG_KIND.LOWEST_CA, 'First']])
  })
})

describe('flaggedSteps with an outside step', () => {
  it('never gives the largest wait to an outside step, however long it takes', () => {
    const steps = insertAfter(
      referenceSteps(),
      'Code review',
      outsideStep('Security review', 100000)
    )
    const { flags } = calculateMetrics(versionOf(steps))

    expect(flaggedSteps(flags).map(({ name }) => name)).toEqual(['Code review'])
  })

  it('never gives the lowest %C/A to an outside step', () => {
    const steps = insertAfter(referenceSteps(), 'Code review', {
      ...outsideStep('Security review', 1440),
      pctCA: 10,
    })
    const { flags } = calculateMetrics(versionOf(steps))

    expect(
      flaggedSteps(flags).filter(({ kind }) => kind === FLAG_KIND.LOWEST_CA)
    ).toEqual([])
  })
})

describe('displayNameOf', () => {
  it.each([
    ['a name', 'Deploy', 'Deploy'],
    ['a blank name', '', 'an unnamed step'],
    ['a whitespace name', '   ', 'an unnamed step'],
    ['no name', undefined, 'an unnamed step'],
  ])('shows %s as it should', (_, name, shown) => {
    expect(displayNameOf(name)).toBe(shown)
  })
})

describe('flagsOf', () => {
  it('lists the flags on one step, and none for others', () => {
    const version = versionOf(reworkSteps())
    const { flags } = calculateMetrics(version)
    const idOf = (name) => version.steps.find((s) => s.name === name).id

    expect(flagsOf(flags, idOf('Code review'))).toEqual([
      { kind: 'largest-wait', label: 'largest wait', tone: 'warn' },
      { kind: 'lowest-ca', label: 'lowest %C/A', tone: 'crit' },
    ])
    expect(flagsOf(flags, idOf('Deploy'))).toEqual([])
  })
})
