import { describe, it, expect } from 'vitest'
import { createGuidedLifecycle } from '../../../src/stores/v2/guidedLifecycle.js'
import { createWorkspaceStore } from '../../../src/stores/v2/workspaceStore.svelte.js'
import { createMemoryWorkspaceRepository } from '../../../src/persistence/v2/memoryWorkspaceRepository.js'
import { serializeWorkspace } from '../../../src/persistence/v2/workspaceCodec.js'
import { exportValueStream } from '../../../src/persistence/v2/valueStreamJson.js'
import { createStep as createV1Step } from '../../../src/models/StepFactory.js'
import {
  noV1Repository,
  referenceStream,
  refused,
  workspaceOf,
} from './fixtures.js'

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

    it('importing a v1 map keeps what upgrading it changed, for the notice', async () => {
      const { store, lifecycle } = await unreadableLaunch()
      const v1Map = JSON.stringify({
        id: 'v1-map',
        name: 'Old map',
        description: '',
        steps: [createV1Step('Dev', { leadTime: 240, processTime: 60 })],
        connections: [],
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-16T10:00:00.000Z',
      })

      const result = lifecycle.startFromImport(v1Map)

      expect(result.ok).toBe(true)
      expect(store.changes).toEqual(['Intake step added'])
    })

    it('importing a v2 map has no changes to tell', async () => {
      const { store, lifecycle } = await unreadableLaunch()

      lifecycle.startFromImport(exportValueStream(referenceStream()))

      expect(store.changes).toEqual([])
    })

    it('a file that is not a value stream is refused and the screen stays', async () => {
      const { store, lifecycle } = await unreadableLaunch()

      const result = lifecycle.startFromImport('{"hello":"world"}')

      expect(result.ok).toBe(false)
      expect(result.error).toMatch(/\S/)
      expect(store.status).toBe('unreadable')
    })
  })

  describe('when the unreadable data could not be backed up', () => {
    const UNREADABLE = '{not json'
    const failedBackupLaunch = async () => {
      const repository = {
        ...createMemoryWorkspaceRepository({ raw: UNREADABLE }),
        saveBackup: async () => {
          throw new Error('storage full')
        },
      }
      const launched = launchOver(repository)
      await launched.lifecycle.start()
      return { repository, ...launched }
    }

    it('starting empty is refused and the only copy survives', async () => {
      const { store, lifecycle, repository } = await failedBackupLaunch()

      const result = lifecycle.startEmpty()

      expect(result).toEqual(refused)
      expect(store.status).toBe('unreadable')
      expect(store.streams).toHaveLength(0)
      await store.flushSaves()
      expect(await repository.load()).toBe(UNREADABLE)
    })

    it('importing is refused and the only copy survives', async () => {
      const { store, lifecycle, repository } = await failedBackupLaunch()
      const text = exportValueStream(referenceStream({ name: 'Imported' }))

      const result = lifecycle.startFromImport(text)

      expect(result).toEqual(refused)
      expect(store.status).toBe('unreadable')
      await store.flushSaves()
      expect(await repository.load()).toBe(UNREADABLE)
    })

    it('says why leaving is blocked until the data has been downloaded', async () => {
      const { lifecycle } = await failedBackupLaunch()

      expect(lifecycle.exitBlockedReason()).toMatch(/\S/)
      lifecycle.noteUnreadableDownloaded()

      expect(lifecycle.exitBlockedReason()).toBeNull()
    })

    it('starting empty and importing work once the data has been downloaded', async () => {
      const empty = await failedBackupLaunch()
      empty.lifecycle.noteUnreadableDownloaded()
      expect(empty.lifecycle.startEmpty().ok).toBe(true)
      expect(empty.store.status).toBe('ready')

      const imported = await failedBackupLaunch()
      imported.lifecycle.noteUnreadableDownloaded()
      const text = exportValueStream(referenceStream({ name: 'Imported' }))
      expect(imported.lifecycle.startFromImport(text).ok).toBe(true)
      expect(imported.store.activeStore.stream.name).toBe('Imported')
    })

    it('a backed-up workspace is never blocked', async () => {
      const repository = createMemoryWorkspaceRepository({ raw: UNREADABLE })
      const { lifecycle } = launchOver(repository)
      await lifecycle.start()

      expect(lifecycle.exitBlockedReason()).toBeNull()
    })
  })

  describe('when the saved workspace could not be read at all', () => {
    // The read fails, so nothing was backed up; the working copy may be intact.
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
    const readFailedLaunch = async (raw = null) => {
      const repository = flakyRepository(raw)
      const launched = launchOver(repository)
      await launched.lifecycle.start()
      return { repository, ...launched }
    }

    it('says why leaving is blocked, and downloading cannot lift it', async () => {
      const { lifecycle } = await readFailedLaunch()

      expect(lifecycle.exitBlockedReason()).toBe(
        "Couldn't read your saved data. Try again."
      )
      lifecycle.noteUnreadableDownloaded()
      expect(lifecycle.exitBlockedReason()).toBe(
        "Couldn't read your saved data. Try again."
      )
    })

    it('starting empty is refused with that reason and nothing is replaced', async () => {
      const { store, lifecycle } = await readFailedLaunch()

      const result = lifecycle.startEmpty()

      expect(result).toEqual(refused)
      expect(store.status).toBe('unreadable')
      expect(store.streams).toHaveLength(0)
    })

    it('importing is refused with that reason and nothing is replaced', async () => {
      const { store, lifecycle, repository } = await readFailedLaunch()
      repository.heal()

      const result = lifecycle.startFromImport(
        exportValueStream(referenceStream({ name: 'Imported' }))
      )
      await store.flushSaves()

      expect(result).toEqual(refused)
      expect(store.status).toBe('unreadable')
      expect(await repository.load()).toBeNull()
    })

    it('retrying opens the intact working copy once the read works', async () => {
      const saved = referenceStream({ name: 'Intact' })
      const { store, lifecycle, repository } = await readFailedLaunch(
        serializeWorkspace(workspaceOf([saved]))
      )
      repository.heal()

      await lifecycle.retry()

      expect(store.status).toBe('ready')
      expect(store.streams.map((stream) => stream.name)).toEqual(['Intact'])
      expect(lifecycle.exitBlockedReason()).toBeNull()
    })

    it('retrying into an empty workspace creates the first stream, once', async () => {
      const { store, lifecycle, repository } = await readFailedLaunch()
      repository.heal()

      await lifecycle.retry()

      expect(store.status).toBe('ready')
      expect(store.streams).toHaveLength(1)
      expect(store.screen).toBe('stream')
    })

    it('a retry that fails again stays on the unreadable screen', async () => {
      const { store, lifecycle } = await readFailedLaunch()

      await lifecycle.retry()

      expect(store.status).toBe('unreadable')
      expect(store.unreadable.readFailed).toBe(true)
    })
  })
})
