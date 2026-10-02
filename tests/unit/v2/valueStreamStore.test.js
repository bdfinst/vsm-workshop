import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import { validateReworkShares } from '../../../src/utils/validation/v2/reworkPathValidator.js'
import {
  openStream,
  pathsFrom,
  referenceReworkStream,
  referenceStream,
  refused,
  stepNamed,
  stepNames,
} from './fixtures.js'

describe('valueStreamStore: reading', () => {
  it('exposes the stream, its active version and metrics derived from it', () => {
    const { store } = openStream(referenceStream())

    expect(store.stream.name).toBe('Checkout delivery')
    expect(store.activeVersion.steps).toHaveLength(5)
    expect(store.metrics.stepCount).toBe(5)
  })

  it('does not change the stream it was given', () => {
    const stream = referenceReworkStream()
    const before = structuredClone(stream)
    const { store } = openStream(stream)

    store.updateStep(stepNamed(store, 'Deploy').id, { name: 'Release' })

    expect(stream).toEqual(before)
  })

  it('recomputes metrics after an edit', () => {
    const { store } = openStream(referenceStream())
    const before = store.metrics.totals.processTime.typ
    const deploy = stepNamed(store, 'Deploy')

    store.updateStep(deploy.id, {
      processTime: { typ: deploy.processTime.typ + 60 },
    })
    flushSync()

    expect(store.metrics.totals.processTime.typ).toBe(before + 60)
  })
})

describe('valueStreamStore: update a step', () => {
  it('applies an accepted edit and persists the stream once', () => {
    const { store, persist } = openStream()
    const id = stepNamed(store, 'Development').id

    const result = store.updateStep(id, { processTime: { typ: 120 } })

    expect(result).toEqual({ ok: true })
    expect(stepNamed(store, 'Development').processTime.typ).toBe(120)
    expect(persist).toHaveBeenCalledTimes(1)
    expect(persist.mock.calls[0][0]).toEqual(store.stream)
  })

  it('persists a plain object, not the live state', () => {
    const { store, persist } = openStream()

    store.updateStep(stepNamed(store, 'Deploy').id, { name: 'Release' })

    const [persisted] = persist.mock.calls[0]
    store.updateStep(stepNamed(store, 'Release').id, { name: 'Ship' })
    expect(persisted.versions[0].steps.at(-1).name).toBe('Release')
  })

  it('refuses an invalid value, keeps the old one and does not persist', () => {
    const { store, persist } = openStream()
    const id = stepNamed(store, 'Development').id

    const result = store.updateStep(id, { processTime: { typ: -5 } })

    expect(result).toEqual(refused)
    expect(stepNamed(store, 'Development').processTime.typ).toBe(480)
    expect(persist).not.toHaveBeenCalled()
  })

  it('refuses an unknown step', () => {
    const { store, persist } = openStream()

    const result = store.updateStep('nope', { name: 'x' })

    expect(result).toEqual(refused)
    expect(persist).not.toHaveBeenCalled()
  })

  it('never lets a patch change the step id', () => {
    const { store } = openStream()
    const { id } = stepNamed(store, 'Deploy')

    store.updateStep(id, { id: 'other', name: 'Release' })

    expect(stepNamed(store, 'Release').id).toBe(id)
  })

  it('keeps Intake as the first team step', () => {
    const { store, persist } = openStream()

    const result = store.updateStep(stepNamed(store, 'Intake').id, {
      name: 'Triage',
    })

    expect(result.ok).toBe(false)
    expect(stepNames(store)[0]).toBe('Intake')
    expect(persist).not.toHaveBeenCalled()
  })
})

