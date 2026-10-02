/**
 * The guided session's launch sequence, kept out of the components so it can be
 * tested without a browser. Later steps add reconnecting a linked file (11.3)
 * and attaching the unload guard (11.4) here.
 */

import { createWorkspace } from '../../models/v2/workspace.js'
import { importValueStream } from '../../persistence/v2/valueStreamJson.js'
import { refuse } from '../../models/v2/result.js'

export const BACKUP_FIRST_MESSAGE =
  "Your unreadable data isn't backed up yet. Download it first."

/**
 * Create the lifecycle for one workspace store.
 * @param {Object} options
 * @param {Object} options.store - The workspace store
 * @returns {{start: function(): Promise<void>, startEmpty: function(): Object,
 *   startFromImport: function(string): Object,
 *   exitBlockedReason: function(): ?string,
 *   noteUnreadableDownloaded: function(): void}} `start` runs the launch once;
 *   calling it again returns the same promise. `startEmpty` and
 *   `startFromImport` are the ways out of an unreadable workspace; both refuse
 *   while `exitBlockedReason` gives a reason. Leaving replaces the working
 *   copy, so when the unreadable data could not be backed up, that copy is the
 *   only one: leaving waits until the user has downloaded it.
 */
export const createGuidedLifecycle = ({ store }) => {
  let launch = null

  // The first stream is part of the starting point: saved, never unsaved.
  const openFirstStream = () => {
    const created = store.create({}, { baseline: true })
    if (created.ok) store.open(created.streamId)
  }

  // Nothing is created until the workspace has loaded and is ready. An empty
  // workspace gets one first stream. A saved one opens as the load left it: on
  // its active stream, at that stream's `session.activeStage`.
  const run = async () => {
    await store.init()
    if (store.status !== 'ready' || store.streams.length > 0) return
    openFirstStream()
  }

  const exitBlockedReason = () => {
    const unreadable = store.unreadable
    const mustDownload =
      unreadable?.backupFailed === true &&
      unreadable.raw !== null &&
      !unreadable.downloaded
    return mustDownload ? BACKUP_FIRST_MESSAGE : null
  }

  return {
    exitBlockedReason,
    noteUnreadableDownloaded: () => store.markUnreadableDownloaded(),
    start: () => {
      if (!launch) launch = run()
      return launch
    },
    // Leaves the unreadable screen for an empty workspace. The backup stays.
    startEmpty: () => {
      const blocked = exitBlockedReason()
      if (blocked) return refuse(blocked)
      store.replaceWorkspace(createWorkspace())
      openFirstStream()
      return { ok: true }
    },
    // Leaves the unreadable screen for a workspace holding the imported stream.
    startFromImport: (text) => {
      const blocked = exitBlockedReason()
      if (blocked) return refuse(blocked)
      const result = importValueStream(text, [])
      if (!result.ok) return refuse(result.error)
      store.replaceWorkspace(
        createWorkspace({
          streams: [result.stream],
          activeStreamId: result.stream.id,
        })
      )
      return { ok: true }
    },
  }
}
