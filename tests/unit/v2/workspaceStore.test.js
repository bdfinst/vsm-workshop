import { describe, it, expect, vi } from 'vitest'
import { createWorkspaceStore } from '../../../src/stores/v2/workspaceStore.svelte.js'
import { createMemoryWorkspaceRepository } from '../../../src/persistence/v2/memoryWorkspaceRepository.js'
import {
  parseWorkspace,
  serializeWorkspace,
} from '../../../src/persistence/v2/workspaceCodec.js'
import { createWorkspace } from '../../../src/models/v2/workspace.js'
import { createStep as createV1Step } from '../../../src/models/StepFactory.js'
import {
  anyReason,
  makeStore,
  noV1Repository,
  referenceReworkStream,
  referenceStream,
  refused,
  workspaceOf,
} from './fixtures.js'

/** The repository's saved workspace, parsed. */
const savedIn = async (repository) =>
  parseWorkspace(await repository.load()).workspace

/** A repository whose saves wait until the test releases them, in order. */
const heldRepository = (raw = null) => {
  const inner = createMemoryWorkspaceRepository({ raw })
  const releases = []
  const started = []
  return {
    ...inner,
    started,
    save: (workspace) => {
      started.push(workspace.revision)
      return new Promise((resolve) => {
        releases.push(() => resolve(inner.save(workspace)))
      })
    },
    release: () => releases.shift()(),
  }
}

/** A repository whose load answers only when the test releases it, counting loads. */
const heldLoadRepository = (raw = null) => {
  const inner = createMemoryWorkspaceRepository({ raw })
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  let loads = 0
  return {
    ...inner,
    release,
    loads: () => loads,
    // Reads when asked and answers when released, like a slow disk.
    load: async () => {
      loads += 1
      const text = await inner.load()
      await gate
      return text
    },
  }
}

const stepNamesOf = (store) =>
  store.streams[0].versions[0].steps.map((step) => step.name)

const rawOf = (streams, overrides) =>
  serializeWorkspace(workspaceOf(streams, overrides))

describe('workspaceStore: loading', () => {
  it('is loading until init finishes, then ready', async () => {
    const store = createWorkspaceStore({
      repository: createMemoryWorkspaceRepository(),
      v1Repository: noV1Repository,
    })
    expect(store.status).toBe('loading')

    await store.init()

    expect(store.status).toBe('ready')
  })

  it('opens the saved workspace on its active stream', async () => {
    const [first, second] = [referenceStream(), referenceReworkStream()]
    const store = await makeStore({
      repository: createMemoryWorkspaceRepository({
        raw: rawOf([first, second], { activeStreamId: second.id }),
      }),
    })

    expect(store.streams.map((s) => s.id)).toEqual([first.id, second.id])
    expect(store.activeStreamId).toBe(second.id)
    expect(store.activeStore.stream.id).toBe(second.id)
    expect(store.screen).toBe('stream')
  })

  it('shows the home screen when no stream is active', async () => {
    const store = await makeStore()

    expect(store.streams).toEqual([])
    expect(store.activeStreamId).toBeNull()
    expect(store.activeStore).toBeNull()
    expect(store.screen).toBe('home')
  })

  it('is unreadable, with the reason, when the saved data cannot be read', async () => {
    const repository = createMemoryWorkspaceRepository({ raw: '{not json' })
    const store = await makeStore({ repository })

    expect(store.status).toBe('unreadable')
    expect(store.unreadable).toMatchObject(anyReason)
    expect(await repository.loadBackup()).toBe('{not json')
  })

  it('hands back exactly the unreadable text it found', async () => {
    const raw = '{"format": "vsm-workspace", oops'
    const store = await makeStore({
      repository: createMemoryWorkspaceRepository({ raw }),
    })

    expect(store.unreadable.raw).toBe(raw)
  })

  it('is unreadable when the repository cannot be read at all', async () => {
    const repository = {
      ...createMemoryWorkspaceRepository(),
      load: async () => {
        throw new Error('no storage')
      },
    }

    const store = await makeStore({ repository })

    expect(store.status).toBe('unreadable')
    expect(store.unreadable.raw).toBeNull()
  })

  describe('when the repository cannot be read at all', () => {
    // Nothing was backed up and nothing is in hand, but the working copy is intact.
    const flakyRepository = (raw) => {
      const inner = createMemoryWorkspaceRepository({ raw })
      let failing = true
      return {
        ...inner,
        heal: () => {
          failing = false
        },
        load: async () => {
          if (failing) throw new Error('no storage')
          return inner.load()
        },
      }
    }

    it('flags the read failure and that nothing was backed up', async () => {
      const store = await makeStore({
        repository: flakyRepository(rawOf([referenceStream()])),
      })

      expect(store.unreadable).toMatchObject({
        raw: null,
        backupFailed: true,
        readFailed: true,
      })
    })

    it('refuses to replace the intact working copy, and saves nothing', async () => {
      const raw = rawOf([referenceStream({ name: 'Intact' })])
      const repository = flakyRepository(raw)
      const save = vi.spyOn(repository, 'save')
      const store = await makeStore({ repository })

      const result = store.replaceWorkspace(createWorkspace())
      await store.flushSaves()

      expect(result).toEqual(refused)
      expect(store.status).toBe('unreadable')
      expect(save).not.toHaveBeenCalled()
      repository.heal()
      expect(await repository.load()).toBe(raw)
    })

    it('opens the intact working copy when init is retried after the read works', async () => {
      const repository = flakyRepository(
        rawOf([referenceStream({ name: 'Intact' })])
      )
      const store = await makeStore({ repository })
      repository.heal()

      await store.init()

      expect(store.status).toBe('ready')
      expect(store.unreadable).toBeNull()
      expect(store.streams.map((s) => s.name)).toEqual(['Intact'])
    })

    it('lets a workspace be opened once a retry has succeeded', async () => {
      const repository = flakyRepository(null)
      const store = await makeStore({ repository })
      repository.heal()
      await store.init()

      expect(store.replaceWorkspace(createWorkspace()).ok).toBe(true)
    })

    it('does not block a workspace that was read but is corrupt', async () => {
      const store = await makeStore({
        repository: createMemoryWorkspaceRepository({ raw: '{not json' }),
      })

      expect(store.unreadable.readFailed).toBeFalsy()
      expect(store.replaceWorkspace(createWorkspace()).ok).toBe(true)
    })
  })

  it('migrates a v1 map into the first stream when nothing else is saved', async () => {
    const v1Map = {
      id: 'v1',
      name: 'Old map',
      description: '',
      steps: [createV1Step('Intake')],
      connections: [],
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z',
    }

    const store = await makeStore({ v1Repository: { load: () => v1Map } })

    expect(store.streams).toHaveLength(1)
    expect(store.streams[0].name).toBe('Old map')
    expect(store.activeStreamId).toBe(store.streams[0].id)
    expect(store.changes).toEqual([])
  })
})

