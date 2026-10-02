/**
 * The guided session's launch sequence, kept out of the components so it can be
 * tested without a browser. Later steps add reconnecting a linked file (11.3)
 * and attaching the unload guard (11.4) here.
 */

/**
 * Create the lifecycle for one workspace store.
 * @param {Object} options
 * @param {Object} options.store - The workspace store
 * @returns {{start: function(): Promise<void>}} `start` runs the launch once;
 *   calling it again returns the same promise
 */
export const createGuidedLifecycle = ({ store }) => {
  let launch = null

  // Nothing is created until the workspace has loaded and is ready. An empty
  // workspace gets one first stream, as the saved baseline, and opens on it.
  const run = async () => {
    await store.init()
    if (store.status !== 'ready' || store.streams.length > 0) return
    const created = store.create({}, { baseline: true })
    if (created.ok) store.open(created.streamId)
  }

  return {
    start: () => {
      if (!launch) launch = run()
      return launch
    },
  }
}
