import { serializeWorkspace } from './workspaceCodec.js'

/**
 * An async workspace repository that keeps everything in memory, for tests.
 * It has the same contract as the IndexedDB repository: `load` and
 * `loadBackup` give raw file text or null.
 * @param {Object} [options]
 * @param {?string} [options.raw] - Raw text to start with, even if it is not a valid workspace
 * @returns {Object} The repository
 */
export const createMemoryWorkspaceRepository = ({ raw = null } = {}) => {
  let saved = raw
  let backup = null

  return {
    load: async () => saved,
    save: async (workspace) => {
      saved = serializeWorkspace(workspace)
    },
    saveBackup: async (text) => {
      backup = text
    },
    loadBackup: async () => backup,
    isAvailable: async () => true,
    persisted: false,
  }
}
