import { describe, it, expect } from 'vitest'
import { calculateMetrics } from '../../../src/utils/calculations/v2/index.js'
import {
  topWaits,
  largestWait,
  topPaths,
  lowestCA,
} from '../../../src/utils/calculations/v2/flags.js'
import {
  calculateRework,
  rolledCA,
  rejectRate,
} from '../../../src/utils/calculations/v2/rework.js'
import {
  insertAfter,
  outsideStep,
  pathBetween,
  referenceSteps,
  reworkSteps,
  team,
  versionOf,
  withStep,
  withoutWait,
} from './fixtures.js'

describe('Quality', () => {
  it('Reference map totals: the rolled %C/A is 100.0%', () => {
    expect(rolledCA(referenceSteps())).toBe(100)
  })

  it('Rework loop cost: the rolled %C/A is 80.0% and Code review rejects 20%', () => {
    const steps = withStep(referenceSteps(), 'Code review', { pctCA: 80 })

    expect(rolledCA(steps)).toBe(80)
    expect(rejectRate(steps[3])).toBe(20)
  })

  it('"Deploy" has no %C/A: the rolled %C/A shows "incomplete" naming "Deploy"', () => {
    const steps = withStep(referenceSteps(), 'Deploy', { pctCA: null })

    expect(rolledCA(steps)).toEqual({ incomplete: true, stepName: 'Deploy' })
    expect(rejectRate(steps[4])).toEqual({
      incomplete: true,
      stepName: 'Deploy',
    })
  })

  it('names the first step with no %C/A', () => {
    const steps = withStep(
      withStep(referenceSteps(), 'Refinement', { pctCA: null }),
      'Deploy',
      { pctCA: null }
    )

    expect(rolledCA(steps)).toEqual({
      incomplete: true,
      stepName: 'Refinement',
    })
  })
})

describe('Quality with outside steps', () => {
  const withSecurityReview = (steps, patch = {}) =>
    insertAfter(steps, 'Code review', {
      ...outsideStep('Security review', 1440),
      ...patch,
    })

  it('the rolled %C/A of team steps is not incomplete because an outside step has no %C/A', () => {
    expect(rolledCA(withSecurityReview(reworkSteps()))).toBe(80)
  })

  it('the rolled %C/A leaves an outside step out even when it has a %C/A', () => {
    expect(rolledCA(withSecurityReview(reworkSteps(), { pctCA: 50 }))).toBe(80)
  })

  it('an outside step with no %C/A has no reject rate to show', () => {
    expect(rejectRate(outsideStep('Security review', 1440))).toBeNull()
  })

  it('an outside step with a %C/A has a reject rate, since a rework loop can start there', () => {
    expect(
      rejectRate({ ...outsideStep('Security review', 1440), pctCA: 70 })
    ).toBe(30)
  })

  it('the lowest %C/A is among team steps only', () => {
    const steps = withSecurityReview(reworkSteps(), { pctCA: 10 })

    expect(lowestCA(steps).name).toBe('Code review')
  })
})

