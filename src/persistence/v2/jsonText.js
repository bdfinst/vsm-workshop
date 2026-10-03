/**
 * The JSON error mapping shared by the workspace file (`workspaceCodec`) and
 * the single value stream file (`valueStreamJson`). The messages are what
 * the user sees, so both file kinds refuse with the same words.
 */

import { refuse } from '../../models/v2/result.js'

export const INVALID_JSON_MESSAGE = "This file isn't valid JSON"
export const NEWER_VERSION_MESSAGE =
  'This file was made by a newer version of the app'

/**
 * Parse JSON text without throwing.
 * @param {*} text - The file content; anything but text is not JSON
 * @returns {{ok: true, value: *} | {ok: false, error: string}}
 */
export const parseJsonText = (text) => {
  if (typeof text !== 'string') return refuse(INVALID_JSON_MESSAGE)
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return refuse(INVALID_JSON_MESSAGE)
  }
}

/**
 * Whether a file's `schemaVersion` is above what this app reads.
 * @param {*} schemaVersion - The file's `schemaVersion`
 * @param {number} supported - The highest version this app reads
 * @returns {boolean}
 */
export const isNewerVersion = (schemaVersion, supported) =>
  typeof schemaVersion === 'number' && schemaVersion > supported
