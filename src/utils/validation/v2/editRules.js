import { LAST_STAGE, VERSION_KIND } from '../../../models/v2/constants.js'

/**
 * Rules for editing a v2 stream that `validateVersion` does not state as
 * messages: what a move, a delete, a rework target or a stage change may do.
 * Each check is pure and returns an error message, or null when the edit is
 * allowed. The value stream store runs them before it validates the result.
 */

export const INTAKE_FIRST_MESSAGE = 'Intake is always first'
export const INTAKE_DELETE_MESSAGE = "Intake can't be deleted"
export const REWORK_FORWARD_MESSAGE =
  'Rework can only go back to an earlier step'
export const MOVE_WOULD_POINT_FORWARD_MESSAGE =
  'A rework path would point forward — remove or change it first'
export const STEP_MISSING_MESSAGE = 'That step no longer exists'
export const VERSION_MISSING_MESSAGE = 'That version no longer exists'
export const CURRENT_DELETE_MESSAGE = "The current state can't be deleted"
export const STAGE_MISSING_MESSAGE = "That stage doesn't exist"
export const STAGE_AHEAD_MESSAGE = 'Finish the earlier stages first'
export const PATH_MISSING_MESSAGE = 'That rework path no longer exists'

const indexOfStep = (steps, id) => steps.findIndex((step) => step.id === id)

// Whether any path goes to a later step than it starts from. A path whose
// ends are not steps is not "forward": validateVersion reports that.
const anyPathPointsForward = (steps, reworkPaths) =>
  reworkPaths.some((path) => {
    const from = indexOfStep(steps, path.fromStepId)
    const to = indexOfStep(steps, path.toStepId)
    return from !== -1 && to > from
  })

/**
 * Whether a rework path may go where it does. Rework goes back to an earlier
 * step (or the same one), never forward.
 * @param {Object[]} steps - The version's steps, in order
 * @param {{fromStepId: string, toStepId: string}} path - The path being added or changed
 * @returns {?string} An error message, or null
 */
export const checkReworkDirection = (steps, path) =>
  anyPathPointsForward(steps, [path]) ? REWORK_FORWARD_MESSAGE : null

/**
 * Whether a step may move to a position. Intake stays first, nothing goes
 * above it, and no existing rework path may end up pointing forward.
 * @param {Object[]} steps - The version's steps, in order
 * @param {Object[]} reworkPaths - The version's rework paths
 * @param {string} stepId - The step to move
 * @param {number} toIndex - Its position after the move
 * @returns {?string} An error message, or null
 */
export const checkMove = (steps, reworkPaths, stepId, toIndex) => {
  const fromIndex = indexOfStep(steps, stepId)
  if (fromIndex === -1) return STEP_MISSING_MESSAGE
  if (fromIndex === 0 || toIndex === 0) return INTAKE_FIRST_MESSAGE
  if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= steps.length) {
    return "That position isn't in the list"
  }

  const moved = [...steps]
  moved.splice(toIndex, 0, ...moved.splice(fromIndex, 1))
  return anyPathPointsForward(moved, reworkPaths)
    ? MOVE_WOULD_POINT_FORWARD_MESSAGE
    : null
}

/**
 * Whether a step may be deleted. Intake is the locked first step.
 * @param {Object[]} steps - The version's steps, in order
 * @param {string} stepId - The step to delete
 * @returns {?string} An error message, or null
 */
export const checkDeleteStep = (steps, stepId) => {
  const index = indexOfStep(steps, stepId)
  if (index === -1) return STEP_MISSING_MESSAGE
  return index === 0 ? INTAKE_DELETE_MESSAGE : null
}

/**
 * Whether a version may be deleted. The current state stays.
 * @param {Object[]} versions - The stream's versions
 * @param {string} versionId - The version to delete
 * @returns {?string} An error message, or null
 */
export const checkDeleteVersion = (versions, versionId) => {
  const version = versions.find((v) => v.id === versionId)
  if (!version) return VERSION_MISSING_MESSAGE
  return version.kind === VERSION_KIND.CURRENT ? CURRENT_DELETE_MESSAGE : null
}

/**
 * Whether the session may go to a stage: one of the seven, and no further
 * than one past the furthest stage reached.
 * @param {{furthestStage: number}} session - The stream's session
 * @param {number} stage - The stage to go to (1 to 7)
 * @returns {?string} An error message, or null
 */
export const checkStageChange = (session, stage) => {
  if (!Number.isInteger(stage) || stage < 1 || stage > LAST_STAGE) {
    return STAGE_MISSING_MESSAGE
  }
  return stage > session.furthestStage + 1 ? STAGE_AHEAD_MESSAGE : null
}
