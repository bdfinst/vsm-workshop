import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createIndexedDbWorkspaceRepository } from '../../../src/persistence/v2/indexedDbWorkspaceRepository.js'
import { createMemoryWorkspaceRepository } from '../../../src/persistence/v2/memoryWorkspaceRepository.js'
import { parseWorkspace } from '../../../src/persistence/v2/workspaceCodec.js'
import { referenceStream, workspaceOf } from './fixtures.js'

const DB_NAME = 'vsm-workshop-test'

const stubStorage = (persist) =>
  vi.stubGlobal('navigator', { storage: { persist } })

const pendingPromise = () => {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const open = (factory, name, version, onUpgrade) =>
  new Promise((resolve, reject) => {
    const request = factory.open(name, version)
    request.onupgradeneeded = () => onUpgrade?.(request.result)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory())
  stubStorage(vi.fn().mockResolvedValue(true))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe.each([
  ['memory', () => createMemoryWorkspaceRepository()],
  ['IndexedDB', () => createIndexedDbWorkspaceRepository({ dbName: DB_NAME })],
])('%s workspace repository', (_name, createRepository) => {
  it('loads nothing before the first save', async () => {
    expect(await createRepository().load()).toBeNull()
  })

  it('loads the workspace that was saved, as file text', async () => {
    const repository = createRepository()
    const workspace = workspaceOf([referenceStream()])

    await repository.save(workspace)
    const result = parseWorkspace(await repository.load())

    expect(result.ok).toBe(true)
    expect(result.workspace.streams).toEqual(workspace.streams)
  })

  it('keeps only the latest save', async () => {
    const repository = createRepository()

    await repository.save(workspaceOf([referenceStream()], { revision: 1 }))
    await repository.save(workspaceOf([referenceStream()], { revision: 2 }))

    expect(parseWorkspace(await repository.load()).workspace.revision).toBe(2)
  })

  it('has no backup before one is saved', async () => {
    expect(await createRepository().loadBackup()).toBeNull()
  })

  it('keeps raw data as a backup without touching the workspace', async () => {
    const repository = createRepository()
    await repository.save(workspaceOf([referenceStream()]))

    await repository.saveBackup('{ not json')

    expect(await repository.loadBackup()).toBe('{ not json')
    expect(parseWorkspace(await repository.load()).ok).toBe(true)
  })

  it('is available', async () => {
    expect(await createRepository().isAvailable()).toBe(true)
  })
})

describe('memory workspace repository', () => {
  it('starts with raw saved data when given, even if it is not a workspace', async () => {
    const repository = createMemoryWorkspaceRepository({ raw: '{ not json' })

    expect(await repository.load()).toBe('{ not json')
  })

  it('does not claim persistent storage', () => {
    expect(createMemoryWorkspaceRepository().persisted).toBe(false)
  })
})

describe('IndexedDB workspace repository', () => {
  it('keeps the workspace for a new repository on the same database', async () => {
    await createIndexedDbWorkspaceRepository({ dbName: DB_NAME }).save(
      workspaceOf([referenceStream()])
    )

    const reopened = createIndexedDbWorkspaceRepository({ dbName: DB_NAME })

    expect(parseWorkspace(await reopened.load()).ok).toBe(true)
  })

  it('keeps the workspace apart per database name', async () => {
    await createIndexedDbWorkspaceRepository({ dbName: 'one' }).save(
      workspaceOf([])
    )

    const other = createIndexedDbWorkspaceRepository({ dbName: 'two' })

    expect(await other.load()).toBeNull()
  })

  describe('when IndexedDB is unavailable', () => {
    beforeEach(() => {
      vi.stubGlobal('indexedDB', undefined)
    })

    it('reports it is not available', async () => {
      const repository = createIndexedDbWorkspaceRepository({
        dbName: DB_NAME,
      })

      expect(await repository.isAvailable()).toBe(false)
    })

    it('fails to save and to load', async () => {
      const repository = createIndexedDbWorkspaceRepository({
        dbName: DB_NAME,
      })

      await expect(repository.save(workspaceOf([]))).rejects.toThrow(TypeError)
      await expect(repository.load()).rejects.toThrow(TypeError)
    })

    it('does not ask for persistent storage', async () => {
      const persist = vi.fn().mockResolvedValue(true)
      stubStorage(persist)

      await createIndexedDbWorkspaceRepository({
        dbName: DB_NAME,
      }).isAvailable()

      expect(persist).not.toHaveBeenCalled()
    })
  })

  describe('when the browser refuses to open the database', () => {
    it('reports it is not available', async () => {
      vi.stubGlobal('indexedDB', {
        open: () => {
          throw new DOMException('denied', 'SecurityError')
        },
      })

      const repository = createIndexedDbWorkspaceRepository({
        dbName: DB_NAME,
      })

      expect(await repository.isAvailable()).toBe(false)
    })
  })

  describe('persistent storage', () => {
    it('is requested once across several saves and loads', async () => {
      const persist = vi.fn().mockResolvedValue(true)
      stubStorage(persist)
      const repository = createIndexedDbWorkspaceRepository({
        dbName: DB_NAME,
      })

      await repository.save(workspaceOf([]))
      await repository.save(workspaceOf([]))
      await repository.save(workspaceOf([]))
      await repository.load()

      expect(persist).toHaveBeenCalledTimes(1)
    })

    it('is reported as persisted once it is granted', async () => {
      const repository = createIndexedDbWorkspaceRepository({
        dbName: DB_NAME,
      })

      await repository.save(workspaceOf([]))
      await vi.waitFor(() => expect(repository.persisted).toBe(true))
    })

    it('is reported as not persisted when denied', async () => {
      const persist = vi.fn().mockResolvedValue(false)
      stubStorage(persist)
      const repository = createIndexedDbWorkspaceRepository({
        dbName: DB_NAME,
      })

      await repository.save(workspaceOf([]))
      await vi.waitFor(() => expect(persist).toHaveBeenCalled())
      await persist.mock.results[0].value

      expect(repository.persisted).toBe(false)
    })

    it('is reported as not persisted when the request fails', async () => {
      const persist = vi.fn().mockRejectedValue(new Error('no'))
      stubStorage(persist)
      const repository = createIndexedDbWorkspaceRepository({
        dbName: DB_NAME,
      })

      await repository.save(workspaceOf([]))
      await vi.waitFor(() => expect(persist).toHaveBeenCalled())
      await persist.mock.results[0].value.catch(() => {})

      expect(repository.persisted).toBe(false)
    })

    it('is reported as not persisted when the browser has no such request', async () => {
      vi.stubGlobal('navigator', {})
      const repository = createIndexedDbWorkspaceRepository({
        dbName: DB_NAME,
      })

      await repository.save(workspaceOf([]))

      expect(repository.persisted).toBe(false)
    })

    it('does not hold up loading while the browser has not answered', async () => {
      const answer = pendingPromise()
      stubStorage(vi.fn().mockReturnValue(answer.promise))
      const repository = createIndexedDbWorkspaceRepository({
        dbName: DB_NAME,
      })

      await repository.save(workspaceOf([]))
      expect(await repository.load()).not.toBeNull()
      expect(repository.persisted).toBe(false)

      answer.resolve(true)
      await vi.waitFor(() => expect(repository.persisted).toBe(true))
    })
  })

  describe('when another copy of the app wrote a newer database version', () => {
    // A version 2 database. Its layout is the newer copy's own: either a store
    // this app doesn't know, or the app's store with other keys in it.
    const writeNewerDatabase = async (layout) => {
      const db = await open(indexedDB, DB_NAME, 2, (created) => {
        if (layout === 'other-store') created.createObjectStore('documents')
        else created.createObjectStore('workspace')
      })
      await new Promise((resolve) => {
        const storeName = layout === 'other-store' ? 'documents' : 'workspace'
        const tx = db.transaction(storeName, 'readwrite')
        tx.objectStore(storeName).put('{"v":3}', 'doc-1')
        tx.oncomplete = resolve
      })
      db.close()
    }

    const storeContents = async () => {
      const db = await open(indexedDB, DB_NAME, 2)
      const names = [...db.objectStoreNames]
      const entries = {}
      for (const name of names) {
        entries[name] = await new Promise((resolve) => {
          const request = db
            .transaction(name, 'readonly')
            .objectStore(name)
            .getAllKeys()
          request.onsuccess = () => resolve(request.result)
        })
      }
      db.close()
      return entries
    }

    it.each([['other-store'], ['same-store-other-keys']])(
      'opens without a version and reads text the codec refuses as newer (%s)',
      async (layout) => {
        await writeNewerDatabase(layout)
        const repository = createIndexedDbWorkspaceRepository({
          dbName: DB_NAME,
        })

        expect(await repository.isAvailable()).toBe(true)
        const text = await repository.load()

        expect(parseWorkspace(text)).toEqual({
          ok: false,
          error: 'This file was made by a newer version of the app',
        })
      }
    )

    it('reads the working copy when the newer database still has one as text', async () => {
      const newerRecord = JSON.stringify({
        format: 'vsm-workspace',
        schemaVersion: 9,
      })
      const db = await open(indexedDB, DB_NAME, 2, (created) =>
        created.createObjectStore('workspace')
      )
      await new Promise((resolve) => {
        const tx = db.transaction('workspace', 'readwrite')
        tx.objectStore('workspace').put(newerRecord, 'current')
        tx.oncomplete = resolve
      })
      db.close()
      const repository = createIndexedDbWorkspaceRepository({
        dbName: DB_NAME,
      })

      expect(await repository.load()).toBe(newerRecord)
    })

    it('has no backup to give, without throwing', async () => {
      await writeNewerDatabase('other-store')
      const repository = createIndexedDbWorkspaceRepository({
        dbName: DB_NAME,
      })

      expect(await repository.loadBackup()).toBeNull()
    })

    it.each([['other-store'], ['same-store-other-keys']])(
      'refuses to save or back up, and writes nothing (%s)',
      async (layout) => {
        await writeNewerDatabase(layout)
        const before = await storeContents()
        const repository = createIndexedDbWorkspaceRepository({
          dbName: DB_NAME,
        })

        await expect(repository.save(workspaceOf([]))).rejects.toThrow()
        await expect(repository.saveBackup('{ not json')).rejects.toThrow()

        expect(await storeContents()).toEqual(before)
      }
    )
  })

  describe('when another copy upgrades the database while this one is open', () => {
    it('lets the upgrade through', async () => {
      const repository = createIndexedDbWorkspaceRepository({
        dbName: DB_NAME,
      })
      await repository.save(workspaceOf([]))

      const upgraded = await open(indexedDB, DB_NAME, 2)

      expect(upgraded.version).toBe(2)
      upgraded.close()
    })

    it('opens again for the next call, without asking for persistent storage again', async () => {
      const persist = vi.fn().mockResolvedValue(true)
      stubStorage(persist)
      const repository = createIndexedDbWorkspaceRepository({
        dbName: DB_NAME,
      })
      await repository.save(workspaceOf([]))
      const upgraded = await open(indexedDB, DB_NAME, 2)
      upgraded.close()

      expect(parseWorkspace(await repository.load()).ok).toBe(true)
      expect(persist).toHaveBeenCalledTimes(1)
    })
  })
})