describe('Rework', () => {
  it('Rework loop cost assuming each loop is used at most once per item', () => {
    const steps = reworkSteps()
    const paths = [pathBetween(steps, 'Code review', 'Intake')]
    const { paths: rows, timeOnRework } = calculateRework(steps, paths)

    expect(rows).toHaveLength(1)
    expect(rows[0].depth).toBe(3)
    expect(rows[0].shareOfItems).toBe(20)
    expect(rows[0].reworkTime.typ).toBe(4620)
    expect(rows[0].addedTime.typ).toBe(924)
    expect(timeOnRework.typ).toBe(924)
  })

  it('Rework process time adds to the loop', () => {
    const steps = reworkSteps()
    const paths = [
      pathBetween(steps, 'Code review', 'Intake', { reworkProcessTime: 60 }),
    ]
    const { paths: rows, timeOnRework } = calculateRework(steps, paths)

    expect(rows[0].reworkTime.typ).toBe(4680)
    expect(timeOnRework.typ).toBe(936)
  })

  it('Rework split across two paths, including a depth-0 path', () => {
    const steps = reworkSteps()
    const paths = [
      pathBetween(steps, 'Code review', 'Development', { shareOfRejects: 75 }),
      pathBetween(steps, 'Code review', 'Code review', { shareOfRejects: 25 }),
    ]
    const { paths: rows, timeOnRework } = calculateRework(steps, paths)

    expect(rows.map((row) => row.shareOfItems)).toEqual([15, 5])
    expect(rows.map((row) => row.depth)).toEqual([1, 0])
    expect(rows[1].reworkTime.typ).toBe(0)
    expect(timeOnRework.typ).toBe(216)
  })

  it("keeps each path's row in path order, whichever steps the paths join", () => {
    const steps = withStep(
      withStep(reworkSteps(), 'Development', { pctCA: 90 }),
      'Code review',
      { pctCA: 80 }
    )
    const paths = [
      pathBetween(steps, 'Code review', 'Intake', { shareOfRejects: 50 }),
      pathBetween(steps, 'Development', 'Refinement'),
      pathBetween(steps, 'Code review', 'Development', { shareOfRejects: 50 }),
    ]
    const { paths: rows, timeOnRework } = calculateRework(steps, paths)

    expect(rows.map((row) => row.id)).toEqual(paths.map((path) => path.id))
    expect(rows.map((row) => row.depth)).toEqual([3, 1, 1])
    expect(rows.map((row) => row.shareOfItems)).toEqual([10, 10, 10])
    expect(rows.map((row) => row.reworkTime.typ)).toEqual([4620, 720, 1440])
    expect(rows.map((row) => row.addedTime.typ)).toEqual([462, 72, 144])
    expect(timeOnRework.typ).toBe(678)
  })

  it('Outside step inside a rework loop', () => {
    const steps = withStep(
      insertAfter(
        referenceSteps(),
        'Development',
        outsideStep('Security review', 1440)
      ),
      'Code review',
      { pctCA: 80 }
    )
    const paths = [pathBetween(steps, 'Code review', 'Intake')]
    const { paths: rows, timeOnRework } = calculateRework(steps, paths)

    expect(rows[0].depth).toBe(4)
    expect(rows[0].reworkTime.typ).toBe(6060)
    expect(timeOnRework.typ).toBe(1212)
  })

  it('Min and max produce a range in the loop time', () => {
    const steps = withStep(reworkSteps(), 'Development', {
      waitTime: { typ: 960, min: 480, max: 1920 },
    })
    const paths = [pathBetween(steps, 'Code review', 'Intake')]
    const { paths: rows } = calculateRework(steps, paths)

    expect(rows[0].reworkTime).toEqual({ typ: 4620, low: 4140, high: 5580 })
    expect(rows[0].addedTime).toEqual({ typ: 924, low: 828, high: 1116 })
  })

  it('has no time on rework without paths', () => {
    expect(calculateRework(reworkSteps(), []).timeOnRework).toEqual({
      typ: 0,
      low: 0,
      high: 0,
    })
  })

  describe('Missing values make rework metrics incomplete', () => {
    it('a step in the loop with no wait time names that step', () => {
      const steps = withoutWait(reworkSteps(), 'Refinement')
      const paths = [pathBetween(steps, 'Code review', 'Intake')]
      const { paths: rows, timeOnRework } = calculateRework(steps, paths)
      const missing = { incomplete: true, stepName: 'Refinement' }

      expect(rows[0].reworkTime).toEqual(missing)
      expect(rows[0].addedTime).toEqual(missing)
      expect(rows[0].shareOfItems).toBe(20)
      expect(timeOnRework).toEqual(missing)
    })

    it('a path source with no %C/A names that step', () => {
      const steps = withStep(referenceSteps(), 'Code review', { pctCA: null })
      const paths = [pathBetween(steps, 'Code review', 'Intake')]
      const { paths: rows, timeOnRework } = calculateRework(steps, paths)
      const missing = { incomplete: true, stepName: 'Code review' }

      expect(rows[0].shareOfItems).toEqual(missing)
      expect(rows[0].addedTime).toEqual(missing)
      expect(rows[0].reworkTime.typ).toBe(4620)
      expect(timeOnRework).toEqual(missing)
    })

    it('a step outside every loop does not matter', () => {
      const steps = withoutWait(reworkSteps(), 'Deploy')
      const paths = [pathBetween(steps, 'Code review', 'Intake')]

      expect(calculateRework(steps, paths).timeOnRework.typ).toBe(924)
    })

    it('names the first missing step in step order across paths', () => {
      const steps = withStep(
        withoutWait(reworkSteps(), 'Development'),
        'Deploy',
        {
          pctCA: null,
        }
      )
      const paths = [
        pathBetween(steps, 'Deploy', 'Deploy'),
        pathBetween(steps, 'Code review', 'Intake'),
      ]

      expect(calculateRework(steps, paths).timeOnRework).toEqual({
        incomplete: true,
        stepName: 'Development',
      })
    })
  })
})

