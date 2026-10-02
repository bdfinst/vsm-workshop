import { isValidStream } from '../../persistence/v2/workspaceCodec.js'
import { migrateV1ToV2 } from './v1ToV2.js'

/**
 * Migrate a v1 map that came from outside the app (a saved key or a file).
 * Such data can hold anything, so a map that cannot be read, or that does not
 * migrate to a valid stream, is a refusal and never an exception.
 * @param {Object} v1 - A v1 map
 * @returns {{ok: true, stream: Object, changes: string[]} | {ok: false}}
 */
export const migrateV1Safely = (v1) => {
  try {
    const { stream, changes } = migrateV1ToV2(v1)
    return isValidStream(stream) ? { ok: true, stream, changes } : { ok: false }
  } catch {
    return { ok: false }
  }
}
