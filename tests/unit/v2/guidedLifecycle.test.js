import { describe, it, expect } from 'vitest'
import { createGuidedLifecycle } from '../../../src/stores/v2/guidedLifecycle.js'
import { createWorkspaceStore } from '../../../src/stores/v2/workspaceStore.svelte.js'
import { createMemoryWorkspaceRepository } from '../../../src/persistence/v2/memoryWorkspaceRepository.js'
import { serializeWorkspace } from '../../../src/persistence/v2/workspaceCodec.js'
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
})