describe('Rework paths that end at a step that is not there', () => {
  it('a path to a missing step has depth from the end of the list and adds no time', () => {
    const steps = reworkSteps()
    const path = {
      ...pathBetween(steps, 'Code review', 'Intake'),
      toStepId: 'gone',
    }

    const { paths: rows, timeOnRework } = calculateRework(steps, [path])

    expect(rows[0].depth).toBe(4)
    expect(rows[0].reworkTime).toEqual({ typ: 0, low: 0, high: 0 })
    expect(rows[0].addedTime).toEqual({ typ: 0, low: 0, high: 0 })
    expect(timeOnRework).toEqual({ typ: 0, low: 0, high: 0 })
  })

  it('a path from a missing step throws: the caller validates the version first', () => {
    const steps = reworkSteps()
    const path = {
      ...pathBetween(steps, 'Code review', 'Intake'),
      fromStepId: 'gone',
    }

    expect(() => calculateRework(steps, [path])).toThrow(TypeError)
  })
})

describe('Rework paths over a repeated step id', () => {
  const repeated = (steps, at, source) =>
    steps.map((step, index) =>
      index === at ? { ...step, id: steps[source].id } : step
    )

  it('a path to the repeated id goes to its first step', () => {
    const steps = repeated(reworkSteps(), 1, 0)
    const path = {
      ...pathBetween(steps, 'Code review', 'Intake'),
      toStepId: steps[0].id,
    }

    expect(calculateRework(steps, [path]).paths[0].depth).toBe(3)
  })

  it('a path from the repeated id starts at its first step', () => {
    const steps = repeated(reworkSteps(), 3, 1)
    const path = {
      ...pathBetween(steps, 'Intake', 'Intake'),
      fromStepId: steps[1].id,
      toStepId: steps[0].id,
    }

    expect(calculateRework(steps, [path]).paths[0].depth).toBe(1)
  })
})

describe('Steps without a time object inside a loop', () => {
  it('a team step with no process or wait time object makes the loop incomplete', () => {
    const steps = withStep(reworkSteps(), 'Development', {
      processTime: undefined,
      waitTime: undefined,
    })
    const paths = [pathBetween(steps, 'Code review', 'Intake')]
    const { paths: rows, timeOnRework } = calculateRework(steps, paths)
    const missing = { incomplete: true, stepName: 'Development' }

    expect(rows[0].reworkTime).toEqual(missing)
    expect(timeOnRework).toEqual(missing)
  })

  it('an outside step with no elapsed time object makes the loop incomplete', () => {
    const steps = withStep(
      insertAfter(reworkSteps(), 'Development', outsideStep('Security', 1440)),
      'Security',
      { elapsedTime: undefined }
    )
    const paths = [pathBetween(steps, 'Code review', 'Intake')]

    expect(calculateRework(steps, paths).timeOnRework).toEqual({
      incomplete: true,
      stepName: 'Security',
    })
  })

  it('calculateMetrics does not throw on such steps', () => {
    const steps = withStep(reworkSteps(), 'Development', {
      processTime: undefined,
      waitTime: undefined,
    })
    const version = versionOf(steps, [
      pathBetween(steps, 'Code review', 'Intake'),
    ])

    expect(() => calculateMetrics(version)).not.toThrow()
  })
})