describe('valueStreamStore: add and insert a step', () => {
  it('adds a step at the end', () => {
    const { store, persist } = openStream()

    const result = store.addStep({ name: 'Monitor', performedBy: 'Ops' })

    expect(result.ok).toBe(true)
    expect(stepNames(store).at(-1)).toBe('Monitor')
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('inserts a step after a given step', () => {
    const { store } = openStream()

    store.insertStep(stepNamed(store, 'Intake').id, { name: 'Legal review' })

    expect(stepNames(store)).toEqual([
      'Intake',
      'Legal review',
      'Refinement',
      'Development',
      'Code review',
      'Deploy',
    ])
  })

  it('adds an outside step as a handoff with one elapsed time', () => {
    const { store } = openStream()

    store.addStep({ name: 'Security review', kind: 'outside' })

    const added = stepNamed(store, 'Security review')
    expect(added.isHandoff).toBe(true)
    expect(added.elapsedTime).toEqual({ typ: null })
    expect(added.processTime).toBeUndefined()
  })

  it('refuses an invalid new step and does not persist', () => {
    const { store, persist } = openStream()

    const result = store.addStep({
      name: 'Bad',
      processTime: { typ: -1 },
      waitTime: { typ: null },
    })

    expect(result.ok).toBe(false)
    expect(stepNames(store)).not.toContain('Bad')
    expect(persist).not.toHaveBeenCalled()
  })

  it('refuses to insert after a step that is not there', () => {
    const { store, persist } = openStream()

    const result = store.insertStep('nope', { name: 'x' })

    expect(result).toEqual(refused)
    expect(persist).not.toHaveBeenCalled()
  })
})

describe('valueStreamStore: reorder steps', () => {
  it('moves a step to a new position', () => {
    const { store, persist } = openStream()

    const result = store.moveStep(stepNamed(store, 'Development').id, 1)

    expect(result.ok).toBe(true)
    expect(stepNames(store)).toEqual([
      'Intake',
      'Development',
      'Refinement',
      'Code review',
      'Deploy',
    ])
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('refuses to move a step above Intake', () => {
    const { store, persist } = openStream()

    const result = store.moveStep(stepNamed(store, 'Code review').id, 0)

    expect(result).toEqual(refused)
    expect(persist).not.toHaveBeenCalled()
  })

  it('refuses to move Intake', () => {
    const { store, persist } = openStream()
    const before = stepNames(store)

    const result = store.moveStep(stepNamed(store, 'Intake').id, 2)

    expect(result).toEqual(refused)
    expect(stepNames(store)).toEqual(before)
    expect(persist).not.toHaveBeenCalled()
  })

  it('refuses a move that would make a rework path point forward', () => {
    const { store, persist } = openStream()
    const codeReview = stepNamed(store, 'Code review').id
    const development = stepNamed(store, 'Development').id
    store.addReworkPath({ fromStepId: codeReview, toStepId: development })
    persist.mockClear()
    const before = stepNames(store)

    const result = store.moveStep(codeReview, 2)

    expect(result).toEqual(refused)
    expect(stepNames(store)).toEqual(before)
    expect(persist).not.toHaveBeenCalled()
  })

  it('refuses a position outside the list and an unknown step', () => {
    const { store, persist } = openStream()
    const deploy = stepNamed(store, 'Deploy').id

    expect(store.moveStep(deploy, 9).ok).toBe(false)
    expect(store.moveStep('nope', 1)).toEqual(refused)
    expect(persist).not.toHaveBeenCalled()
  })
})

describe('valueStreamStore: delete a step', () => {
  it('refuses to delete Intake', () => {
    const { store, persist } = openStream()

    const result = store.deleteStep(stepNamed(store, 'Intake').id)

    expect(result).toEqual(refused)
    expect(stepNames(store)).toContain('Intake')
    expect(persist).not.toHaveBeenCalled()
  })

  it('removes the step and its rework paths, and reports how many', () => {
    const { store, persist } = openStream()

    const result = store.deleteStep(stepNamed(store, 'Code review').id)

    expect(result).toEqual({ ok: true, removedPaths: 1 })
    expect(stepNames(store)).not.toContain('Code review')
    expect(store.activeVersion.reworkPaths).toEqual([])
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('reports 0 when the step has no paths', () => {
    const { store } = openStream()

    expect(store.deleteStep(stepNamed(store, 'Deploy').id)).toEqual({
      ok: true,
      removedPaths: 0,
    })
  })

  it('removes paths that point at the deleted step and leaves the other shares', () => {
    const { store } = openStream()
    const codeReview = stepNamed(store, 'Code review').id
    const development = stepNamed(store, 'Development').id
    const intake = stepNamed(store, 'Intake').id
    store.deleteReworkPath(store.activeVersion.reworkPaths[0].id)
    store.addReworkPath({
      fromStepId: codeReview,
      toStepId: development,
      shareOfRejects: 75,
    })
    store.addReworkPath({
      fromStepId: codeReview,
      toStepId: intake,
      shareOfRejects: 25,
    })

    const result = store.deleteStep(development)

    expect(result).toEqual({ ok: true, removedPaths: 1 })
    expect(
      pathsFrom(store, 'Code review').map((p) => p.shareOfRejects)
    ).toEqual([25])
    expect(
      validateReworkShares(
        store.activeVersion.steps,
        store.activeVersion.reworkPaths
      ).errors
    ).toEqual({ [codeReview]: expect.stringMatching(/\S/) })
  })

  it('refuses an unknown step', () => {
    const { store } = openStream()

    expect(store.deleteStep('nope')).toEqual(refused)
  })
})

describe('valueStreamStore: rework paths', () => {
  it('refuses a path that points forward', () => {
    const { store, persist } = openStream()

    const result = store.addReworkPath({
      fromStepId: stepNamed(store, 'Development').id,
      toStepId: stepNamed(store, 'Deploy').id,
    })

    expect(result).toEqual(refused)
    expect(persist).not.toHaveBeenCalled()
  })

  it('adds a path to an earlier step, and persists once', () => {
    const { store, persist } = openStream()
    store.updateStep(stepNamed(store, 'Deploy').id, { pctCA: 90 })
    persist.mockClear()

    const result = store.addReworkPath({
      fromStepId: stepNamed(store, 'Deploy').id,
      toStepId: stepNamed(store, 'Code review').id,
      shareOfRejects: 100,
    })

    expect(result.ok).toBe(true)
    expect(pathsFrom(store, 'Deploy')).toHaveLength(1)
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('allows a path back to the same step', () => {
    const { store } = openStream()
    const id = stepNamed(store, 'Code review').id

    expect(store.addReworkPath({ fromStepId: id, toStepId: id }).ok).toBe(true)
  })

  it('refuses a path from a step at 100% %C/A', () => {
    const { store, persist } = openStream()

    const result = store.addReworkPath({
      fromStepId: stepNamed(store, 'Deploy').id,
      toStepId: stepNamed(store, 'Intake').id,
    })

    expect(result).toEqual(refused)
    expect(persist).not.toHaveBeenCalled()
  })

  it('refuses a share outside 1 to 100 and keeps the old one on update', () => {
    const { store, persist } = openStream()
    const path = store.activeVersion.reworkPaths[0]

    const result = store.updateReworkPath(path.id, { shareOfRejects: 0 })

    expect(result).toEqual(refused)
    expect(store.activeVersion.reworkPaths[0].shareOfRejects).toBe(100)
    expect(persist).not.toHaveBeenCalled()
  })

  it('updates a path and refuses to retarget it forward', () => {
    const { store, persist } = openStream()
    const path = store.activeVersion.reworkPaths[0]

    expect(store.updateReworkPath(path.id, { shareOfRejects: 60 }).ok).toBe(
      true
    )
    expect(store.activeVersion.reworkPaths[0].shareOfRejects).toBe(60)
    expect(persist).toHaveBeenCalledTimes(1)

    const forward = store.updateReworkPath(path.id, {
      toStepId: stepNamed(store, 'Deploy').id,
    })
    expect(forward).toEqual(refused)
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('never lets a patch change the path id, and refuses an unknown path', () => {
    const { store } = openStream()
    const { id } = store.activeVersion.reworkPaths[0]

    store.updateReworkPath(id, { id: 'other', note: 'x' })

    expect(store.activeVersion.reworkPaths[0].id).toBe(id)
    expect(store.updateReworkPath('nope', { note: 'y' })).toEqual(refused)
  })

  it('deletes a path, and refuses an unknown one', () => {
    const { store, persist } = openStream()
    const { id } = store.activeVersion.reworkPaths[0]

    expect(store.deleteReworkPath(id)).toEqual({ ok: true })
    expect(store.activeVersion.reworkPaths).toEqual([])
    expect(persist).toHaveBeenCalledTimes(1)
    expect(store.deleteReworkPath(id)).toEqual(refused)
    expect(persist).toHaveBeenCalledTimes(1)
  })
})

describe('valueStreamStore: %C/A to 100', () => {
  it('removes the step paths and reports how many', () => {
    const { store, persist } = openStream()

    const result = store.setPctCA(stepNamed(store, 'Code review').id, 100)

    expect(result).toEqual({ ok: true, removedPaths: 1 })
    expect(stepNamed(store, 'Code review').pctCA).toBe(100)
    expect(pathsFrom(store, 'Code review')).toEqual([])
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('keeps the paths of other steps', () => {
    const { store } = openStream()
    store.updateStep(stepNamed(store, 'Deploy').id, { pctCA: 90 })
    store.addReworkPath({
      fromStepId: stepNamed(store, 'Deploy').id,
      toStepId: stepNamed(store, 'Intake').id,
    })

    store.setPctCA(stepNamed(store, 'Code review').id, 100)

    expect(pathsFrom(store, 'Deploy')).toHaveLength(1)
  })

  it('sets a value below 100 and keeps the paths', () => {
    const { store } = openStream()

    const result = store.setPctCA(stepNamed(store, 'Code review').id, 60)

    expect(result).toEqual({ ok: true, removedPaths: 0 })
    expect(stepNamed(store, 'Code review').pctCA).toBe(60)
    expect(pathsFrom(store, 'Code review')).toHaveLength(1)
  })

  it('refuses a value outside 0 to 100', () => {
    const { store, persist } = openStream()

    const result = store.setPctCA(stepNamed(store, 'Code review').id, 101)

    expect(result).toEqual(refused)
    expect(stepNamed(store, 'Code review').pctCA).toBe(80)
    expect(persist).not.toHaveBeenCalled()
  })

  it('refuses an unknown step', () => {
    const { store } = openStream()

    expect(store.setPctCA('nope', 50).ok).toBe(false)
  })
})

describe('valueStreamStore: switch a step kind', () => {
  it('clears process and wait time when switching to outside', () => {
    const { store, persist } = openStream()

    const result = store.switchStepKind(
      stepNamed(store, 'Code review').id,
      'outside'
    )

    const step = stepNamed(store, 'Code review')
    expect(result.ok).toBe(true)
    expect(step.kind).toBe('outside')
    expect(step.processTime).toBeUndefined()
    expect(step.waitTime).toBeUndefined()
    expect(step.elapsedTime).toEqual({ typ: null })
    expect(step.isHandoff).toBe(true)
    expect(step.pctCA).toBe(80)
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('clears elapsed time when switching back to team', () => {
    const { store } = openStream()
    const id = stepNamed(store, 'Code review').id
    store.switchStepKind(id, 'outside')

    store.switchStepKind(id, 'team')

    const step = stepNamed(store, 'Code review')
    expect(step.kind).toBe('team')
    expect(step.elapsedTime).toBeUndefined()
    expect(step.processTime).toEqual({ typ: null })
    expect(step.waitTime).toEqual({ typ: null })
  })

  it('a team step that is not a handoff is still not one after a round trip through outside', () => {
    const { store } = openStream()
    const id = stepNamed(store, 'Code review').id
    expect(stepNamed(store, 'Code review').isHandoff).toBe(false)

    store.switchStepKind(id, 'outside')
    expect(stepNamed(store, 'Code review').isHandoff).toBe(true)
    store.switchStepKind(id, 'team')

    expect(stepNamed(store, 'Code review').isHandoff).toBe(false)
  })

  it('a team step the user marked as a handoff stays one after a round trip through outside', () => {
    const { store } = openStream()
    const id = stepNamed(store, 'Code review').id
    store.updateStep(id, { isHandoff: true })

    store.switchStepKind(id, 'outside')
    store.switchStepKind(id, 'team')

    expect(stepNamed(store, 'Code review').isHandoff).toBe(true)
  })

  it('a step that was outside from the start is not a handoff when it becomes a team step', () => {
    const { store } = openStream()
    store.addStep({ name: 'Vendor', kind: 'outside' })

    store.switchStepKind(stepNamed(store, 'Vendor').id, 'team')

    expect(stepNamed(store, 'Vendor').isHandoff).toBe(false)
  })

  it('refuses to switch Intake', () => {
    const { store, persist } = openStream()

    const result = store.switchStepKind(
      stepNamed(store, 'Intake').id,
      'outside'
    )

    expect(result.ok).toBe(false)
    expect(stepNamed(store, 'Intake').kind).toBe('team')
    expect(persist).not.toHaveBeenCalled()
  })

  it('refuses an unknown kind, the same kind and an unknown step', () => {
    const { store, persist } = openStream()
    const id = stepNamed(store, 'Deploy').id

    expect(store.switchStepKind(id, 'cloud').ok).toBe(false)
    expect(store.switchStepKind(id, 'team')).toEqual(refused)
    expect(store.switchStepKind('nope', 'outside').ok).toBe(false)
    expect(stepNamed(store, 'Deploy').processTime.typ).toBe(30)
    expect(persist).not.toHaveBeenCalled()
  })
})

const currentVersion = (store) =>
  store.stream.versions.find((version) => version.kind === 'current')

const futureLabels = (store) =>
  store.stream.versions
    .filter((version) => version.kind === 'future')
    .map((version) => version.label)

describe('valueStreamStore: future versions', () => {
  it('creates a labelled copy of the current state and makes it active', () => {
    const { store, persist } = openStream()
    const { totals, flowEfficiency, adjustedLeadTime } = store.metrics

    const result = store.createFutureVersion('90-day target')

    const future = store.activeVersion
    const current = currentVersion(store)
    expect(result).toEqual({ ok: true, versionId: future.id })
    expect(future).toMatchObject({
      kind: 'future',
      label: '90-day target',
      basedOnVersionId: current.id,
    })
    expect(future.steps.map((s) => s.name)).toEqual(
      current.steps.map((s) => s.name)
    )
    expect(store.metrics).toMatchObject({
      totals,
      flowEfficiency,
      adjustedLeadTime,
    })
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('gives the copy its own ids and remembers each step origin', () => {
    const { store } = openStream()

    store.createFutureVersion('90-day target')

    const current = currentVersion(store)
    const future = store.activeVersion
    future.steps.forEach((step, i) => {
      expect(step.id).not.toBe(current.steps[i].id)
      expect(step.originStepId).toBe(current.steps[i].id)
    })
    const [path] = future.reworkPaths
    expect(path.id).not.toBe(current.reworkPaths[0].id)
    expect(path.fromStepId).toBe(
      future.steps.find((s) => s.name === 'Code review').id
    )
    expect(path.toStepId).toBe(future.steps[0].id)
  })

  it('edits the active version and leaves the current state alone', () => {
    const { store } = openStream()
    store.createFutureVersion('90-day target')

    store.updateStep(stepNamed(store, 'Deploy').id, { waitTime: { typ: 60 } })

    const currentDeploy = currentVersion(store).steps.find(
      (s) => s.name === 'Deploy'
    )
    expect(currentDeploy.waitTime.typ).toBe(1440)
    expect(stepNamed(store, 'Deploy').waitTime.typ).toBe(60)
  })

  it.each([[''], ['   '], ['90-DAY target'], ['Current state']])(
    'refuses the label %j',
    (label) => {
      const { store, persist } = openStream()
      store.createFutureVersion('90-day target')
      persist.mockClear()

      const result = store.createFutureVersion(label)

      expect(result).toEqual(refused)
      expect(futureLabels(store)).toEqual(['90-day target'])
      expect(persist).not.toHaveBeenCalled()
    }
  )

  it('trims the label', () => {
    const { store } = openStream()

    store.createFutureVersion('  Target  ')

    expect(store.activeVersion.label).toBe('Target')
  })

  it('switches the active version, and refuses an unknown one', () => {
    const { store, persist } = openStream()
    store.createFutureVersion('90-day target')
    persist.mockClear()

    expect(store.setActiveVersion(currentVersion(store).id)).toEqual({
      ok: true,
    })
    expect(store.activeVersion.kind).toBe('current')
    expect(persist).toHaveBeenCalledTimes(1)
    expect(persist).toHaveBeenCalledWith(store.stream, { navigation: true })
    expect(store.setActiveVersion('nope')).toEqual(refused)
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('deletes a future state; deleting the active one returns to the current state', () => {
    const { store, persist } = openStream()
    store.createFutureVersion('90-day target')
    store.createFutureVersion('End state')
    persist.mockClear()

    const result = store.deleteVersion(store.activeVersion.id)

    expect(result).toEqual({ ok: true })
    expect(futureLabels(store)).toEqual(['90-day target'])
    expect(store.activeVersion.kind).toBe('current')
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('keeps the active version when another one is deleted', () => {
    const { store } = openStream()
    const first = store.createFutureVersion('90-day target').versionId
    store.createFutureVersion('End state')

    store.deleteVersion(first)

    expect(store.activeVersion.label).toBe('End state')
  })

  it('refuses to delete the current state or an unknown version', () => {
    const { store, persist } = openStream()

    expect(store.deleteVersion(currentVersion(store).id)).toEqual(refused)
    expect(store.deleteVersion('nope')).toEqual(refused)
    expect(store.stream.versions).toHaveLength(1)
    expect(persist).not.toHaveBeenCalled()
  })
})

describe('valueStreamStore: focus items', () => {
  it('sets up to two focus items on the active version', () => {
    const { store, persist } = openStream()

    const result = store.setFocusItems(['wait:a', 'path:b'])

    expect(result).toEqual({ ok: true })
    expect(store.activeVersion.focusItems).toEqual(['wait:a', 'path:b'])
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('refuses a third and keeps the old list', () => {
    const { store, persist } = openStream()
    store.setFocusItems(['wait:a', 'path:b'])
    persist.mockClear()

    const result = store.setFocusItems(['wait:a', 'path:b', 'wait:c'])

    expect(result).toEqual(refused)
    expect(store.activeVersion.focusItems).toEqual(['wait:a', 'path:b'])
    expect(persist).not.toHaveBeenCalled()
  })

  it('refuses a list that is not a list', () => {
    const { store, persist } = openStream()

    expect(store.setFocusItems('wait:a').ok).toBe(false)
    expect(persist).not.toHaveBeenCalled()
  })
})

describe('valueStreamStore: session stage', () => {
  it('moves to the next stage and flags the call as navigation', () => {
    const { store, persist } = openStream(referenceStream())

    const result = store.goToStage(2)

    expect(result).toEqual({ ok: true })
    expect(store.stream.session).toEqual({ activeStage: 2, furthestStage: 2 })
    expect(persist).toHaveBeenCalledTimes(1)
    expect(persist).toHaveBeenCalledWith(store.stream, { navigation: true })
  })

  it('returns to a reached stage without losing how far it got', () => {
    const { store } = openStream(referenceStream())
    store.goToStage(2)
    store.goToStage(3)

    store.goToStage(1)

    expect(store.stream.session).toEqual({ activeStage: 1, furthestStage: 3 })
  })

  it.each([[3], [0], [8], [1.5]])('refuses stage %s from stage 1', (stage) => {
    const { store, persist } = openStream(referenceStream())

    expect(store.goToStage(stage)).toEqual(refused)
    expect(store.stream.session).toEqual({ activeStage: 1, furthestStage: 1 })
    expect(persist).not.toHaveBeenCalled()
  })

  it('does not flag edits as navigation', () => {
    const { store, persist } = openStream()

    store.updateStep(stepNamed(store, 'Deploy').id, { name: 'Release' })

    expect(persist.mock.calls[0][1]?.navigation).toBeUndefined()
  })
})

describe('valueStreamStore: drag a step', () => {
  it('moves the step on the canvas and persists it flagged as position only', () => {
    const { store, persist } = openStream()
    const { id } = stepNamed(store, 'Development')

    const result = store.updateStepPosition(id, { x: 400, y: 120 })

    expect(result).toEqual({ ok: true })
    expect(stepNamed(store, 'Development').position).toEqual({ x: 400, y: 120 })
    expect(stepNames(store)).toEqual([
      'Intake',
      'Refinement',
      'Development',
      'Code review',
      'Deploy',
    ])
    expect(persist).toHaveBeenCalledTimes(1)
    expect(persist.mock.calls[0][1]).toEqual({ positionOnly: true })
  })

  it('leaves nothing to undo', () => {
    const { store } = openStream()

    store.updateStepPosition(stepNamed(store, 'Deploy').id, { x: 1, y: 2 })

    expect(store.canUndo).toBe(false)
  })

  it('keeps the redo history of an earlier undo', () => {
    const { store } = openStream()
    store.updateStep(stepNamed(store, 'Deploy').id, { name: 'Release' })
    store.undo()

    store.updateStepPosition(stepNamed(store, 'Deploy').id, { x: 1, y: 2 })

    expect(store.canRedo).toBe(true)
  })

  it('refuses an unknown step and does not persist', () => {
    const { store, persist } = openStream()

    expect(store.updateStepPosition('nope', { x: 1, y: 2 })).toEqual(refused)
    expect(persist).not.toHaveBeenCalled()
  })
})
