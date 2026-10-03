import { displayName } from '../../models/v2/valueStream.js'

// Characters Windows, macOS or Linux do not allow in a file name.
const INVALID_FILE_NAME_CHARACTERS = /[\\/:*?"<>|]/g

/**
 * The file name an exported value stream is saved under. Each character a
 * file name cannot hold becomes "-", one for one: nothing is collapsed or
 * trimmed. A blank name falls back to the card's name.
 * @param {string} [name] - The value stream's name
 * @returns {string} The name with ".json" added
 */
export const exportFileName = (name) =>
  `${displayName({ name: name ?? '' }).replace(INVALID_FILE_NAME_CHARACTERS, '-')}.json`