describe.each([
  [
    'before init',
    (repository) =>
      createWorkspaceStore({ repository, v1Repository: noV1Repository }),
  ],
  ['unreadable', (repository) => makeStore({ repository })],
])('workspaceStore: %s', (_state, build) => {
  it.each([
    ['create', (s) => s.create()],
    ['open', (s) => s.open('x')],
    ['rename', (s) => s.rename('x', 'Name')],
    ['duplicate', (s) => s.duplicate('x')],
    ['remove', (s) => s.remove('x')],
    ['restoreLast', (s) => s.restoreLast()],
    ['importStream', (s) => s.importStream('{}')],
    ['exportStream', (s) => s.exportStream('x')],
    ['goHome', (s) => s.goHome()],
  ])(
    'refuses %s, saves nothing and leaves the saved data alone',
    async (_action, act) => {
      const repository = createMemoryWorkspaceRepository({ raw: '{not json' })
      const save = vi.spyOn(repository, 'save')
      const store = await build(repository)

      expect(act(store)).toEqual(refused)
      await store.flushSaves()

      expect(store.streams).toEqual([])
      expect(save).not.toHaveBeenCalled()
      expect(await repository.load()).toBe('{not json')
    }
  )
})

describe('workspaceStore: concurrent loading', () => {
  it('shares one load between two init calls', async () => {
    const repository = heldLoadRepository(rawOf([referenceStream()]))
    const store = createWorkspaceStore({
      repository,
      v1Repository: noV1Repository,
    })

    const first = store.init()
    const second = store.init()
    repository.release()
    await Promise.all([first, second])

    expect(repository.loads()).toBe(1)
    expect(store.status).toBe('ready')
    expect(store.streams).toHaveLength(1)
  })

  it('keeps a workspace opened while loading instead of the one being loaded', async () => {
    const repository = heldLoadRepository(
      rawOf([referenceStream({ name: 'Saved' })])
    )
    const store = createWorkspaceStore({
      repository,
      v1Repository: noV1Repository,
    })
    const incoming = referenceReworkStream({ name: 'From file' })

    const loading = store.init()
    store.replaceWorkspace(workspaceOf([incoming], { id: 'other' }))
    repository.release()
    await loading
    await store.flushSaves()

    expect(store.status).toBe('ready')
    expect(store.streams.map((s) => s.name)).toEqual(['From file'])
    expect((await savedIn(repository)).streams[0].name).toBe('From file')
  })

  it('leaves the unreadable state when a later init succeeds', async () => {
    let failing = true
    const repository = {
      ...createMemoryWorkspaceRepository(),
      load: async () => {
        if (failing) throw new Error('no storage')
        return null
      },
    }
    const store = await makeStore({ repository })
    expect(store.status).toBe('unreadable')

    failing = false
    await store.init()

    expect(store.status).toBe('ready')
    expect(store.unreadable).toBeNull()
  })
})

describe('workspaceStore: init on a store that is already ready', () => {
  it('does not load again', async () => {
    const repository = createMemoryWorkspaceRepository({
      raw: rawOf([referenceStream()]),
    })
    const store = await makeStore({ repository })
    const load = vi.spyOn(repository, 'load')

    await store.init()

    expect(load).not.toHaveBeenCalled()
    expect(store.status).toBe('ready')
  })

  it('leaves an edit that is already saved alone, and still unsaved to the file', async () => {
    const repository = createMemoryWorkspaceRepository({
      raw: rawOf([referenceStream()]),
    })
    const store = await makeStore({ repository })
    store.activeStore.addStep({ name: 'Extra' })
    await store.flushSaves()
    const load = vi.spyOn(repository, 'load')

    await store.init()

    expect(load).not.toHaveBeenCalled()
    expect(stepNamesOf(store)).toContain('Extra')
    expect(store.revision).toBeGreaterThan(store.savedRevision)
  })

  it('leaves an edit whose save is still pending alone', async () => {
    const repository = heldRepository(rawOf([referenceStream()]))
    const store = await makeStore({ repository })
    const load = vi.spyOn(repository, 'load')
    store.activeStore.addStep({ name: 'Extra' })

    await store.init()

    expect(load).not.toHaveBeenCalled()
    expect(stepNamesOf(store)).toContain('Extra')
    expect(store.activeStore.canUndo).toBe(true)

    repository.release()
    await store.flushSaves()
    expect(
      (await savedIn(repository)).streams[0].versions[0].steps
    ).toHaveLength(6)
  })

  it('keeps the same open stream store, so its undo history survives', async () => {
    const store = await makeStore({ streams: [referenceStream()] })
    store.activeStore.addStep({ name: 'Extra' })
    const open = store.activeStore

    await store.init()

    expect(store.activeStore).toBe(open)
    expect(store.activeStore.canUndo).toBe(true)
  })
})

