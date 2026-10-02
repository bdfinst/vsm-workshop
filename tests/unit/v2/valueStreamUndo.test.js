import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import { openStream, refused, stepNamed, stepNames } from './fixtures.js'

describe('valueStreamStore: undo and redo', () => {
  it('starts with nothing to undo or redo', () => {
    const { store } = openStream()

    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(false)
    expect(store.undo()).toEqual(refused)
    expect(store.redo()).toEqual(refused)
  })

  // Which version is being viewed is navigation, not part of what undo restores.
  const wholeStream = (store) => {
    const { activeVersionId: _viewed, ...rest } = JSON.parse(
      JSON.stringify(store.stream)
    )
    return rest
  }
  const withFuture = (store) => store.createFutureVersion('Target')

  it.each([
    [
      'addReworkPath',
      () => {},
      (store) =>
        store.addReworkPath({
          fromStepId: stepNamed(store, 'Code review').id,
          toStepId: stepNamed(store, 'Development').id,
          shareOfRejects: 50,
        }),
    ],
    [
      'setPctCA',
      () => {},
      (store) => store.setPctCA(stepNamed(store, 'Deploy').id, 90),
    ],
    [
      'switchStepKind',
      () => {},
      (store) => store.switchStepKind(stepNamed(store, 'Deploy').id, 'outside'),
    ],
    [
      'moveStep',
      () => {},
      (store) => store.moveStep(stepNamed(store, 'Deploy').id, 1),
    ],
    [
      'deleteVersion',
      withFuture,
      (store) => store.deleteVersion(store.stream.activeVersionId),
    ],
  ])('each accepted edit is undoable: %s', (_name, setup, edit) => {
    const { store } = openStream()
    setup(store)
    const before = wholeStream(store)

    expect(edit(store)).toMatchObject({ ok: true })
    expect(wholeStream(store)).not.toEqual(before)

    expect(store.undo()).toMatchObject({ ok: true })
    expect(wholeStream(store)).toEqual(before)
  })

  it('Undo and redo restore the whole map', () => {
    const { store } = openStream()
    store.deleteStep(stepNamed(store, 'Code review').id)
    expect(stepNames(store)).not.toContain('Code review')

    expect(store.undo()).toMatchObject({ ok: true })
    flushSync()

    expect(stepNames(store)).toContain('Code review')
    expect(store.activeVersion.reworkPaths).toHaveLength(1)
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(true)

    expect(store.redo()).toMatchObject({ ok: true })

    expect(stepNames(store)).not.toContain('Code review')
    expect(store.activeVersion.reworkPaths).toHaveLength(0)
    expect(store.canRedo).toBe(false)
  })

  it('Undo covers future states', () => {
    const { store } = openStream()
    store.createFutureVersion('90-day target')
    expect(store.stream.versions).toHaveLength(2)

    store.undo()

    expect(store.stream.versions).toHaveLength(1)
    expect(store.stream.activeVersionId).toBe(store.stream.versions[0].id)
  })

  it('persists the restored map once per undo and per redo', () => {
    const { store, persist } = openStream()
    store.deleteStep(stepNamed(store, 'Deploy').id)
    persist.mockClear()

    store.undo()
    expect(persist).toHaveBeenCalledTimes(1)
    expect(
      persist.mock.calls[0][0].versions[0].steps.map((s) => s.name)
    ).toContain('Deploy')

    store.redo()
    expect(persist).toHaveBeenCalledTimes(2)
  })

  it('does not persist when there is nothing to undo', () => {
    const { store, persist } = openStream()

    store.undo()

    expect(persist).not.toHaveBeenCalled()
  })

  it('A new edit after an undo clears redo', () => {
    const { store } = openStream()
    store.updateStep(stepNamed(store, 'Deploy').id, { name: 'Release' })
    store.undo()
    expect(store.canRedo).toBe(true)

    store.updateStep(stepNamed(store, 'Deploy').id, { name: 'Ship' })

    expect(store.canRedo).toBe(false)
  })

  it('does not record a refused edit', () => {
    const { store } = openStream()

    const result = store.deleteStep(stepNamed(store, 'Intake').id)

    expect(result.ok).toBe(false)
    expect(store.canUndo).toBe(false)
  })

  it('does not record stage navigation', () => {
    const { store } = openStream()

    store.goToStage(2)

    expect(store.canUndo).toBe(false)
  })

  it('one accepted edit is one undo step', () => {
    const { store } = openStream()
    const deploy = stepNamed(store, 'Deploy')

    store.updateStep(deploy.id, { name: 'Release' })

    expect(stepNamed(store, 'Release')).toBeDefined()
    store.undo()

    expect(stepNamed(store, 'Deploy')).toBeDefined()
    expect(store.canUndo).toBe(false)
  })
})