describe('Flags', () => {
  it('Outside step makes flow efficiency a range: the three largest waits are "Code review, Intake, Deploy"', () => {
    const steps = insertAfter(
      referenceSteps(),
      'Code review',
      outsideStep('Security review', 1440)
    )

    expect(topWaits(steps).map((wait) => wait.name)).toEqual([
      'Code review',
      'Intake',
      'Deploy',
    ])
    expect(topWaits(steps)[0]).toEqual({
      stepId: steps[3].id,
      name: 'Code review',
      wait: 2880,
    })
  })

  it('breaks ties between waits by step order', () => {
    const steps = [
      team('Intake', 0, 100),
      team('Refinement', 0, 300),
      team('Development', 0, 300),
      team('Code review', 0, 300),
      team('Deploy', 0, 300),
    ]

    expect(topWaits(steps).map((wait) => wait.name)).toEqual([
      'Refinement',
      'Development',
      'Code review',
    ])
  })

  it('skips steps with no wait time', () => {
    const steps = withStep(referenceSteps(), 'Code review', {
      waitTime: { typ: null },
    })

    expect(topWaits(steps).map((wait) => wait.name)).toEqual([
      'Intake',
      'Deploy',
      'Development',
    ])
  })

  it('names the largest wait as the first of the top waits, or none when every wait is 0', () => {
    const steps = referenceSteps()

    expect(largestWait(steps)).toEqual(topWaits(steps)[0])
    expect(
      largestWait([team('Intake', 10, 0), team('Deploy', 10, 0)])
    ).toBeNull()
  })

  it('skips steps with no wait time object', () => {
    const steps = withStep(referenceSteps(), 'Code review', {
      waitTime: undefined,
    })

    expect(topWaits(steps).map((wait) => wait.name)).toEqual([
      'Intake',
      'Deploy',
      'Development',
    ])
  })

  it('skips waits of 0', () => {
    const steps = [
      team('Intake', 10, 0),
      team('Refinement', 10, 5),
      team('Development', 10, 0),
    ]

    expect(topWaits(steps).map((wait) => wait.name)).toEqual(['Refinement'])
  })

  it('has no top waits when every wait is 0', () => {
    expect(topWaits([team('Intake', 10, 0), team('Deploy', 10, 0)])).toEqual([])
  })

  it('skips paths that add no time', () => {
    const steps = reworkSteps()
    const paths = [
      pathBetween(steps, 'Code review', 'Code review', { shareOfRejects: 25 }),
      pathBetween(steps, 'Code review', 'Development', { shareOfRejects: 75 }),
    ]
    const ranked = topPaths(calculateRework(steps, paths).paths)

    expect(ranked.map((row) => row.id)).toEqual([paths[1].id])
  })

  it('has no top paths when every path adds no time', () => {
    const steps = reworkSteps()
    const paths = [pathBetween(steps, 'Code review', 'Code review')]

    expect(topPaths(calculateRework(steps, paths).paths)).toEqual([])
  })

  it('ranks the paths with the most added time first', () => {
    const steps = withStep(reworkSteps(), 'Deploy', { pctCA: 90 })
    const paths = [
      pathBetween(steps, 'Deploy', 'Code review'),
      pathBetween(steps, 'Code review', 'Intake'),
    ]
    const ranked = topPaths(calculateRework(steps, paths).paths)

    expect(ranked.map((row) => row.addedTime.typ)).toEqual([924, 294])
    expect(ranked.map((row) => row.id)).toEqual([paths[1].id, paths[0].id])
  })

  it('keeps only the three paths with the most added time', () => {
    const steps = withStep(reworkSteps(), 'Deploy', { pctCA: 90 })
    const paths = [
      pathBetween(steps, 'Deploy', 'Intake', { shareOfRejects: 25 }),
      pathBetween(steps, 'Deploy', 'Refinement', { shareOfRejects: 25 }),
      pathBetween(steps, 'Deploy', 'Development', { shareOfRejects: 25 }),
      pathBetween(steps, 'Deploy', 'Code review', { shareOfRejects: 25 }),
    ]

    expect(topPaths(calculateRework(steps, paths).paths)).toHaveLength(3)
  })

  it('leaves paths with incomplete added time out of the ranking', () => {
    const steps = withStep(referenceSteps(), 'Code review', { pctCA: null })
    const paths = [pathBetween(steps, 'Code review', 'Intake')]

    expect(topPaths(calculateRework(steps, paths).paths)).toEqual([])
  })

  it('flags the lowest %C/A, the first step on a tie', () => {
    const steps = withStep(
      withStep(referenceSteps(), 'Refinement', { pctCA: 90 }),
      'Development',
      { pctCA: 90 }
    )

    expect(lowestCA(steps)).toEqual({
      stepId: steps[1].id,
      name: 'Refinement',
      pctCA: 90,
    })
  })

  it('has no lowest %C/A when the lowest entered %C/A is 100', () => {
    expect(lowestCA(referenceSteps())).toBeNull()
  })

  it('has no lowest %C/A when only 100s are entered', () => {
    const steps = withStep(referenceSteps(), 'Deploy', { pctCA: null })

    expect(lowestCA(steps)).toBeNull()
  })

  it('has no lowest %C/A when none is entered', () => {
    const steps = referenceSteps().map((step) => ({ ...step, pctCA: null }))

    expect(lowestCA(steps)).toBeNull()
  })
})