describe('workspaceStore: the saved baseline', () => {
  it('starts a loaded workspace with nothing unsaved', async () => {
    const store = await makeStore({ streams: [referenceStream()] })

    expect(store.revision).toBe(3)
    expect(store.savedRevision).toBe(3)
  })

  it('starts a migrated workspace with nothing unsaved', async () => {
    const v1Map = {
      id: 'v1',
      name: 'Old map',
      steps: [createV1Step('Intake')],
      connections: [],
    }

    const store = await makeStore({ v1Repository: { load: () => v1Map } })

    expect(store.savedRevision).toBe(store.revision)
  })

  it('starts an empty workspace with nothing unsaved', async () => {
    const store = await makeStore()

    expect(store.savedRevision).toBe(store.revision)
  })

  it('counts the first stream created at launch as saved', async () => {
    const store = await makeStore()
    const commits = vi.fn()
    store.subscribeCommit(commits)

    store.create({ name: 'First' }, { baseline: true })

    expect(store.streams).toHaveLength(1)
    expect(store.revision).toBeGreaterThan(0)
    expect(store.savedRevision).toBe(store.revision)
    expect(commits).not.toHaveBeenCalled()
  })

  it('counts a later created stream as unsaved', async () => {
    const store = await makeStore()

    store.create({ name: 'Later' })

    expect(store.revision).toBeGreaterThan(store.savedRevision)
  })
})

