import { browserDownload } from '../../infrastructure/v2/browserDownload.js'
import { displayName } from '../../models/v2/valueStream.js'
import { exportFileName } from './exportFileName.js'

export const READ_ERROR_MESSAGE =
  "That file couldn't be read. Try another file."

// The limit and the words of the other file imports.
export const MAX_FILE_BYTES = 10 * 1000 * 1000
export const FILE_TOO_LARGE_MESSAGE =
  'File is too large. Please select a file under 10 MB.'

/**
 * Add the value stream in a chosen file to the workspace. The workspace is not
 * changed when the file cannot be read or is refused.
 * A file over 10 MB is refused without being read. `changes` is what upgrading
 * a v1 file applied, for the upgrade notice.
 * @param {{size: number, text: function(): Promise<string>}} file - The chosen file
 * @param {{importStream: function(string): Object}} store - The workspace store
 * @returns {Promise<{ok: true, streamId: string, name: string, changes: string[]} | {ok: false, error: string}>}
 */
export const importStreamFile = async (file, store) => {
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: FILE_TOO_LARGE_MESSAGE }
  }
  let text
  try {
    text = await file.text()
  } catch {
    return { ok: false, error: READ_ERROR_MESSAGE }
  }
  const result = store.importStream(text)
  if (!result.ok) return result
  const stream = store.streams.find((s) => s.id === result.streamId)
  return {
    ok: true,
    streamId: result.streamId,
    name: displayName(stream),
    changes: result.changes,
  }
}

/**
 * Hand one value stream to the browser as a "<name>.json" download, named as
 * the stream is listed.
 * @param {{streams: Object[], exportStream: function(string): Object}} store - The workspace store
 * @param {string} id - The value stream's id
 * @param {Object} [deps] - Replaceable in tests
 * @param {function(string, string): void} [deps.download] - Saves text under a file name
 * @returns {{ok: boolean, error?: string}}
 */
export const exportStreamFile = (
  store,
  id,
  { download = browserDownload } = {}
) => {
  const result = store.exportStream(id)
  if (!result.ok) return result
  const stream = store.streams.find((s) => s.id === id)
  download(exportFileName(displayName(stream)), result.text)
  return result
}
