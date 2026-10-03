import { isRecord } from '../../utils/validation/v2/result.js'
import { STAGE_NAMES } from '../../models/v2/constants.js'
import { refuse } from '../../models/v2/result.js'
import { normalizeName } from '../../models/v2/valueStream.js'
import { migrateV1Safely } from '../../utils/migration/migrateV1Safely.js'
import {
  isNewerVersion,
  NEWER_VERSION_MESSAGE,
  parseJsonText,
} from './jsonText.js'
import { isValidStream } from './workspaceCodec.js'

/**
 * One value stream as a JSON file: export writes v2, import reads v1 or v2
 * and refuses with the same words as the workspace file.
 */

export const NOT_A_VALUE_STREAM_MESSAGE = "This isn't a VSM value stream file"
export const REWORK_FORWARD_MESSAGE =
  'Rework can only go back to an earlier step'

const STREAM_SCHEMA_VERSION = 2

// Whether any rework path points to a later step than it starts from. Reads
// defensively: a malformed stream is someone else's refusal, not a throw.
const hasForwardRework = (stream) =>
  Array.isArray(stream.versions) &&
  stream.versions.some((version) => {
    if (!isRecord(version)) return false
    const { steps, reworkPaths } = version
    if (!Array.isArray(steps) || !Array.isArray(reworkPaths)) return false
    const indexOf = (id) => steps.findIndex((step) => step?.id === id)
    return reworkPaths.some(
      (path) =>
        isRecord(path) &&
        indexOf(path.fromStepId) !== -1 &&
        indexOf(path.toStepId) > indexOf(path.fromStepId)
    )
  })

const isV1Map = (file) =>
  file.schemaVersion === undefined && Array.isArray(file.steps)

const readV2 = (file) => {
  if (hasForwardRework(file)) return refuse(REWORK_FORWARD_MESSAGE)
  return isValidStream(file)
    ? { ok: true, stream: file, changes: [] }
    : refuse(NOT_A_VALUE_STREAM_MESSAGE)
}

const readV1 = (file) => {
  const migrated = migrateV1Safely(file)
  return migrated.ok ? migrated : refuse(NOT_A_VALUE_STREAM_MESSAGE)
}

// A stage number from a file, which can hold anything: kept when it is a whole
// number in range, pulled to the nearest end when it is a number past one, and
// the first stage when it is not a whole number at all.
const inRangeStage = (stage) =>
  Number.isInteger(stage) ? Math.min(Math.max(stage, 1), STAGE_NAMES.length) : 1

const readableTime = (time, fallback) =>
  typeof time === 'string' && !Number.isNaN(Date.parse(time)) ? time : fallback

// The fields the home screen reads, which the structural check leaves open, so
// a card never shows a stage that does not exist or a time that is not one.
// Time that cannot be read becomes the time of the import. The name is
// normalized, as it is for a value stream made in the app.
const withReadableFields = (stream) => {
  const activeStage = inRangeStage(stream.session.activeStage)
  const furthestStage = Math.max(
    inRangeStage(stream.session.furthestStage),
    activeStage
  )
  const now = new Date().toISOString()
  return {
    ...stream,
    name: normalizeName(stream.name),
    session: { ...stream.session, activeStage, furthestStage },
    createdAt: readableTime(stream.createdAt, now),
    updatedAt: readableTime(stream.updatedAt, now),
  }
}

/**
 * Read a value stream file, v1 or v2. A v1 map is migrated. When the stream's
 * id is already in the workspace it gets a new one, so importing never
 * replaces a stream. A stage outside 1-7 is brought into range and a time that
 * cannot be read is replaced with the time of the import.
 * @param {string} text - The file content
 * @param {Iterable<string>} existingIds - Ids of the streams already in the workspace
 * @returns {{ok: true, stream: Object, changes: string[]} | {ok: false, error: string}}
 *   `changes` lists what migrating a v1 file applied; it is empty for v2
 */
export const importValueStream = (text, existingIds) => {
  const json = parseJsonText(text)
  if (!json.ok) return json

  const file = json.value
  if (!isRecord(file)) return refuse(NOT_A_VALUE_STREAM_MESSAGE)
  if (isNewerVersion(file.schemaVersion, STREAM_SCHEMA_VERSION)) {
    return refuse(NEWER_VERSION_MESSAGE)
  }

  let result = refuse(NOT_A_VALUE_STREAM_MESSAGE)
  if (file.schemaVersion === STREAM_SCHEMA_VERSION) result = readV2(file)
  else if (isV1Map(file)) result = readV1(file)
  if (!result.ok) return result

  const taken = new Set(existingIds)
  const readable = withReadableFields(result.stream)
  const stream = taken.has(readable.id)
    ? { ...readable, id: crypto.randomUUID() }
    : readable
  return { ...result, stream }
}

/**
 * Write a value stream as JSON file text. The stream is not changed.
 * @param {Object} stream - A v2 value stream
 * @returns {string} The file content
 */
export const exportValueStream = (stream) => JSON.stringify(stream, null, 2)