describe('workspaceStore: the single writer', () => {
  it('replaces the stream, bumps the revision and stamps updatedAt on an edit', async () => {
    const stream = { ...referenceStream(), updatedAt: '2020-01-01T00:00:00Z' }
    const store = await makeStore({
      repository: createMemoryWorkspaceRepository({
        raw: rawOf([stream]),
      }),
    })
    const before = store.revision

    store.activeStore.addStep({ name: 'Extra' })

    expect(store.revision).toBe(before + 1)
    expect(store.streams[0].versions[0].steps.at(-1).name).toBe('Extra')
    expect(store.streams[0].updatedAt).not.toBe('2020-01-01T00:00:00Z')
  })

  it('saves the edited workspace to the repository', async () => {
    const repository = createMemoryWorkspaceRepository({
      raw: rawOf([referenceStream()]),
    })
    const store = await makeStore({ repository })

    store.activeStore.addStep({ name: 'Extra' })
    await store.flushSaves()

    const saved = await savedIn(repository)
    expect(saved.revision).toBe(4)
    expect(saved.streams[0].versions[0].steps.at(-1).name).toBe('Extra')
  })

  it('saves a second edit only after the first save finishes', async () => {
    const repository = heldRepository(rawOf([referenceStream()]))
    const store = await makeStore({ repository })

    store.activeStore.addStep({ name: 'One' })
    store.activeStore.addStep({ name: 'Two' })
    await vi.waitFor(() => expect(repository.started).toEqual([4]))
    // A macrotask later the second save still waits for the first.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(repository.started).toEqual([4])

    repository.release()
    await vi.waitFor(() => expect(repository.started).toEqual([4, 5]))
    repository.release()
    await store.flushSaves()

    const saved = await savedIn(repository)
    expect(saved.revision).toBe(5)
    expect(saved.streams[0].versions[0].steps.map((s) => s.name)).toEqual(
      expect.arrayContaining(['One', 'Two'])
    )
  })

  it('keeps saving after a save fails, and reports the failure', async () => {
    const inner = createMemoryWorkspaceRepository({
      raw: rawOf([referenceStream()]),
    })
    let failNext = true
    const repository = {
      ...inner,
      save: async (workspace) => {
        if (failNext) {
          failNext = false
          throw new Error('disk full')
        }
        return inner.save(workspace)
      },
    }
    const store = await makeStore({ repository })

    store.activeStore.addStep({ name: 'One' })
    await store.flushSaves()
    expect(store.saveError.message).toBe('disk full')

    store.activeStore.addStep({ name: 'Two' })
    await store.flushSaves()
    expect(store.saveError).toBeNull()
    expect((await savedIn(inner)).revision).toBe(5)
  })

  it('tells commit listeners after each edit, until they unsubscribe', async () => {
    const store = await makeStore({ streams: [referenceStream()] })
    const listener = vi.fn()
    const unsubscribe = store.subscribeCommit(listener)

    store.activeStore.addStep({ name: 'One' })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(4)

    unsubscribe()
    store.activeStore.addStep({ name: 'Two' })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('keeps telling the other listeners, and finishes the edit, when one listener throws', async () => {
    const store = await makeStore({ streams: [referenceStream()] })
    const later = vi.fn()
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    store.subscribeCommit(() => {
      throw new Error('listener broke')
    })
    store.subscribeCommit(later)

    const result = store.activeStore.addStep({ name: 'One' })
    await store.flushSaves()

    expect(result.ok).toBe(true)
    expect(later).toHaveBeenCalledWith(4)
    expect(logged).toHaveBeenCalledTimes(1)
    expect(store.saveError).toBeNull()
    logged.mockRestore()
  })

  it('saves a step position without a new revision, a commit or a new updatedAt', async () => {
    const stream = { ...referenceStream(), updatedAt: '2020-01-01T00:00:00Z' }
    const repository = createMemoryWorkspaceRepository({ raw: rawOf([stream]) })
    const store = await makeStore({ repository })
    const listener = vi.fn()
    store.subscribeCommit(listener)
    const { id } = store.activeStore.activeVersion.steps[1]

    const result = store.activeStore.updateStepPosition(id, { x: 400, y: 120 })
    await store.flushSaves()

    expect(result).toEqual({ ok: true })
    expect(store.revision).toBe(3)
    expect(listener).not.toHaveBeenCalled()
    const saved = (await savedIn(repository)).streams[0]
    expect(saved.versions[0].steps[1].position).toEqual({ x: 400, y: 120 })
    expect(saved.updatedAt).toBe('2020-01-01T00:00:00Z')
  })

  it('refuses an edit that the stream store refuses, without writing', async () => {
    const store = await makeStore({ streams: [referenceStream()] })
    const listener = vi.fn()
    store.subscribeCommit(listener)

    const result = store.activeStore.deleteStep(
      store.activeStore.activeVersion.steps[0].id
    )

    expect(result.ok).toBe(false)
    expect(store.revision).toBe(3)
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('workspaceStore: a stale value stream store', () => {
  it('cannot edit a stream that was removed: no revision, no commit, no save', async () => {
    const [a, b] = [referenceStream(), referenceReworkStream()]
    const repository = createMemoryWorkspaceRepository({
      raw: rawOf([a, b]),
    })
    const store = await makeStore({ repository })
    const stale = store.activeStore
    store.remove(a.id)
    await store.flushSaves()
    const revision = store.revision
    const listener = vi.fn()
    store.subscribeCommit(listener)
    const save = vi.spyOn(repository, 'save')

    stale.addStep({ name: 'Ghost' })
    await store.flushSaves()

    expect(store.revision).toBe(revision)
    expect(listener).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
    expect(store.streams.map((s) => s.id)).toEqual([b.id])
  })

  it('cannot overwrite a freshly loaded stream that has the same id', async () => {
    const stream = referenceStream()
    const store = await makeStore({ streams: [stream] })
    const stale = store.activeStore
    store.replaceWorkspace(
      workspaceOf([{ ...stream, name: 'From file' }], {
        id: 'other',
        revision: 7,
      })
    )
    const listener = vi.fn()
    store.subscribeCommit(listener)

    stale.addStep({ name: 'Ghost' })

    expect(store.revision).toBe(7)
    expect(listener).not.toHaveBeenCalled()
    expect(store.streams[0].name).toBe('From file')
    expect(stepNamesOf(store)).not.toContain('Ghost')
  })

  it('cannot navigate or drag a replaced stream either', async () => {
    const stream = referenceStream()
    const store = await makeStore({ streams: [stream] })
    const stale = store.activeStore
    store.replaceWorkspace(
      workspaceOf([{ ...stream, name: 'From file' }], { id: 'other' })
    )
    const { id } = stale.activeVersion.steps[1]

    stale.goToStage(2)
    stale.updateStepPosition(id, { x: 400, y: 120 })

    expect(store.streams[0].session).toEqual(stream.session)
    expect(store.streams[0].versions[0].steps[1].position).toEqual(
      stream.versions[0].steps[1].position
    )
  })

  it('cannot undo a rename by editing after the rename rebuilt the store', async () => {
    const stream = referenceStream()
    const store = await makeStore({ streams: [stream] })
    const stale = store.activeStore
    store.rename(stream.id, 'Payments')

    stale.addStep({ name: 'Ghost' })

    expect(store.streams[0].name).toBe('Payments')
    expect(stepNamesOf(store)).not.toContain('Ghost')
  })
})

describe('workspaceStore: navigation', () => {
  it('saves the new stage without bumping the revision or firing commit', async () => {
    const repository = createMemoryWorkspaceRepository({
      raw: rawOf([referenceStream()]),
    })
    const store = await makeStore({ repository })
    const listener = vi.fn()
    store.subscribeCommit(listener)

    store.activeStore.goToStage(2)
    await store.flushSaves()

    expect(store.revision).toBe(3)
    expect(store.savedRevision).toBe(3)
    expect(listener).not.toHaveBeenCalled()
    const saved = await savedIn(repository)
    expect(saved.streams[0].session.activeStage).toBe(2)
    expect(saved.revision).toBe(3)
  })

  it('saves which version is viewed without bumping the revision or counting as unsaved', async () => {
    const repository = createMemoryWorkspaceRepository({
      raw: rawOf([referenceStream()]),
    })
    const store = await makeStore({ repository })
    const current = store.streams[0].versions[0]
    store.activeStore.createFutureVersion('90-day target')
    const revision = store.revision
    const listener = vi.fn()
    store.subscribeCommit(listener)

    store.activeStore.setActiveVersion(current.id)
    await store.flushSaves()

    expect(store.revision).toBe(revision)
    expect(listener).not.toHaveBeenCalled()
    expect(store.streams[0].activeVersionId).toBe(current.id)
    expect((await savedIn(repository)).streams[0].activeVersionId).toBe(
      current.id
    )
  })

  it('keeps the updatedAt the last edit left when navigating', async () => {
    const stream = { ...referenceStream(), updatedAt: '2020-01-01T00:00:00Z' }
    const repository = createMemoryWorkspaceRepository({ raw: rawOf([stream]) })
    const store = await makeStore({ repository })
    store.activeStore.addStep({ name: 'Extra' })
    const editedAt = store.streams[0].updatedAt
    expect(editedAt).not.toBe('2020-01-01T00:00:00Z')

    store.activeStore.goToStage(2)
    await store.flushSaves()

    expect(store.streams[0].updatedAt).toBe(editedAt)
    expect(store.streams[0].session.activeStage).toBe(2)
    expect((await savedIn(repository)).streams[0].updatedAt).toBe(editedAt)
  })

  it('saves which stream is active when one is opened, without bumping the revision', async () => {
    const [first, second] = [referenceStream(), referenceReworkStream()]
    const repository = createMemoryWorkspaceRepository({
      raw: rawOf([first, second]),
    })
    const store = await makeStore({ repository })
    const listener = vi.fn()
    store.subscribeCommit(listener)

    store.open(second.id)
    await store.flushSaves()

    expect(store.activeStreamId).toBe(second.id)
    expect(store.activeStore.stream.id).toBe(second.id)
    expect(store.screen).toBe('stream')
    expect(store.revision).toBe(3)
    expect(listener).not.toHaveBeenCalled()
    expect((await savedIn(repository)).activeStreamId).toBe(second.id)
  })

  it('refuses to open a stream that is not in the workspace', async () => {
    const store = await makeStore({ streams: [referenceStream()] })

    expect(store.open('nope')).toEqual(refused)
  })

  it('goes home without changing which stream is active, and never saves the screen', async () => {
    const stream = referenceStream()
    const repository = createMemoryWorkspaceRepository({
      raw: rawOf([stream]),
    })
    const store = await makeStore({ repository })

    store.goHome()
    await store.flushSaves()

    expect(store.screen).toBe('home')
    expect(store.activeStreamId).toBe(stream.id)
    const raw = await repository.load()
    expect(raw).not.toContain('"screen"')
    expect(JSON.parse(raw).activeStreamId).toBe(stream.id)
  })

  it('never puts the screen in the saved workspace, whatever the screen is', async () => {
    const repository = createMemoryWorkspaceRepository({
      raw: rawOf([referenceStream()]),
    })
    const store = await makeStore({ repository })

    store.activeStore.addStep({ name: 'One' })
    store.goHome()
    store.open(store.streams[0].id)
    await store.flushSaves()

    expect(await repository.load()).not.toMatch(/screen/i)
    expect(Object.keys(store.snapshot())).not.toContain('screen')
  })

  it('opens a fresh stream store each time, so undo history is per stream', async () => {
    const [first, second] = [referenceStream(), referenceReworkStream()]
    const store = await makeStore({ streams: [first, second] })
    store.activeStore.addStep({ name: 'One' })
    expect(store.activeStore.canUndo).toBe(true)

    store.open(second.id)
    store.open(first.id)

    expect(store.activeStore.canUndo).toBe(false)
  })
})

describe('workspaceStore: create and rename', () => {
  it('appends a new stream without opening it', async () => {
    const store = await makeStore({ streams: [referenceStream()] })
    const activeBefore = store.activeStreamId

    const result = store.create({ name: 'Onboarding' })

    expect(result.ok).toBe(true)
    expect(store.streams.map((s) => s.name)).toEqual([
      'Checkout delivery',
      'Onboarding',
    ])
    expect(store.streams[1].id).toBe(result.streamId)
    expect(store.activeStreamId).toBe(activeBefore)
  })

  it('renames a stream and saves it', async () => {
    const stream = referenceStream()
    const repository = createMemoryWorkspaceRepository({
      raw: rawOf([stream]),
    })
    const store = await makeStore({ repository })

    const result = store.rename(stream.id, '  Payments  ')
    await store.flushSaves()

    expect(result.ok).toBe(true)
    expect(store.streams[0].name).toBe('Payments')
    expect(store.activeStore.canUndo).toBe(false)
    expect((await savedIn(repository)).streams[0].name).toBe('Payments')
  })

  describe('an edit the name rule turns away or finds unchanged', () => {
    // The open stream has an undoable edit, so a rename that wrongly rebuilt
    // its store would show as a lost undo.
    const openedWithEdit = async () => {
      const stream = referenceStream()
      const repository = createMemoryWorkspaceRepository({
        raw: rawOf([stream]),
      })
      const store = await makeStore({ repository })
      store.activeStore.addStep({ name: 'One' })
      await store.flushSaves()
      const listener = vi.fn()
      store.subscribeCommit(listener)
      return { stream, repository, store, listener }
    }

    it.each(['', '   ', '\t\n'])(
      'refuses %j: "Add a name", and nothing else happens',
      async (blank) => {
        const { stream, repository, store, listener } = await openedWithEdit()
        const { revision, activeStore } = store
        const saved = vi.spyOn(repository, 'save')

        expect(store.rename(stream.id, blank)).toEqual({
          ok: false,
          error: 'Add a name',
        })
        await store.flushSaves()

        expect(store.streams[0].name).toBe('Checkout delivery')
        expect(store.revision).toBe(revision)
        expect(listener).not.toHaveBeenCalled()
        expect(store.activeStore).toBe(activeStore)
        expect(store.activeStore.canUndo).toBe(true)
        expect(saved).not.toHaveBeenCalled()
        expect((await savedIn(repository)).streams[0].name).toBe(
          'Checkout delivery'
        )
      }
    )

    it.each(['Checkout delivery', '  Checkout delivery  '])(
      'finds %j unchanged: ok, and nothing else happens',
      async (typed) => {
        const { stream, repository, store, listener } = await openedWithEdit()
        const { revision, activeStore } = store
        const { updatedAt } = store.streams[0]
        const saved = vi.spyOn(repository, 'save')

        expect(store.rename(stream.id, typed)).toEqual({ ok: true })
        await store.flushSaves()

        expect(store.streams[0].updatedAt).toBe(updatedAt)
        expect(store.revision).toBe(revision)
        expect(listener).not.toHaveBeenCalled()
        expect(store.activeStore).toBe(activeStore)
        expect(store.activeStore.canUndo).toBe(true)
        expect(saved).not.toHaveBeenCalled()
      }
    )

    it('refuses a blank name for a stream that has none, which stays unnamed', async () => {
      const unnamed = referenceStream({ name: '' })
      const store = await makeStore({ streams: [unnamed] })
      const { revision } = store

      expect(store.rename(unnamed.id, '  ')).toEqual({
        ok: false,
        error: 'Add a name',
      })

      expect(store.streams[0].name).toBe('')
      expect(store.revision).toBe(revision)
    })
  })

  it('keeps a later edit from undoing the rename of the open stream', async () => {
    const stream = referenceStream()
    const store = await makeStore({ streams: [stream] })

    store.rename(stream.id, 'Payments')
    store.activeStore.addStep({ name: 'One' })
    store.activeStore.undo()

    expect(store.streams[0].name).toBe('Payments')
    expect(store.streams[0].versions[0].steps.map((s) => s.name)).not.toContain(
      'One'
    )
  })
})

describe('workspaceStore: duplicate', () => {
  it('inserts the copy right after its source, named "(copy)"', async () => {
    const [a, b] = [
      referenceStream({ name: 'A' }),
      referenceStream({ name: 'B' }),
    ]
    const store = await makeStore({ streams: [a, b] })

    const result = store.duplicate(a.id)

    expect(result.ok).toBe(true)
    expect(store.streams.map((s) => s.name)).toEqual(['A', 'A (copy)', 'B'])
    expect(store.streams[1].id).toBe(result.streamId)
  })

  it('names a second copy "(copy 2)" and a third "(copy 3)"', async () => {
    const a = referenceStream({ name: 'A' })
    const store = await makeStore({ streams: [a] })

    store.duplicate(a.id)
    store.duplicate(a.id)
    store.duplicate(a.id)

    expect(store.streams.map((s) => s.name)).toEqual([
      'A',
      'A (copy 3)',
      'A (copy 2)',
      'A (copy)',
    ])
  })

  it('names the copy of an unnamed stream "Untitled value stream (copy)"', async () => {
    const unnamed = referenceStream({ name: '' })
    const store = await makeStore({ streams: [unnamed] })

    store.duplicate(unnamed.id)

    expect(store.streams.map((s) => s.name)).toEqual([
      '',
      'Untitled value stream (copy)',
    ])
  })

  it('gives the copy new ids all the way down and a valid, equal-looking map', async () => {
    const source = referenceReworkStream()
    const store = await makeStore({ streams: [source] })

    store.duplicate(source.id)
    const copy = store.streams[1]
    const [sourceVersion] = source.versions
    const [copyVersion] = copy.versions

    expect(copy.id).not.toBe(source.id)
    expect(copyVersion.id).not.toBe(sourceVersion.id)
    expect(copy.activeVersionId).toBe(copyVersion.id)
    const sourceIds = new Set(sourceVersion.steps.map((s) => s.id))
    expect(copyVersion.steps.every((s) => !sourceIds.has(s.id))).toBe(true)
    expect(copyVersion.steps.map((s) => s.name)).toEqual(
      sourceVersion.steps.map((s) => s.name)
    )
    const copyIds = new Set(copyVersion.steps.map((s) => s.id))
    expect(copyVersion.reworkPaths).toHaveLength(1)
    expect(copyIds.has(copyVersion.reworkPaths[0].fromStepId)).toBe(true)
    expect(copyIds.has(copyVersion.reworkPaths[0].toStepId)).toBe(true)
    expect(copyVersion.reworkPaths[0].id).not.toBe(
      sourceVersion.reworkPaths[0].id
    )
  })

  it('does not change the source, and does not open the copy', async () => {
    const source = referenceStream()
    const store = await makeStore({ streams: [source] })

    store.duplicate(source.id)

    expect(store.streams[0]).toEqual(source)
    expect(store.activeStreamId).toBe(source.id)
  })

  it('refuses to duplicate a stream that is not in the workspace', async () => {
    const store = await makeStore({ streams: [referenceStream()] })

    expect(store.duplicate('nope').ok).toBe(false)
  })
})

describe('workspaceStore: remove and restore', () => {
  it('removes a stream, which restoreLast puts back in place', async () => {
    const [a, b, c] = ['A', 'B', 'C'].map((name) => referenceStream({ name }))
    const store = await makeStore({ streams: [a, b, c] })

    expect(store.remove(b.id)).toEqual({ ok: true })
    expect(store.streams.map((s) => s.name)).toEqual(['A', 'C'])

    expect(store.restoreLast().ok).toBe(true)
    expect(store.streams.map((s) => s.name)).toEqual(['A', 'B', 'C'])
  })

  it('goes home when the active stream is removed', async () => {
    const a = referenceStream()
    const store = await makeStore({ streams: [a] })

    store.remove(a.id)

    expect(store.activeStreamId).toBeNull()
    expect(store.activeStore).toBeNull()
    expect(store.screen).toBe('home')
  })

  it('makes the active stream active again, without leaving home, when its removal is undone', async () => {
    const a = referenceStream()
    const store = await makeStore({ streams: [a] })
    store.remove(a.id)

    store.restoreLast()

    expect(store.activeStreamId).toBe(a.id)
    expect(store.screen).toBe('home')
    expect(store.activeStore).not.toBeNull()
    expect(store.snapshot().activeStreamId).toBe(a.id)
  })

  it('does not take the active place back when a stream opened since', async () => {
    const [a, b] = [referenceStream(), referenceReworkStream()]
    const store = await makeStore({ streams: [a, b] })
    store.remove(a.id)
    store.open(b.id)

    store.restoreLast()

    expect(store.activeStreamId).toBe(b.id)
  })

  it('leaves the active stream alone when a stream that was not active is restored', async () => {
    const [a, b] = [referenceStream(), referenceReworkStream()]
    const store = await makeStore({ streams: [a, b] })
    store.remove(b.id)

    store.restoreLast()

    expect(store.activeStreamId).toBe(a.id)
  })

  it('keeps the active stream when another one is removed', async () => {
    const [a, b] = [referenceStream(), referenceReworkStream()]
    const store = await makeStore({ streams: [a, b] })

    store.remove(b.id)

    expect(store.activeStreamId).toBe(a.id)
    expect(store.screen).toBe('stream')
  })

  it('refuses to remove a stream that is not in the workspace', async () => {
    const store = await makeStore({ streams: [referenceStream()] })

    expect(store.remove('nope').ok).toBe(false)
  })

  it('counts a remove and a restore as edits', async () => {
    const [a, b] = [referenceStream(), referenceReworkStream()]
    const store = await makeStore({ streams: [a, b] })
    const listener = vi.fn()
    store.subscribeCommit(listener)

    store.remove(b.id)
    store.restoreLast()

    expect(listener).toHaveBeenCalledTimes(2)
    expect(store.revision).toBe(5)
  })
})

describe('workspaceStore: the last removal', () => {
  const twoStreams = () =>
    makeStore({
      streams: [referenceStream({ name: 'A' }), referenceReworkStream()],
    })

  it('is null until something is removed', async () => {
    const store = await twoStreams()

    expect(store.lastRemoval).toBeNull()
  })

  it('says which stream Undo would restore, by id and display name', async () => {
    const store = await twoStreams()
    const [a] = store.streams

    store.remove(a.id)

    expect(store.lastRemoval).toEqual({ streamId: a.id, name: 'A' })
  })

  it('calls an unnamed removed stream "Untitled value stream"', async () => {
    const unnamed = referenceStream({ name: '' })
    const store = await makeStore({ streams: [unnamed, referenceStream()] })

    store.remove(unnamed.id)

    expect(store.lastRemoval).toEqual({
      streamId: unnamed.id,
      name: 'Untitled value stream',
    })
  })

  it('restores the most recent removal in place and then has nothing left', async () => {
    const [a, b, c] = ['A', 'B', 'C'].map((name) => referenceStream({ name }))
    const store = await makeStore({ streams: [a, b, c] })
    store.remove(b.id)

    const result = store.restoreLast()

    expect(result).toEqual({ ok: true, streamId: b.id })
    expect(store.streams.map((s) => s.name)).toEqual(['A', 'B', 'C'])
    expect(store.lastRemoval).toBeNull()
  })

  it('refuses when nothing was removed, and changes nothing', async () => {
    const store = await twoStreams()
    const revision = store.revision

    expect(store.restoreLast()).toEqual(refused)

    expect(store.streams).toHaveLength(2)
    expect(store.revision).toBe(revision)
  })

  it('refuses a second restore of the same removal', async () => {
    const store = await twoStreams()
    store.remove(store.streams[0].id)
    store.restoreLast()

    expect(store.restoreLast()).toEqual(refused)

    expect(store.streams).toHaveLength(2)
  })

  it('is replaced by a newer removal, so only the newest can be restored', async () => {
    const [a, b, c] = ['A', 'B', 'C'].map((name) => referenceStream({ name }))
    const store = await makeStore({ streams: [a, b, c] })
    store.remove(a.id)
    store.remove(b.id)

    expect(store.lastRemoval).toEqual({ streamId: b.id, name: 'B' })
    expect(store.restoreLast()).toMatchObject({ ok: true, streamId: b.id })
    expect(store.streams.map((s) => s.name)).toEqual(['B', 'C'])
    expect(store.restoreLast()).toEqual(refused)
  })

  it('survives opening another stream and going home', async () => {
    const [a, b] = [referenceStream(), referenceReworkStream()]
    const store = await makeStore({ streams: [a, b] })
    store.remove(a.id)
    store.open(b.id)
    store.goHome()

    expect(store.lastRemoval).toMatchObject({ streamId: a.id })
    expect(store.restoreLast()).toMatchObject({ ok: true, streamId: a.id })
    expect(store.streams.map((s) => s.id)).toEqual([a.id, b.id])
    expect(store.activeStreamId).toBe(b.id)
  })

  it('is cleared by a restore that cannot work, so Undo is over', async () => {
    const [a, b] = [referenceStream(), referenceReworkStream()]
    const store = await makeStore({ streams: [a, b] })
    const { text } = store.exportStream(b.id)
    store.remove(b.id)
    store.importStream(text)

    expect(store.restoreLast()).toEqual(refused)

    expect(store.lastRemoval).toBeNull()
    expect(store.streams).toHaveLength(2)
  })

  it('is cleared when another workspace is opened', async () => {
    const [a, b] = [referenceStream(), referenceReworkStream()]
    const store = await makeStore({ streams: [a, b] })
    store.remove(b.id)

    store.replaceWorkspace(workspaceOf([referenceStream()], { id: 'other' }))

    expect(store.lastRemoval).toBeNull()
    expect(store.restoreLast()).toEqual(refused)
    expect(store.streams).toHaveLength(1)
  })

  it('is not kept for a removal that was refused', async () => {
    const store = await twoStreams()

    store.remove('nope')

    expect(store.lastRemoval).toBeNull()
  })

  describe('while other things happen', () => {
    const removedFirst = async () => {
      const store = await twoStreams()
      const [a, b] = store.streams
      store.remove(a.id)
      return { store, a, b, expected: { streamId: a.id, name: 'A' } }
    }

    it('survives a refused remove', async () => {
      const { store, expected } = await removedFirst()

      expect(store.remove('nope').ok).toBe(false)

      expect(store.lastRemoval).toEqual(expected)
    })

    it.each([
      ['a new value stream', (store) => store.create({ name: 'New' })],
      ['a duplicate', (store, { b }) => store.duplicate(b.id)],
      ['a rename', (store, { b }) => store.rename(b.id, 'Renamed')],
      ['a refused rename', (store, { b }) => store.rename(b.id, '  ')],
    ])('survives %s', async (_what, act) => {
      const removed = await removedFirst()

      act(removed.store, removed)

      expect(removed.store.lastRemoval).toEqual(removed.expected)
      expect(removed.store.restoreLast()).toMatchObject({
        ok: true,
        streamId: removed.a.id,
      })
    })
  })
})

describe('workspaceStore: import and export', () => {
  it('appends an imported stream', async () => {
    const store = await makeStore({ streams: [referenceStream()] })
    const incoming = referenceReworkStream({ name: 'Imported' })
    const result = store.importStream(JSON.stringify(incoming))

    expect(result.ok).toBe(true)
    expect(store.streams.map((s) => s.name)).toEqual([
      'Checkout delivery',
      'Imported',
    ])
    expect(store.streams[1].id).toBe(incoming.id)
  })

  it('gives an imported stream a new id when its id is already in the workspace', async () => {
    const stream = referenceStream()
    const store = await makeStore({ streams: [stream] })

    const result = store.importStream(JSON.stringify(stream))

    expect(result.ok).toBe(true)
    expect(store.streams).toHaveLength(2)
    expect(store.streams[1].id).not.toBe(stream.id)
    expect(result.streamId).toBe(store.streams[1].id)
  })

  it('refuses a file that is not a value stream, and changes nothing', async () => {
    const store = await makeStore({ streams: [referenceStream()] })

    const result = store.importStream('{"hello": 1}')

    expect(result).toEqual(refused)
    expect(store.streams).toHaveLength(1)
    expect(store.revision).toBe(3)
  })

  it('exports a stream as the text importing reads back', async () => {
    const stream = referenceReworkStream()
    const store = await makeStore({ streams: [stream] })

    const { ok, text } = store.exportStream(stream.id)

    expect(ok).toBe(true)
    expect(JSON.parse(text)).toEqual(stream)
  })

  it('refuses to export a stream that is not in the workspace', async () => {
    const store = await makeStore({ streams: [referenceStream()] })

    expect(store.exportStream('nope')).toEqual(refused)
  })
})

describe('workspaceStore: showChanges', () => {
  it('shows the changes an import applied, in place of the ones shown before', async () => {
    const store = await makeStore({ streams: [referenceStream()] })

    store.showChanges(['Wait time clamped for "Dev"'])

    expect(store.changes).toEqual(['Wait time clamped for "Dev"'])
  })
})

describe('workspaceStore: replaceWorkspace', () => {
  it('swaps in another workspace as the saved baseline, without a commit', async () => {
    const store = await makeStore({ streams: [referenceStream()] })
    store.activeStore.addStep({ name: 'Local edit' })
    const listener = vi.fn()
    store.subscribeCommit(listener)
    const incoming = referenceReworkStream({ name: 'From file' })

    store.replaceWorkspace(
      workspaceOf([incoming], { id: 'other', revision: 9 })
    )

    expect(store.streams.map((s) => s.name)).toEqual(['From file'])
    expect(store.activeStreamId).toBe(incoming.id)
    expect(store.activeStore.stream.id).toBe(incoming.id)
    expect(store.revision).toBe(9)
    expect(store.savedRevision).toBe(store.revision)
    expect(listener).not.toHaveBeenCalled()
  })

  it('adopts the revision of the workspace it is given, even a lower one', async () => {
    const store = await makeStore({ streams: [referenceStream()] })
    store.activeStore.addStep({ name: 'Local edit' })
    expect(store.revision).toBe(4)

    store.replaceWorkspace(
      workspaceOf([referenceReworkStream()], { id: 'other', revision: 1 })
    )

    expect(store.revision).toBe(1)
    expect(store.savedRevision).toBe(1)
  })

  it('forgets what migrating the old workspace changed', async () => {
    const v1Map = {
      id: 'v1',
      name: 'Old map',
      steps: [createV1Step('Build')],
      connections: [],
    }
    const store = await makeStore({ v1Repository: { load: () => v1Map } })
    expect(store.changes.length).toBeGreaterThan(0)

    store.replaceWorkspace(createWorkspace())

    expect(store.changes).toEqual([])
  })

  it('shows the changes it is given, such as what upgrading an imported v1 map applied', async () => {
    const store = await makeStore()

    store.replaceWorkspace(createWorkspace(), {
      changes: ['Intake step added'],
    })

    expect(store.changes).toEqual(['Intake step added'])
  })

  it('saves the replacement to the repository', async () => {
    const repository = createMemoryWorkspaceRepository()
    const store = await makeStore({ repository })
    const incoming = referenceStream()

    store.replaceWorkspace(workspaceOf([incoming], { id: 'other' }))
    await store.flushSaves()

    const saved = await savedIn(repository)
    expect(saved.id).toBe('other')
    expect(saved.streams[0].id).toBe(incoming.id)
  })

  it('leaves the unreadable state when a workspace is opened', async () => {
    const store = await makeStore({
      repository: createMemoryWorkspaceRepository({ raw: '{not json' }),
    })

    store.replaceWorkspace(createWorkspace())

    expect(store.status).toBe('ready')
    expect(store.unreadable).toBeNull()
    expect(store.screen).toBe('home')
  })
})