describe('calculateMetrics', () => {
  const deepFreeze = (value) => {
    Object.values(value).forEach((child) => {
      if (child && typeof child === 'object') deepFreeze(child)
    })
    return Object.freeze(value)
  }

  it('"Deploy" has no wait time: the rework-adjusted lead time and flow efficiency are incomplete', () => {
    const steps = withoutWait(reworkSteps(), 'Deploy')
    const metrics = calculateMetrics(
      versionOf(steps, [pathBetween(steps, 'Code review', 'Intake')])
    )
    const missing = { incomplete: true, stepName: 'Deploy' }

    expect(metrics.adjustedLeadTime).toEqual(missing)
    expect(metrics.adjustedFlowEfficiency).toEqual(missing)
  })

  it('a missing %C/A on a path source makes the rework-adjusted lead time incomplete', () => {
    const steps = withStep(referenceSteps(), 'Code review', { pctCA: null })
    const metrics = calculateMetrics(
      versionOf(steps, [pathBetween(steps, 'Code review', 'Intake')])
    )

    expect(metrics.totals.leadTime.typ).toBe(9030)
    expect(metrics.adjustedLeadTime).toEqual({
      incomplete: true,
      stepName: 'Code review',
    })
    expect(metrics.adjustedFlowEfficiency).toEqual(metrics.adjustedLeadTime)
  })

  it('names the first missing step in step order when the rework gap comes first', () => {
    const steps = withoutWait(
      withStep(referenceSteps(), 'Intake', { pctCA: null }),
      'Deploy'
    )
    const metrics = calculateMetrics(
      versionOf(steps, [pathBetween(steps, 'Intake', 'Intake')])
    )

    expect(metrics.totals.leadTime.stepName).toBe('Deploy')
    expect(metrics.adjustedLeadTime).toEqual({
      incomplete: true,
      stepName: 'Intake',
    })
  })

  it('names the first missing step in step order when the lead time gap comes first', () => {
    const steps = withoutWait(
      withStep(referenceSteps(), 'Deploy', { pctCA: null }),
      'Intake'
    )
    const metrics = calculateMetrics(
      versionOf(steps, [pathBetween(steps, 'Deploy', 'Deploy')])
    )

    expect(metrics.adjustedLeadTime).toEqual({
      incomplete: true,
      stepName: 'Intake',
    })
  })

  it('has no flow efficiency when the lead time is 0', () => {
    const steps = [team('Intake', 0, 0), team('Deploy', 0, 0)]
    const metrics = calculateMetrics(versionOf(steps))

    expect(metrics.flowEfficiency).toBeNull()
    expect(metrics.adjustedFlowEfficiency).toBeNull()
  })

  it('is pure: it does not touch its input and gives the same answer twice', () => {
    const steps = reworkSteps()
    const version = deepFreeze(
      versionOf(steps, [pathBetween(steps, 'Code review', 'Intake')])
    )

    expect(calculateMetrics(version)).toEqual(calculateMetrics(version))
  })
})
