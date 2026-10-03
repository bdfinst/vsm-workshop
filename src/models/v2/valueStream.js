import { createMapVersion } from './mapVersion.js'
import { refuse } from './result.js'

/**
 * Create a v2 value stream at stage 1 with one active current version. The name
 * is kept normalized, as everywhere else.
 * @param {Object} [overrides] - Fields to override
 * @returns {Object} A new value stream
 */
export const createValueStream = (overrides = {}) => {
  const versions = overrides.versions ?? [createMapVersion()]
  const now = new Date().toISOString()

  return {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    name: '',
    description: '',
    trigger: '',
    endPoint: '',
    unitOfWork: null,
    workdayHours: 8,
    versions,
    activeVersionId: versions[0].id,
    session: { activeStage: 1, furthestStage: 1 },
    createdAt: now,
    updatedAt: now,
    ...overrides,
    name: normalizeName(overrides.name),
  }
}

/** What a value stream with no name is listed as. */
export const UNTITLED_NAME = 'Untitled value stream'

/** Shown when a name is edited to blank, which is never allowed. */
export const BLANK_NAME_MESSAGE = 'Add a name'

/**
 * The one rule for a value stream's name: surrounding space does not count.
 * @param {*} name - What was typed or stored
 * @returns {string} The trimmed text, or '' when it is not text
 */
export const normalizeName = (name) =>
  typeof name === 'string' ? name.trim() : ''

/**
 * Whether a name is empty once normalized. A new value stream starts blank; an
 * edit to blank is what is refused.
 * @param {*} name - What was typed or stored
 * @returns {boolean} True when there is no name
 */
export const isBlankName = (name) => normalizeName(name) === ''

/**
 * The one name-edit operation, for the home rename and the header field alike.
 * Typing a blank name is refused, even over an unnamed stream; surrounding
 * space does not count as a change.
 * @param {string} current - The name the stream has now
 * @param {*} typed - What was typed
 * @returns {{ok: false, error: string} | {ok: true, name: string, changed: boolean}}
 *   The refusal, or the normalized name and whether it differs from `current`
 */
export const nameEdit = (current, typed) => {
  const name = normalizeName(typed)
  if (name === '') return refuse(BLANK_NAME_MESSAGE)
  return { ok: true, name, changed: name !== normalizeName(current) }
}

/**
 * What a name is listed as.
 * @param {*} name - What was typed or stored
 * @returns {string} The normalized name, or "Untitled value stream" when blank
 */
export const nameOrUntitled = (name) => normalizeName(name) || UNTITLED_NAME

/**
 * The name a value stream is listed by.
 * @param {{name: string}} stream - A value stream
 * @returns {string} The trimmed name, or "Untitled value stream" when blank
 */
export const displayName = (stream) => nameOrUntitled(stream.name)
