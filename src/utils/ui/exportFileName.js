import { displayName } from '../../models/v2/valueStream.js'

// Characters Windows, macOS or Linux do not allow in a file name.
const INVALID_FILE_NAME_CHARACTERS = /[\\/:*?"<>|]/g

// Control characters, and the marks and overrides that reorder text, which can
// disguise a file's extension. They are removed, not replaced.
// eslint-disable-next-line no-control-regex
const HIDDEN_CHARACTERS = /[\u0000-\u001f\u007f-\u009f؜‎‏‪-‮⁦-⁩]/g

// Windows drops dots and spaces at the end of a name.
const TRAILING_DOTS_AND_SPACES = /[. ]+$/

// Windows reserves these names, with any extension: "con.json" is the console.
const WINDOWS_DEVICE_NAME = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])$/i

// Characters, leaving room for ".json" inside the 255 most file systems allow.
const MAX_NAME_LENGTH = 100

const isWindowsDevice = (name) =>
  WINDOWS_DEVICE_NAME.test(name.split('.')[0].trimEnd())

/**
 * The file name an exported value stream is saved under. Hidden and control
 * characters are removed, each character a file name cannot hold becomes "-"
 * (one for one), and the name is cut to 100 characters with trailing dots and
 * spaces dropped. A Windows device name gets a "_" in front. A name that is
 * blank, or nothing but dots, falls back to the card's name.
 * @param {string} [name] - The value stream's name
 * @returns {string} The name with ".json" added
 */
export const exportFileName = (name) => {
  const shown = displayName({
    name: (name ?? '').replace(HIDDEN_CHARACTERS, ''),
  })
  const capped = Array.from(shown.replace(INVALID_FILE_NAME_CHARACTERS, '-'))
    .slice(0, MAX_NAME_LENGTH)
    .join('')
    .replace(TRAILING_DOTS_AND_SPACES, '')
  const base = capped || displayName({ name: '' })
  return `${isWindowsDevice(base) ? '_' : ''}${base}.json`
}
