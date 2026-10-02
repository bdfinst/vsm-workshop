import { describe, it, expect } from 'vitest'
import { createGuidedLifecycle } from '../../../src/stores/v2/guidedLifecycle.js'
import { createWorkspaceStore } from '../../../src/stores/v2/workspaceStore.svelte.js'
import { createMemoryWorkspaceRepository } from '../../../src/persistence/v2/memoryWorkspaceRepository.js'
import { serializeWorkspace } from '../../../src/persistence/v2/workspaceCodec.js'
import { exportValueStream } from '../../../src/persistence/v2/valueStreamJson.js'
import { noV1Repository, referenceStream, workspaceOf } from './fixtures.js'

/** A repository whose load answers only when the test releases it. */
const heldLoadRepository = (raw = null) => {
  const inner = createMemoryWorkspaceRepository({ raw })
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  return {
    ...inner,
    release,
    load: async () => {
      const text = await inner.load()
      await gate
      return text
    },
  }
}

const launchOver = (repository) => {
  const store = createWorkspaceStore({
    repository,
    v1Repository: noV1Repository,
  })
  return { store, lifecycle: createGuidedLifecycle({ store }) }
}

describe('guidedLifecycle', () => {
  it('creates nothing before the workspace is ready', async () => {
    const repository = heldLoadRepository()
    const { store, lifecycle } = launchOver(repository)

    const launched = lifecycle.start()
    await Promise.resolve()
    expect(store.status).toBe('loading')
    expect(store.streams).toHaveLength(0)
    expect(store.revision).toBe(0)

    repository.release()
    await launched
    expect(store.streams).toHaveLength(1)
  })

  it('creates exactly one stream for an empty workspace and opens it', async () => {
    const { store, lifecycle } = launchOver(createMemoryWorkspaceRepository())

    await Promise.all([lifecycle.start(), lifecycle.start()])
    await lifecycle.start()

    expect(store.streams).toHaveLength(1)
    expect(store.activeStreamId).toBe(store.streams[0].id)
    expect(store.screen).toBe('stream')
    expect(store.revision).toBe(store.savedRevision)
  })

  it('leaves a saved workspace as it was', async () => {
    const saved = referenceStream()
    const raw = serializeWorkspace(workspaceOf([saved]))
    const { store, lifecycle } = launchOver(
      createMemoryWorkspaceRepository({ raw })
    )

    await lifecycle.start()

    expect(store.streams.map((stream) => stream.id)).toEqual([saved.id])
  })

  it('creates nothing when the saved workspace is unreadable', async () => {
    const { store, lifecycle } = launchOver(
      createMemoryWorkspaceRepository({ raw: '{not json' })
    )

    await lifecycle.start()

    expect(store.status).toBe('unreadable')
    expect(store.streams).toHaveLength(0)
  })

  it('Reload resumes the session: opens the active stream at its saved stage', async () => {
    const stream = referenceStream({
      session: { activeStage: 2, furthestStage: 4 },
    })
    const raw = serializeWorkspace(workspaceOf([stream]))
    const { store, lifecycle } = launchOver(
      createMemoryWorkspaceRepository({ raw })
    )

    await lifecycle.start()

    expect(store.screen).toBe('stream')
    expect(store.activeStore.stream.id).toBe(stream.id)
    expect(store.activeStore.stream.session.activeStage).toBe(2)
  })

  describe('leaving an unreadable workspace', () => {
    const UNREADABLE = '{not json'
    const unreadableLaunch = async () => {
      const repository = createMemoryWorkspaceRepository({ raw: UNREADABLE })
      const launched = launchOver(repository)
      await launched.lifecycle.start()
      return { repository, ...launched }
    }

    it('starting empty opens one empty stream on Scope and keeps the backup', async () => {
      const { store, lifecycle, repository } = await unreadableLaunch()

      lifecycle.startEmpty()

      expect(store.status).toBe('ready')
      expect(store.streams).toHaveLength(1)
      expect(store.activeStore.stream.session.activeStage).toBe(1)
      expect(store.revision).toBe(store.savedRevision)
      await store.flushSaves()
      expect(await repository.loadBackup()).toBe(UNREADABLE)
    })

    it('importing starts a workspace holding the imported stream', async () => {
      const { store, lifecycle, repository } = await unreadableLaunch()
      const text = exportValueStream(referenceStream({ name: 'Imported' }))

      const result = lifecycle.startFromImport(text)

      expect(result.ok).toBe(true)
      expect(store.status).toBe('ready')
      expect(store.streams.map((stream) => stream.name)).toEqual(['Imported'])
      expect(store.activeStore.stream.name).toBe('Imported')
      expect(await repository.loadBackup()).toBe(UNREADABLE)
    })

    it('a file that is not a value stream is refused and the screen stays', async () => {
      const { store, lifecycle } = await unreadableLaunch()

      const result = lifecycle.startFromImport('{"hello":"world"}')

      expect(result.ok).toBe(false)
      expect(result.error).toMatch(/\S/)
      expect(store.status).toBe('unreadable')
    })
  })
})
