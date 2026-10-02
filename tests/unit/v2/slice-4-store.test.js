import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import { validateReworkShares } from '../../../src/utils/validation/v2/reworkPathValidator.js'
import {
  makeStore,
  pathsFrom,
  referenceReworkStream,
  refused,
  stepNamed,
  stepNames,
  streamOf,
  team,
  versionOf,
} from './fixtures.js'

/**
 * Slice 4 scenarios "Editing rules and undo", run through the workspace store
 * so they cover the open value stream store as the app wires it. Background:
 * the reference rework map.
 */

const BACKGROUND_NAME = 'Checkout delivery'

const open = async (extraStreams = []) => {
  const stream = referenceReworkStream()
  const store = await makeStore({ streams: [stream, ...extraStreams] })
  return { store, stream }
}

const onboarding = () =>
  streamOf(versionOf([team('Intake', 30, 60), team('Setup', 60, 120)]), {
    name: 'Onboarding',
  })

const activeNames = (store) => stepNames(store.activeStore)

const streamNamed = (store, name) =>
  store.streams.find((stream) => stream.name === name)

describe('Editing rules and undo', () => {
  it('Store refuses changes that point a path forward', async () => {
    const { store } = await open()
    const edits = store.activeStore

    expect(
      edits.addReworkPath({
        fromStepId: stepNamed(store.activeStore, 'Development').id,
        toStepId: stepNamed(store.activeStore, 'Deploy').id,
      })
    ).toEqual(refused)

    expect(
      edits.moveStep(stepNamed(store.activeStore, 'Code review').id, 0)
    ).toMatchObject({ ok: false })

    expect(
      edits.moveStep(stepNamed(store.activeStore, 'Intake').id, 2)
    ).toEqual(refused)
  })

  it('Reorder that would make an existing path point forward is refused', async () => {
    const { store } = await open()
    const codeReview = stepNamed(store.activeStore, 'Code review').id
    store.activeStore.addReworkPath({
      fromStepId: codeReview,
      toStepId: stepNamed(store.activeStore, 'Development').id,
      shareOfRejects: 100,
    })
    const before = activeNames(store)

    const result = store.activeStore.moveStep(codeReview, 2)

    expect(result).toEqual(refused)
    expect(activeNames(store)).toEqual(before)
  })

  it('Deleting a step removes its paths and reports them', async () => {
    const { store } = await open()

    expect(
      store.activeStore.deleteStep(stepNamed(store.activeStore, 'Intake').id)
    ).toEqual(refused)

    const result = store.activeStore.deleteStep(
      stepNamed(store.activeStore, 'Code review').id
    )

    expect(result).toEqual({ ok: true, removedPaths: 1 })
    expect(activeNames(store)).not.toContain('Code review')
    expect(store.activeStore.activeVersion.reworkPaths).toHaveLength(0)
  })

  it("Deleting a path's target leaves other shares flagged", async () => {
    const { store } = await open()
    const edits = store.activeStore
    const codeReview = stepNamed(store.activeStore, 'Code review').id
    edits.deleteReworkPath(edits.activeVersion.reworkPaths[0].id)
    edits.addReworkPath({
      fromStepId: codeReview,
      toStepId: stepNamed(store.activeStore, 'Development').id,
      shareOfRejects: 75,
    })
    edits.addReworkPath({
      fromStepId: codeReview,
      toStepId: stepNamed(store.activeStore, 'Intake').id,
      shareOfRejects: 25,
    })

    edits.deleteStep(stepNamed(store.activeStore, 'Development').id)

    expect(
      pathsFrom(store.activeStore, 'Code review').map((p) => p.shareOfRejects)
    ).toEqual([25])
    const flags = validateReworkShares(
      edits.activeVersion.steps,
      edits.activeVersion.reworkPaths
    ).errors
    expect(flags).toEqual({ [codeReview]: expect.stringMatching(/\S/) })
  })

  it("Setting %C/A to 100 removes the step's paths", async () => {
    const { store } = await open()

    store.activeStore.setPctCA(
      stepNamed(store.activeStore, 'Code review').id,
      100
    )

    expect(pathsFrom(store.activeStore, 'Code review')).toEqual([])
  })

  it('Undo and redo restore the whole map', async () => {
    const { store } = await open()
    const intake = stepNamed(store.activeStore, 'Intake').id
    store.activeStore.deleteStep(stepNamed(store.activeStore, 'Code review').id)

    store.activeStore.undo()
    flushSync()

    expect(activeNames(store)).toContain('Code review')
    const [path] = store.activeStore.activeVersion.reworkPaths
    expect(path.fromStepId).toBe(stepNamed(store.activeStore, 'Code review').id)
    expect(path.toStepId).toBe(intake)

    store.activeStore.redo()
    flushSync()

    expect(activeNames(store)).not.toContain('Code review')
  })

  it('Undo covers future states', async () => {
    const { store } = await open()
    store.activeStore.createFutureVersion('90-day target')
    expect(store.activeStore.stream.versions).toHaveLength(2)

    store.activeStore.undo()
    flushSync()

    expect(store.activeStore.stream.versions).toHaveLength(1)
  })

  it('Invalid edit is rejected and the value is unchanged', async () => {
    const { store } = await open()
    const revision = store.revision

    const result = store.activeStore.updateStep(
      stepNamed(store.activeStore, 'Development').id,
      { processTime: { typ: -5 } }
    )

    expect(result).toEqual(refused)
    expect(stepNamed(store.activeStore, 'Development').processTime.typ).toBe(
      480
    )
    expect(store.revision).toBe(revision)
  })

  it("Edits to one value stream don't change another", async () => {
    const { store, stream } = await open([onboarding()])
    const second = streamNamed(store, 'Onboarding')

    store.open(second.id)
    store.activeStore.insertStep(stepNamed(store.activeStore, 'Intake').id, {
      name: 'Legal review',
    })

    expect(
      streamNamed(store, 'Onboarding').versions[0].steps.map((s) => s.name)
    ).toEqual(['Intake', 'Legal review', 'Setup'])

    store.open(stream.id)

    expect(activeNames(store)).toEqual([
      'Intake',
      'Refinement',
      'Development',
      'Code review',
      'Deploy',
    ])
    expect(
      streamNamed(store, BACKGROUND_NAME).versions[0].steps.map((s) => s.name)
    ).toEqual(activeNames(store))
  })

  it('Undo history is per value stream', async () => {
    const { store, stream } = await open([onboarding()])
    const second = streamNamed(store, 'Onboarding')
    store.activeStore.deleteStep(stepNamed(store.activeStore, 'Code review').id)

    store.open(second.id)
    store.open(stream.id)

    expect(store.activeStore.canUndo).toBe(false)
    expect(activeNames(store)).not.toContain('Code review')
  })
})
