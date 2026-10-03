import { expect, vi } from 'vitest'
import { createReworkPath } from '../../../src/models/v2/reworkPath.js'
import { createMapVersion } from '../../../src/models/v2/mapVersion.js'
import { createValueStream } from '../../../src/models/v2/valueStream.js'
import { createValueStreamStore } from '../../../src/stores/v2/valueStreamStore.svelte.js'
import { createWorkspaceStore } from '../../../src/stores/v2/workspaceStore.svelte.js'
import { createMemoryWorkspaceRepository } from '../../../src/persistence/v2/memoryWorkspaceRepository.js'
import { serializeWorkspace } from '../../../src/persistence/v2/workspaceCodec.js'
import { referenceSteps, withStep } from './stepFixtures.js'

/**
 * Shared fixtures for the v2 tests. "The reference map" and its variants are
 * pure helpers: they return new data and never change their arguments. The
 * store builders (`makeStore`, `openStream`) make a fresh store on every call
 * and the step readers look inside one, so tests share them without leaking
 * state. Times are in minutes.
 */

export const REFERENCE_WORKDAY_HOURS = 8

/**
 * What a refused edit looks like: not ok, with some non-empty explanation. Tests
 * assert that an edit was refused and what it left behind, not the wording.
 */
export const refused = { ok: false, error: expect.stringMatching(/\S/) }

/** What a load that could not read the saved data reports: some non-empty reason. */
export const anyReason = { reason: expect.stringMatching(/\S/) }

export {
  insertAfter,
  outsideStep,
  referenceSteps,
  reworkSteps,
  team,
  withoutWait,
  withStep,
  withWait,
} from './stepFixtures.js'

/** A rework path between two steps of `steps`, named; takes 100% of rejects unless given. */
export const pathBetween = (steps, from, to, extra = {}) =>
  createReworkPath({
    fromStepId: steps.find((step) => step.name === from).id,
    toStepId: steps.find((step) => step.name === to).id,
    shareOfRejects: 100,
    ...extra,
  })

/** A map version over `steps`, with `reworkPaths`. */
export const versionOf = (steps, reworkPaths = []) =>
  createMapVersion({ steps, reworkPaths })

/** "The reference map": the reference steps, no rework. */
export const referenceVersion = () => versionOf(referenceSteps())

/** "The reference rework map": Code review at %C/A 80, one path to Intake at share 100. */
export const referenceReworkVersion = () => {
  const steps = withStep(referenceSteps(), 'Code review', { pctCA: 80 })
  return versionOf(steps, [pathBetween(steps, 'Code review', 'Intake')])
}

/** A value stream holding `version` as its active version. */
export const streamOf = (version, overrides = {}) =>
  createValueStream({
    name: 'Checkout delivery',
    workdayHours: REFERENCE_WORKDAY_HOURS,
    versions: [version],
    ...overrides,
  })

export const referenceStream = (overrides) =>
  streamOf(referenceVersion(), overrides)

export const referenceReworkStream = (overrides) =>
  streamOf(referenceReworkVersion(), overrides)

/** A workspace file's content over `streams`; the first is active unless given. */
export const workspaceOf = (streams, overrides = {}) => ({
  format: 'vsm-workspace',
  schemaVersion: 1,
  id: 'workspace-1',
  streams,
  activeStreamId: streams[0]?.id ?? null,
  revision: 3,
  savedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

/** The stream with a future state added to its versions, based on its current state. */
export const withFutureState = (stream) => {
  const [current] = stream.versions
  const future = createMapVersion({
    kind: 'future',
    label: 'Fewer handoffs',
    basedOnVersionId: current.id,
    steps: current.steps,
  })
  return { ...stream, versions: [current, future] }
}

/** The stream with a rework path from Intake forward to Deploy (an invalid path). */
export const withForwardRework = (stream) => {
  const [version] = stream.versions
  const forward = pathBetween(version.steps, 'Intake', 'Deploy')
  return { ...stream, versions: [{ ...version, reworkPaths: [forward] }] }
}

/** A v1 repository that holds nothing, so a store never reads the test's localStorage. */
export const noV1Repository = { load: () => null }

/**
 * A fresh workspace store over the memory repository, already initialised, so
 * no state leaks between tests. `streams` (when given) are saved in the
 * repository first, the first one active; `repository` and `v1Repository`
 * override the defaults.
 * @param {Object} [options]
 * @param {Object[]} [options.streams] - Value streams the workspace starts with
 * @param {Object} [options.repository] - A repository to use instead of a new memory one
 * @param {Object} [options.v1Repository] - A v1 repository to use instead of an empty one
 * @returns {Promise<Object>} The store, once `init()` has finished
 */
export const makeStore = async ({
  streams,
  repository = createMemoryWorkspaceRepository({
    raw: streams ? serializeWorkspace(workspaceOf(streams)) : null,
  }),
  v1Repository = noV1Repository,
} = {}) => {
  const store = createWorkspaceStore({ repository, v1Repository })
  await store.init()
  return store
}

/**
 * A value stream store over `stream` with a recording `persist`.
 * @param {Object} [stream] - The stream to edit, the reference rework stream by default
 * @returns {{store: Object, persist: Function}}
 */
export const openStream = (stream = referenceReworkStream()) => {
  const persist = vi.fn()
  const store = createValueStreamStore({ stream, persist })
  return { store, persist }
}

/** The active version's step called `name` in a value stream store. */
export const stepNamed = (store, name) =>
  store.activeVersion.steps.find((step) => step.name === name)

/** The active version's step names, in order, in a value stream store. */
export const stepNames = (store) =>
  store.activeVersion.steps.map((step) => step.name)

/** The active version's rework paths that start at the step called `name`. */
export const pathsFrom = (store, name) => {
  const id = stepNamed(store, name).id
  return store.activeVersion.reworkPaths.filter((p) => p.fromStepId === id)
}