describe('valueStreamStore: undo and the version being viewed', () => {
  const currentId = (store) =>
    store.stream.versions.find((v) => v.kind === 'current').id

  const editedFuture = () => {
    const { store, persist } = openStream()
    const { versionId } = store.createFutureVersion('90-day target')
    store.updateStep(stepNamed(store, 'Deploy').id, { name: 'Release' })
    return { store, persist, futureId: versionId }
  }

  it('switching version is not an undo step', () => {
    const { store } = openStream()
    store.createFutureVersion('90-day target')
    store.undo()
    expect(store.canUndo).toBe(false)

    store.createFutureVersion('End state')
    store.setActiveVersion(currentId(store))
    store.undo()

    expect(store.stream.versions).toHaveLength(1)
    expect(store.canUndo).toBe(false)
  })

  it('switching version does not clear redo', () => {
    const { store } = openStream()
    const first = store.createFutureVersion('90-day target').versionId
    store.createFutureVersion('End state')
    store.undo()
    expect(store.canRedo).toBe(true)

    store.setActiveVersion(first)

    expect(store.canRedo).toBe(true)
  })

  it('switching version is saved as navigation, not as an edit', () => {
    const { store, persist } = openStream()
    store.createFutureVersion('90-day target')
    persist.mockClear()

    store.setActiveVersion(currentId(store))

    expect(persist).toHaveBeenCalledTimes(1)
    expect(persist.mock.calls[0][1]).toEqual({ navigation: true })
  })

  it('undo leaves the viewed version where it is', () => {
    const { store } = editedFuture()
    store.setActiveVersion(currentId(store))

    store.undo()

    expect(store.activeVersion.kind).toBe('current')
    const future = store.stream.versions.find((v) => v.kind === 'future')
    expect(future.steps.map((s) => s.name)).toContain('Deploy')
    expect(future.steps.map((s) => s.name)).not.toContain('Release')
  })

  it('redo leaves the viewed version where it is', () => {
    const { store, futureId } = editedFuture()
    store.undo()
    store.setActiveVersion(currentId(store))

    store.redo()

    expect(store.activeVersion.kind).toBe('current')
    const future = store.stream.versions.find((v) => v.id === futureId)
    expect(future.steps.map((s) => s.name)).toContain('Release')
  })

  it('falls back to the current state when undo removes the version being viewed', () => {
    const { store } = openStream()
    store.createFutureVersion('90-day target')
    expect(store.activeVersion.kind).toBe('future')

    store.undo()

    expect(store.stream.versions).toHaveLength(1)
    expect(store.stream.activeVersionId).toBe(currentId(store))
  })

  it('names the version when undo or redo changes one that is not being viewed', () => {
    const { store } = editedFuture()
    store.setActiveVersion(currentId(store))

    const undo = store.undo().announcement
    const redo = store.redo().announcement

    expect(undo).toBe('Undo: change in 90-day target')
    expect(redo).toBe('Redo: change in 90-day target')
  })

  it('names the version and the stage when both differ', () => {
    const { store } = editedFuture()
    store.setActiveVersion(currentId(store))
    store.goToStage(2)

    expect(store.undo().announcement).toBe(
      'Undo: change in 90-day target on the Scope stage'
    )
  })

  it('does not name a version when the change was in the one being viewed', () => {
    const { store } = editedFuture()

    expect(store.undo().announcement).toBe('Undo')
  })

  it('does not name a version for a change to the whole map, such as its name', () => {
    const { store } = openStream()
    store.createFutureVersion('90-day target')
    store.setName('Checkout v2')
    store.setActiveVersion(currentId(store))

    expect(store.undo().announcement).toBe('Undo: map name')
  })
})

describe('valueStreamStore: undo and the session stage', () => {
  const editOnSteps = () => {
    const { store, persist } = openStream()
    store.goToStage(2)
    store.updateStep(stepNamed(store, 'Deploy').id, { name: 'Release' })
    return { store, persist }
  }

  it('restores data but leaves the current stage alone', () => {
    const { store } = editOnSteps()
    store.goToStage(3)

    store.undo()

    expect(stepNamed(store, 'Deploy')).toBeDefined()
    expect(store.stream.session).toEqual({ activeStage: 3, furthestStage: 3 })
  })

  it('undo keeps the furthest stage reached after the edit', () => {
    const { store } = editOnSteps()
    store.goToStage(3)
    store.goToStage(4)
    store.goToStage(2)

    store.undo()

    expect(store.stream.session).toEqual({ activeStage: 2, furthestStage: 4 })
  })

  const announced = (store) => ({
    undo: store.undo().announcement,
    redo: store.redo().announcement,
  })

  it('announces undo and redo differently, whatever stage the edit was on', () => {
    const { store } = editOnSteps()

    const { undo, redo } = announced(store)

    expect(undo).toMatch(/\S/)
    expect(redo).toMatch(/\S/)
    expect(undo).not.toBe(redo)
  })

  it('names the stage of the edit when it was on another stage', () => {
    const { store } = editOnSteps()
    store.goToStage(3)

    expect(announced(store)).toEqual({
      undo: 'Undo: change on the Steps stage',
      redo: 'Redo: change on the Steps stage',
    })
  })

  it('does not name a stage when the edit was on this one', () => {
    const { store } = editOnSteps()

    expect(announced(store)).toEqual({ undo: 'Undo', redo: 'Redo' })
  })
})
