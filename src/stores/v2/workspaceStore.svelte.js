/**
 * Workspace Store (v2) - Svelte 5 Runes
 * The single writer. It owns the workspace (every value stream, which one is
 * active), the one open value stream store, and every write to the IndexedDB
 * working copy. Value stream stores never write storage; they call back here.
 * The file queue belongs to the save composition (11.1), which hooks in through
 * `snapshot`, `revision`, `savedRevision` and `subscribeCommit`.
 * @file This file uses Svelte 5 runes ($state)
 */

import { createValueStreamStore } from './valueStreamStore.svelte.js'
import { loadWorkspace } from '../../utils/migration/loadWorkspace.js'
import { vsmLocalStorageRepo } from '../../infrastructure/VsmLocalStorageRepository.js'
import { createIndexedDbWorkspaceRepository } from '../../persistence/v2/indexedDbWorkspaceRepository.js'
import {
  exportValueStream,
  importValueStream,
} from '../../persistence/v2/valueStreamJson.js'
import { createValueStream } from '../../models/v2/valueStream.js'
import { refuse } from '../../models/v2/result.js'
import { createWorkspace } from '../../models/v2/workspace.js'
import {
  copyValueStream,
  touchValueStream,
} from '../../models/v2/valueStreamCopy.js'

export const NOT_READY_MESSAGE = 'The workspace is not ready yet'
export const BLANK_NAME_MESSAGE = 'Add a name'
export const STREAM_MISSING_MESSAGE = "That value stream isn't in the workspace"
export const NOTHING_TO_RESTORE_MESSAGE = 'Nothing to restore'
export const UNREADABLE_MESSAGE = "The saved workspace couldn't be read"

const DB_NAME = 'vsm-workshop-v2'

const replaceById = (streams, stream) =>
  streams.map((s) => (s.id === stream.id ? stream : s))

/**
 * Create a workspace store.
 * @param {Object} options
 * @param {Object} options.repository - The workspace repository (IndexedDB working copy)
 * @param {Object} [options.v1Repository] - The v1 localStorage repository, read once to migrate
 * @returns {Object} Store with reactive getters and actions. Call `init()` first;
 *   every action but `replaceWorkspace` refuses until `status` is `ready`.
 */
