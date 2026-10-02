import { STAGE_NAMES } from '../../models/v2/constants.js'
import { createWorkspace } from '../../models/v2/workspace.js'
import { isRecord } from '../validation/v2/result.js'
import { parseWorkspace } from '../../persistence/v2/workspaceCodec.js'
import { migrateV1Safely } from './migrateV1Safely.js'

/**
 * What to open at launch, decided from what is saved. Pure: it reads its two
 * arguments and does no storage, so every branch is a plain unit test.
 */

const EMPTY_LOAD = () => ({
  workspace: createWorkspace(),
  changes: [],
  unreadable: null,
})

// A v1 map is worth migrating when it has a step to carry over. A map with
// none would only add a noisy "Intake step added".
const hasV1Steps = (v1) =>
  isRecord(v1) && Array.isArray(v1.steps) && v1.steps.some(isRecord)

// A migrated map is already built, so it opens on Review with every stage reached.
const MIGRATED_SESSION = {
  activeStage: STAGE_NAMES.indexOf('Review') + 1,
  furthestStage: STAGE_NAMES.length,
}

// A v1 map that cannot be migrated is treated as nothing saved: the app opens
// empty rather than crashing on data it cannot read.
const fromV1 = (v1) => {
  const migrated = migrateV1Safely(v1)
  if (!migrated.ok) return EMPTY_LOAD()
  const { changes } = migrated
  const stream = { ...migrated.stream, session: { ...MIGRATED_SESSION } }
  const workspace = createWorkspace({
    streams: [stream],
    activeStreamId: stream.id,
  })
  return { workspace, changes, unreadable: null }
}

/**
 * Decide what the app opens with.
 *
 * - A readable saved workspace wins; the v1 map is ignored.
 * - Unreadable or newer saved data is reported with its reason and is never
 *   replaced by migrating the v1 map.
 * - With no saved workspace, a v1 map is migrated into the first stream.
 * - With neither, or a v1 map that cannot be migrated, the workspace is empty.
 * @param {?string} rawWorkspace - The saved workspace text, or null when none
 * @param {?Object} rawV1 - The saved v1 map as read from storage, or null when none
 * @returns {{workspace: ?Object, changes: string[], unreadable: ?{reason: string}}}
 *   `workspace` is null exactly when `unreadable` is set
 */
export const decideLoad = (rawWorkspace, rawV1) => {
  if (rawWorkspace !== null && rawWorkspace !== undefined) {
    const result = parseWorkspace(rawWorkspace)
    return result.ok
      ? { workspace: result.workspace, changes: [], unreadable: null }
      : { workspace: null, changes: [], unreadable: { reason: result.error } }
  }
  if (hasV1Steps(rawV1)) return fromV1(rawV1)
  return EMPTY_LOAD()
}
