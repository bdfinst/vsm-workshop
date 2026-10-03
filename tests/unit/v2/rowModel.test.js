import { describe, it, expect } from 'vitest'
import { calculateMetrics } from '../../../src/utils/calculations/v2/index.js'
import { rowModel } from '../../../src/utils/ui/rowModel.js'
import {
  insertAfter,
  outsideStep,
  pathBetween,
  referenceReworkVersion,
  referenceVersion,
  referenceSteps,
  team,
  versionOf,
  withStep,
} from './fixtures.js'

const rowsOf = (version) => rowModel(version, calculateMetrics(version))

describe('rowModel', () => {
  it('gives one step row per step, in step order, with the entered values', () => {
    const version = referenceVersion()
    const { steps } = rowsOf(version)

    expect(steps.map((row) => row.name)).toEqual(
      version.steps.map((step) => step.name)
    )
    expect(steps[3]).toMatchObject({
      id: version.steps[3].id,
      name: 'Code review',
      kind: 'team',
      isHandoff: false,
      processTime: { typ: 60 },
      waitTime: { typ: 2880 },
      elapsedTime: null,
      timeSource: 'estimate',
      pctCA: 100,
      rejectRate: 0,
    })
  })

  it('carries the reject rate, or "incomplete" when %C/A is missing', () => {
    const steps = withStep(
      withStep(referenceSteps(), 'Deploy', { pctCA: null }),
      'Code review',
      { pctCA: 80 }
    )
    const { steps: rows } = rowsOf(versionOf(steps))

    expect(rows[3].rejectRate).toBe(20)
    expect(rows[4].rejectRate).toEqual({ incomplete: true, stepName: 'Deploy' })
  })

  it('shows an outside step with elapsed time and no process or wait time', () => {
    const steps = insertAfter(
      referenceSteps(),
      'Code review',
      outsideStep('Security review', 1440)
    )
    const { steps: rows } = rowsOf(versionOf(steps))

    expect(rows[4]).toMatchObject({
      name: 'Security review',
      kind: 'outside',
      isHandoff: true,
      processTime: null,
      waitTime: null,
      elapsedTime: { typ: 1440 },
    })
  })

  it('keeps min and max with the typical value', () => {
    const range = { typ: 2880, min: 1440, max: 4800 }
    const steps = withStep(referenceSteps(), 'Code review', { waitTime: range })
    const { steps: rows } = rowsOf(versionOf(steps))

    expect(rows[3].waitTime).toEqual(range)
  })

  it('flags the largest wait and the lowest %C/A', () => {
    const { steps } = rowsOf(referenceReworkVersion())
    const flagsByName = Object.fromEntries(
      steps.map((row) => [row.name, row.flags])
    )

    expect(flagsByName).toEqual({
      Intake: [],
      Refinement: [],
      Development: [],
      'Code review': ['largest-wait', 'lowest-ca'],
      Deploy: [],
    })
  })

  it('flags the step flags.largestWait names, not the first of the top waits', () => {
    const version = referenceVersion()
    const metrics = calculateMetrics(version)
    const named = version.steps[1]
    const flags = {
      ...metrics.flags,
      largestWait: { stepId: named.id, name: named.name, wait: 1 },
    }

    const { steps } = rowModel(version, { ...metrics, flags })

    expect(
      steps.filter((row) => row.flags.includes('largest-wait')).map((r) => r.id)
    ).toEqual([named.id])
  })

  it('flags only the first step on a tie for the largest wait', () => {
    const steps = [
      team('Intake', 0, 100),
      team('Refinement', 0, 300),
      team('Development', 0, 300),
    ]
    const { steps: rows } = rowsOf(versionOf(steps))

    expect(rows.map((row) => row.flags.includes('largest-wait'))).toEqual([
      false,
      true,
      false,
    ])
  })

  it('flags no wait when every wait is 0', () => {
    const { steps: rows } = rowsOf(
      versionOf([team('Intake', 10, 0), team('Deploy', 10, 0)])
    )

    expect(rows.every((row) => !row.flags.includes('largest-wait'))).toBe(true)
  })

  it('leaves outside steps out of the reject rate and the flags', () => {
    const steps = insertAfter(
      referenceSteps(),
      'Code review',
      outsideStep('Security review', 1440)
    )
    const { steps: rows } = rowsOf(versionOf(steps))

    expect(rows[4]).toMatchObject({ rejectRate: null, flags: [] })
  })

  it('gives one path row per rework path with step names, figures and flag', () => {
    const version = referenceReworkVersion()
    const [path] = version.reworkPaths
    const { paths } = rowsOf(version)

    expect(paths).toHaveLength(1)
    expect(paths[0]).toMatchObject({
      id: path.id,
      fromStepId: path.fromStepId,
      toStepId: path.toStepId,
      fromName: 'Code review',
      toName: 'Intake',
      depth: 3,
      shareOfRejects: 100,
      shareOfItems: 20,
      reworkProcessTime: null,
      reworkTime: { typ: 4620 },
      addedTime: { typ: 924 },
      flags: ['top-path'],
    })
  })

  it('carries a path note and rework process time', () => {
    const steps = withStep(referenceSteps(), 'Code review', { pctCA: 80 })
    const version = versionOf(steps, [
      pathBetween(steps, 'Code review', 'Intake', {
        reworkProcessTime: 60,
        note: 'Fix and retest',
      }),
    ])
    const { paths } = rowsOf(version)

    expect(paths[0]).toMatchObject({
      reworkProcessTime: 60,
      note: 'Fix and retest',
      reworkTime: { typ: 4680 },
    })
  })

  it('passes an incomplete path through with no top-path flag', () => {
    const steps = withStep(referenceSteps(), 'Code review', { pctCA: null })
    const version = versionOf(steps, [
      pathBetween(steps, 'Code review', 'Intake'),
    ])
    const { paths } = rowsOf(version)
    const missing = { incomplete: true, stepName: 'Code review' }

    expect(paths[0]).toMatchObject({
      shareOfItems: missing,
      addedTime: missing,
      reworkTime: { typ: 4620 },
      flags: [],
    })
  })

  it('does not flag a path that adds no time', () => {
    const steps = withStep(referenceSteps(), 'Code review', { pctCA: 80 })
    const version = versionOf(steps, [
      pathBetween(steps, 'Code review', 'Code review'),
    ])

    expect(rowsOf(version).paths[0].flags).toEqual([])
  })

  it('shows a step with no time objects as unset instead of throwing', () => {
    const steps = withStep(referenceSteps(), 'Deploy', {
      processTime: undefined,
      waitTime: undefined,
    })
    const { steps: rows } = rowsOf(versionOf(steps))

    expect(rows[4]).toMatchObject({ processTime: null, waitTime: null })
  })

  it('gives a null name instead of throwing when a path points at an unknown step', () => {
    const steps = withStep(referenceSteps(), 'Code review', { pctCA: 80 })
    const dangling = pathBetween(steps, 'Code review', 'Intake')
    const version = versionOf(steps, [{ ...dangling, toStepId: 'gone' }])

    const { paths } = rowsOf(version)

    expect(paths[0]).toMatchObject({
      fromName: 'Code review',
      toName: null,
      depth: 4,
      reworkTime: { typ: 0, low: 0, high: 0 },
      addedTime: { typ: 0, low: 0, high: 0 },
    })
  })

  it('has no path rows without rework paths', () => {
    expect(rowsOf(referenceVersion()).paths).toEqual([])
  })

  it('does not change the version or the metrics', () => {
    const version = referenceReworkVersion()
    const metrics = calculateMetrics(version)
    const before = structuredClone({ version, metrics })

    rowModel(version, metrics)

    expect({ version, metrics }).toEqual(before)
  })
})