export const createWorkspaceStore = ({
  repository,
  v1Repository = vsmLocalStorageRepo,
}) => {
  let status = $state('loading')
  // { reason, raw, backupFailed } while status is 'unreadable'. `raw` is the
  // saved text as found, or null when it could not be read at all.
  let unreadable = $state.raw(null)
  // What migrating a v1 map changed, for the screen to tell the user.
  let changes = $state.raw([])
  // Never mutated: every edit makes a new array, so a queued save keeps its copy.
  let streams = $state.raw([])
  let activeStreamId = $state(null)
  // Memory only. It is not part of `snapshot`, so it is never saved.
  let screen = $state('home')
  let activeStore = $state.raw(null)
  let revision = $state(0)
  let savedRevision = $state(0)
  let saveError = $state.raw(null)

  // The workspace's own fields, kept as loaded: format, schema version and id.
  let base = createWorkspace()
  let queue = Promise.resolve()
  // Saves asked for and not finished yet.
  let pendingSaves = 0
  let listeners = []
  // Restore tokens that can still be used.
  let tokens = []
  // The load in progress, so a second `init` waits for it instead of starting another.
  let loading = null
  // Counts the workspaces swapped in, so a load that started before one knows it lost.
  let replacements = 0

  const snapshot = () => ({
    ...base,
    streams,
    activeStreamId,
    revision,
  })

  // One save at a time, in the order asked. A failed save is reported through
  // `saveError` and never stops the saves behind it.
  const enqueueSave = () => {
    const workspace = snapshot()
    pendingSaves += 1
    queue = queue
      .then(() => repository.save(workspace))
      .then(
        () => {
          saveError = null
          pendingSaves -= 1
        },
        (error) => {
          saveError = error
          pendingSaves -= 1
        }
      )
  }

  // Edits the saved file does not have yet, or saves still on their way.
  const hasUnsavedWork = () => revision > savedRevision || pendingSaves > 0

  // An edit: counts as a new revision, is saved and tells the listeners.
  const commit = () => {
    revision += 1
    enqueueSave()
    // One broken listener must not stop the others, or undo the edit.
    listeners.forEach((listener) => {
      try {
        listener(revision)
      } catch (error) {
        console.error('A commit listener failed:', error)
      }
    })
  }

  // The value stream store never writes; its `persist` lands here. Navigation
  // and drags are saved but are not edits: no revision, and `updatedAt` stays
  // as the last edit left it (the stream store's copy of it is older).
  const persistStream = (stream, options) => {
    const stored = streams.find((s) => s.id === stream.id)
    if (options?.navigation || options?.positionOnly) {
      if (!stored) return
      const quiet = options.navigation
        ? { ...stored, session: stream.session }
        : { ...stream, updatedAt: stored.updatedAt }
      streams = replaceById(streams, quiet)
      enqueueSave()
      return
    }
    streams = replaceById(streams, touchValueStream(stream))
    commit()
  }

  // A new value stream store each time, so undo history is per stream.
  const buildActiveStore = () => {
    const stream = streams.find((s) => s.id === activeStreamId)
    activeStore = stream
      ? createValueStreamStore({ stream, persist: persistStream })
      : null
  }

  // Land on the active stream, or on home when there is none.
  const showActive = () => {
    buildActiveStore()
    screen = activeStore ? 'stream' : 'home'
  }

  // Take a whole workspace as the saved baseline: nothing in it is unsaved.
  const adopt = (workspace) => {
    base = {
      format: workspace.format,
      schemaVersion: workspace.schemaVersion,
      id: workspace.id,
    }
    streams = workspace.streams
    activeStreamId = workspace.activeStreamId
    revision = workspace.revision
    savedRevision = revision
    tokens = []
    showActive()
  }

  const load = async () => {
    status = 'loading'
    const started = replacements
    let loaded
    try {
      loaded = await loadWorkspace(repository, v1Repository)
    } catch {
      if (replacements !== started) return
      unreadable = {
        reason: UNREADABLE_MESSAGE,
        raw: null,
        backupFailed: false,
      }
      status = 'unreadable'
      return
    }
    // A workspace opened while this one loaded is the newer choice.
    if (replacements !== started) return
    if (loaded.unreadable) {
      unreadable = {
        reason: loaded.unreadable.reason,
        raw: loaded.raw ?? null,
        backupFailed: loaded.backupFailed === true,
      }
      status = 'unreadable'
      return
    }
    changes = loaded.changes
    adopt(loaded.workspace)
    unreadable = null
    status = 'ready'
  }

  // Loading again would swap the stored copy in over edits made since, so a
  // ready store, or one holding unsaved work, keeps what it has.
  const init = () => {
    if (status === 'ready' || hasUnsavedWork()) {
      return loading ?? Promise.resolve()
    }
    if (!loading) {
      loading = load().finally(() => {
        loading = null
      })
    }
    return loading
  }

  // Wrap an action so it refuses before the workspace is ready.
  const whenReady =
    (action) =>
    (...args) =>
      status === 'ready' ? action(...args) : refuse(NOT_READY_MESSAGE)

  const streamAt = (id) => streams.findIndex((stream) => stream.id === id)

  // `baseline` is for the first stream made at launch: it is part of the
  // starting point, so it is saved but never counts as unsaved.
  const create = whenReady((fields = {}, { baseline = false } = {}) => {
    const stream = createValueStream(fields)
    streams = [...streams, stream]
    if (baseline) {
      revision += 1
      savedRevision = revision
      enqueueSave()
    } else {
      commit()
    }
    return { ok: true, streamId: stream.id }
  })

  const open = whenReady((id) => {
    if (streamAt(id) === -1) return refuse(STREAM_MISSING_MESSAGE)
    activeStreamId = id
    showActive()
    enqueueSave()
    return { ok: true }
  })

  const goHome = whenReady(() => {
    screen = 'home'
    return { ok: true }
  })

  const rename = whenReady((id, name) => {
    const index = streamAt(id)
    if (index === -1) return refuse(STREAM_MISSING_MESSAGE)
    const trimmed = typeof name === 'string' ? name.trim() : ''
    if (!trimmed) return refuse(BLANK_NAME_MESSAGE)
    streams = replaceById(
      streams,
      touchValueStream(streams[index], { name: trimmed })
    )
    commit()
    // The open stream store holds its own copy, so it must start over from this
    // one or its next edit would write the old name back. Its undo history goes.
    if (id === activeStreamId) buildActiveStore()
    return { ok: true }
  })

  const duplicate = whenReady((id) => {
    const index = streamAt(id)
    if (index === -1) return refuse(STREAM_MISSING_MESSAGE)
    const copy = copyValueStream(streams[index], streams)
    streams = [
      ...streams.slice(0, index + 1),
      copy,
      ...streams.slice(index + 1),
    ]
    commit()
    return { ok: true, streamId: copy.id }
  })

  const remove = whenReady((id) => {
    const index = streamAt(id)
    if (index === -1) return refuse(STREAM_MISSING_MESSAGE)
    const token = { stream: streams[index], index }
    tokens = [...tokens, token]
    streams = streams.filter((stream) => stream.id !== id)
    if (id === activeStreamId) {
      activeStreamId = null
      showActive()
    }
    commit()
    return { ok: true, token }
  })

  const restore = whenReady((token) => {
    const taken = streams.some((stream) => stream.id === token?.stream.id)
    if (!tokens.includes(token) || taken)
      return refuse(NOTHING_TO_RESTORE_MESSAGE)
    tokens = tokens.filter((t) => t !== token)
    const at = Math.min(token.index, streams.length)
    streams = [...streams.slice(0, at), token.stream, ...streams.slice(at)]
    commit()
    return { ok: true, streamId: token.stream.id }
  })

  const importStream = whenReady((text) => {
    const result = importValueStream(
      text,
      streams.map((stream) => stream.id)
    )
    if (!result.ok) return refuse(result.error)
    streams = [...streams, result.stream]
    commit()
    return { ok: true, streamId: result.stream.id, changes: result.changes }
  })

  const exportStream = whenReady((id) => {
    const stream = streams.find((s) => s.id === id)
    return stream
      ? { ok: true, text: exportValueStream(stream) }
      : refuse(STREAM_MISSING_MESSAGE)
  })

  // Swap in a whole workspace (a file the user opened, or an empty start). It
  // becomes the saved baseline, so it fires no commit; the file it came from is
  // already the saved copy.
  const replaceWorkspace = (workspace) => {
    replacements += 1
    adopt(workspace)
    changes = []
    unreadable = null
    status = 'ready'
    enqueueSave()
  }

  const subscribeCommit = (listener) => {
    listeners = [...listeners, listener]
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  }

  return {
    get status() {
      return status
    },
    get unreadable() {
      return unreadable
    },
    get changes() {
      return changes
    },
    get streams() {
      return streams
    },
    get activeStreamId() {
      return activeStreamId
    },
    get activeStore() {
      return activeStore
    },
    get screen() {
      return screen
    },
    get revision() {
      return revision
    },
    get savedRevision() {
      return savedRevision
    },
    get saveError() {
      return saveError
    },
    snapshot,
    flushSaves: () => queue,
    subscribeCommit,
    init,
    create,
    open,
    goHome,
    rename,
    duplicate,
    remove,
    restore,
    importStream,
    exportStream,
    replaceWorkspace,
  }
}

export const workspaceStore = createWorkspaceStore({
  repository: createIndexedDbWorkspaceRepository({ dbName: DB_NAME }),
})
