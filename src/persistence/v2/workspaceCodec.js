import { VERSION_KIND } from '../../models/v2/constants.js'
import { isRecord } from '../../utils/validation/v2/result.js'
import { validateVersion } from '../../utils/validation/v2/versionValidator.js'
import {
  isNewerVersion,
  NEWER_VERSION_MESSAGE,
  parseJsonText,
} from './jsonText.js'

/**
 * The workspace file: reading it, checking its structure and writing it.
 * Structure only (types, Intake first, no forward rework). Whether a stream
 * is complete is a stage status, not a reason to refuse the file.
 */

export const WORKSPACE_FORMAT = 'vsm-workspace'
export const WORKSPACE_SCHEMA_VERSION = 1
export const NOT_A_WORKSPACE_MESSAGE = "This isn't a VSM workspace file"

const STREAM_SCHEMA_VERSION = 2

const isValidVersions = (versions, activeVersionId) =>
  Array.isArray(versions) &&
  versions.length > 0 &&
  versions.every(isRecord) &&
  versions.every((version) => validateVersion(version, versions).valid) &&
  versions.filter((version) => version.kind === VERSION_KIND.CURRENT).length ===
    1 &&
  versions.some((version) => version.id === activeVersionId)

/**
 * Whether a value is a structurally valid v2 value stream (the same check the
 * workspace file applies to each of its streams).
 * @param {*} stream - A parsed value stream
 * @returns {boolean}
 */
export const isValidStream = (stream) =>
  isRecord(stream) &&
  stream.schemaVersion === STREAM_SCHEMA_VERSION &&
  typeof stream.id === 'string' &&
  typeof stream.name === 'string' &&
  isRecord(stream.session) &&
  isValidVersions(stream.versions, stream.activeVersionId)

const hasUniqueIds = (streams) =>
  new Set(streams.map((stream) => stream.id)).size === streams.length

const isValidWorkspace = (workspace) =>
  typeof workspace.id === 'string' &&
  Number.isInteger(workspace.revision) &&
  workspace.revision >= 0 &&
  (workspace.savedAt === undefined || typeof workspace.savedAt === 'string') &&
  Array.isArray(workspace.streams) &&
  workspace.streams.every(isValidStream) &&
  hasUniqueIds(workspace.streams) &&
  (workspace.activeStreamId === null ||
    workspace.streams.some((stream) => stream.id === workspace.activeStreamId))

/**
 * Read a workspace file. Any problem refuses the whole file, so one invalid
 * stream never yields a partly read workspace.
 * @param {string} text - The file content
 * @returns {{ok: true, workspace: Object} | {ok: false, error: string}}
 */
export const parseWorkspace = (text) => {
  const json = parseJsonText(text)
  if (!json.ok) return json

  const workspace = json.value
  if (!isRecord(workspace) || workspace.format !== WORKSPACE_FORMAT) {
    return { ok: false, error: NOT_A_WORKSPACE_MESSAGE }
  }
  if (isNewerVersion(workspace.schemaVersion, WORKSPACE_SCHEMA_VERSION)) {
    return { ok: false, error: NEWER_VERSION_MESSAGE }
  }
  if (
    workspace.schemaVersion !== WORKSPACE_SCHEMA_VERSION ||
    !isValidWorkspace(workspace)
  ) {
    return { ok: false, error: NOT_A_WORKSPACE_MESSAGE }
  }
  return { ok: true, workspace }
}

/**
 * Write a workspace as file text, stamping `savedAt`. The workspace passed in
 * is not changed.
 * @param {Object} workspace - The workspace
 * @param {Date} [now] - The time of writing
 * @returns {string} The file content
 */
export const serializeWorkspace = (workspace, now = new Date()) =>
  JSON.stringify({ ...workspace, savedAt: now.toISOString() }, null, 2)
