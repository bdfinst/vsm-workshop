import { browserDownload } from '../../infrastructure/v2/browserDownload.js'
import { displayName } from '../../models/v2/valueStream.js'
import { exportFileName } from './exportFileName.js'

export const READ_ERROR_MESSAGE =
  "That file couldn't be read. Try another file."

/**
 * Add the value stream in a chosen file to the workspace. The workspace is not
 * changed when the file cannot be read or is refused.
 * @param {{text: function(): Promise<string>}} file - The chosen file
 * @param {{importStream: function(string): Object}} store - The workspace store
 * @returns {Promise<{ok: true, streamId: string, name: string} | {ok: false, error: string}>}
 */
export const importStreamFile = async (file, store) => {
  let text
  try {
    text = await file.text()
  } catch {
    return { ok: false, error: READ_ERROR_MESSAGE }
  }
  const result = store.importStream(text)
  if (!result.ok) return result
  const stream = store.streams.find((s) => s.id === result.streamId)
  return { ok: true, streamId: result.streamId, name: displayName(stream) }
}

/**
 * Hand one value stream to the browser as a "<name>.json" download.
 * @param {{exportStream: function(string): Object}} store - The workspace store
 * @param {string} id - The value stream's id
 * @param {string} name - The value stream's name
 * @returns {{ok: boolean, error?: string}}
 */
export const exportStreamFile = (store, id, name) => {
  const result = store.exportStream(id)
  if (result.ok) browserDownload(exportFileName(name), result.text)
  return result
}
