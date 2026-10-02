/**
 * The guided session's launch sequence, kept out of the components so it can be
 * tested without a browser. Later steps add reconnecting a linked file (11.3)
 * and attaching the unload guard (11.4) here.
 */

import { createWorkspace } from '../../models/v2/workspace.js'
import { importValueStream } from '../../persistence/v2/valueStreamJson.js'
import { refuse } from '../../models/v2/result.js'

/**
 * Create the lifecycle for one workspace store.
 * @param {Object} options
 * @param {Object} options.store - The workspace store
 * @returns {{start: function(): Promise<void>, startEmpty: function(): void,
 *   startFromImport: function(string): Object}} `start` runs the launch once;
 *   calling it again returns the same promise. `startEmpty` and
 *   `startFromImport` are the ways out of an unreadable workspace.
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

  return {
    start: () => {
      if (!launch) launch = run()
      return launch
    },
    // Leaves the unreadable screen for an empty workspace. The backup stays.
    startEmpty: () => {
      store.replaceWorkspace(createWorkspace())
      openFirstStream()
    },
    // Leaves the unreadable screen for a workspace holding the imported stream.
    startFromImport: (text) => {
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
