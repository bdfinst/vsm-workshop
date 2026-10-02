/**
 * Create an empty v2 workspace: the document that holds every value stream.
 * `savedAt` is left out; it is stamped when the workspace is written.
 * The format name and schema version are the ones `workspaceCodec` reads.
 * @param {Object} [overrides] - Fields to override
 * @returns {Object} A new workspace with no value streams
 */
export const createWorkspace = (overrides = {}) => ({
  format: 'vsm-workspace',
  schemaVersion: 1,
  id: crypto.randomUUID(),
  streams: [],
  activeStreamId: null,
  revision: 0,
  ...overrides,
})
