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
import {
  BLANK_NAME_MESSAGE,
  createValueStream,
  displayName,
  isBlankName,
  normalizeName,
} from '../../models/v2/valueStream.js'
import { refuse } from '../../models/v2/result.js'
import { createWorkspace } from '../../models/v2/workspace.js'
import {
  copyValueStream,
  touchValueStream,
} from '../../models/v2/valueStreamCopy.js'

export const NOT_READY_MESSAGE = 'The workspace is not ready yet'
export const STREAM_MISSING_MESSAGE = "That value stream isn't in the workspace"
export const NOTHING_TO_RESTORE_MESSAGE = 'Nothing to restore'
export const UNREADABLE_MESSAGE = "The saved workspace couldn't be read"
export const READ_FAILED_MESSAGE =
  "The saved workspace couldn't be read, so it is kept as it is. Try again."

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
  // { reason, raw, backupFailed, readFailed?, downloaded? } while status is
  // 'unreadable'. `raw` is the saved text as found, or null when it could not be
  // read at all. `downloaded` is set once the user has taken a copy of `raw`
  // this session. `readFailed` means the read itself failed (not the text), so
  // the working copy may be intact and nothing was backed up: it is treated as
  // an unsafe backup, and `replaceWorkspace` refuses until `init()` succeeds.
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
  let listeners = []
  // The token of the most recent removal: the one thing Undo can restore. It
  // lives here, not in a screen, so it outlasts a visit to another stream. A new
  // removal replaces it, and `adopt` clears it.
  let lastToken = $state.raw(null)
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
    queue = queue
      .then(() => repository.save(workspace))
      .then(
        () => {
          saveError = null
        },
        (error) => {
          saveError = error
        }
      )
  }

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
    if (!stored) return
    if (options?.navigation || options?.positionOnly) {
      const quiet = options.navigation
        ? {
            ...stored,
            session: stream.session,
            activeVersionId: stream.activeVersionId,
          }
        : { ...stream, updatedAt: stored.updatedAt }
      streams = replaceById(streams, quiet)
      enqueueSave()
      return
    }
    streams = replaceById(streams, touchValueStream(stream))
    commit()
  }

  // A new value stream store each time, so undo history is per stream. Each
  // store's `persist` is good only while it is the current one: a store that
  // was replaced (stream removed, workspace swapped, stream renamed) must not
  // write its older copy of the stream back over what replaced it.
  let builds = 0
  const buildActiveStore = () => {
    builds += 1
    const build = builds
    const stream = streams.find((s) => s.id === activeStreamId)
    activeStore = stream
      ? createValueStreamStore({
          stream,
          persist: (edited, options) => {
            if (build === builds) persistStream(edited, options)
          },
        })
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
    lastToken = null
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
        backupFailed: true,
        readFailed: true,
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
  // ready store keeps what it has. A store is not ready only until its first
  // successful load (or `replaceWorkspace`), so it cannot hold edits before
  // then. On an unreadable store this is also the retry.
  const init = () => {
    if (status === 'ready') return loading ?? Promise.resolve()
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
    if (isBlankName(name)) return refuse(BLANK_NAME_MESSAGE)
    streams = replaceById(
      streams,
      touchValueStream(streams[index], { name: normalizeName(name) })
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
    const wasActive = id === activeStreamId
    const token = { stream: streams[index], index, wasActive }
    lastToken = token
    streams = streams.filter((stream) => stream.id !== id)
    if (wasActive) {
      activeStreamId = null
      showActive()
    }
    commit()
    return { ok: true, token }
  })

  // Each removal gets one try: a restore that cannot work (the id is in use
  // again) drops its token, so Undo is over rather than offered again.
  const restore = whenReady((token) => {
    if (!token || token !== lastToken) return refuse(NOTHING_TO_RESTORE_MESSAGE)
    lastToken = null
    if (streams.some((stream) => stream.id === token.stream.id)) {
      return refuse(NOTHING_TO_RESTORE_MESSAGE)
    }
    const at = Math.min(token.index, streams.length)
    streams = [...streams.slice(0, at), token.stream, ...streams.slice(at)]
    // Undo puts back the active stream without leaving the screen it is on, but
    // never takes the place of a stream opened since.
    if (token.wasActive && activeStreamId === null) {
      activeStreamId = token.stream.id
      buildActiveStore()
    }
    commit()
    return { ok: true, streamId: token.stream.id }
  })

  const restoreLast = whenReady(() => restore(lastToken))

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

  // The upgrade notice shows what an import applied, in place of what was shown.
  const showChanges = (applied) => {
    changes = applied
  }

  const exportStream = whenReady((id) => {
    const stream = streams.find((s) => s.id === id)
    return stream
      ? { ok: true, text: exportValueStream(stream) }
      : refuse(STREAM_MISSING_MESSAGE)
  })

  // Swap in a whole workspace (a file the user opened, or an empty start). It
  // becomes the saved baseline, so it fires no commit; the file it came from is
  // already the saved copy.
  // It refuses while the saved workspace could not be read at all: the working
  // copy may be intact, and replacing it would destroy the only copy.
  // `changes` is what upgrading the workspace's content applied, for the notice.
  const replaceWorkspace = (workspace, { changes: applied = [] } = {}) => {
    if (unreadable?.readFailed === true) return refuse(READ_FAILED_MESSAGE)
    replacements += 1
    adopt(workspace)
    changes = applied
    unreadable = null
    status = 'ready'
    enqueueSave()
    return { ok: true }
  }

  // The user has taken a copy of the unreadable data, so it is safe to leave it.
  const markUnreadableDownloaded = () => {
    if (unreadable) unreadable = { ...unreadable, downloaded: true }
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
    markUnreadableDownloaded,
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
    // What Undo would restore: the removed stream's id and display name, or null.
    get lastRemoval() {
      return lastToken
        ? { streamId: lastToken.stream.id, name: displayName(lastToken.stream) }
        : null
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
    restoreLast,
    importStream,
    showChanges,
    exportStream,
    replaceWorkspace,
  }
}

export const workspaceStore = createWorkspaceStore({
  repository: createIndexedDbWorkspaceRepository({ dbName: DB_NAME }),
})
