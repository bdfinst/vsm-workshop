import { displayName } from '../../models/v2/valueStream.js'

// Characters Windows, macOS or Linux do not allow in a file name, and the
// device names and trailing dots and spaces Windows treats specially. See
// https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file
const INVALID_FILE_NAME_CHARACTERS = /[\\/:*?"<>|]/g

// Control characters, and the marks and overrides that reorder text, which can
// disguise a file's extension. They are removed, not replaced.
const HIDDEN_CHARACTERS =
  // eslint-disable-next-line no-control-regex -- the control range is the point
  /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069\ufeff]/g

// Windows drops dots and spaces at the end of a name.
const TRAILING_DOTS_AND_SPACES = /[. ]+$/

// Windows reserves these names, with any extension: "con.json" is the console.
const WINDOWS_DEVICE_NAME = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])$/i

// UTF-8 bytes, leaving room for "_" and ".json" inside the 255 bytes most file
// systems allow.
const MAX_NAME_BYTES = 245

const encoder = new TextEncoder()

// Whole code points that fit the byte budget, never splitting one.
const capBytes = (text) => {
  let bytes = 0
  let capped = ''
  for (const character of text) {
    bytes += encoder.encode(character).length
    if (bytes > MAX_NAME_BYTES) break
    capped += character
  }
  return capped
}

const isWindowsDevice = (name) =>
  WINDOWS_DEVICE_NAME.test(name.split('.')[0].trimEnd())

/**
 * The file name an exported value stream is saved under. Hidden and control
 * characters are removed, each character a file name cannot hold becomes "-"
 * (one for one), and the name is cut to 245 UTF-8 bytes with trailing dots and
 * spaces dropped. A Windows device name gets a "_" in front. A name that is
 * blank, or nothing but dots, falls back to the card's name.
 * @param {string} [name] - The value stream's name
 * @returns {string} The name with ".json" added
 */
export const exportFileName = (name) => {
  const shown = displayName({
    name: (name ?? '').replace(HIDDEN_CHARACTERS, ''),
  })
  const capped = capBytes(
    shown.replace(INVALID_FILE_NAME_CHARACTERS, '-')
  ).replace(TRAILING_DOTS_AND_SPACES, '')
  const base = capped || displayName({ name: '' })
  return `${isWindowsDevice(base) ? '_' : ''}${base}.json`
}
