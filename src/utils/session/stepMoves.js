import { INTAKE_FIRST_MESSAGE } from '../validation/v2/editRules.js'

export const MOVE_UP = -1
export const MOVE_DOWN = 1

const LAST_STEP_MESSAGE = 'This is the last step'
const FIRST_AFTER_INTAKE = 1

/**
 * Why a step's Move button is unavailable, or null when it works. This only
 * covers the list's ends; the value stream store still decides every move.
 * @param {number} index - The step's 0-based position, Intake being 0
 * @param {number} count - How many steps the list has
 * @param {number} direction - MOVE_UP or MOVE_DOWN
 * @returns {?string} The reason, or null
 */
export const moveBlockReason = (index, count, direction) => {
  if (direction === MOVE_UP && index <= FIRST_AFTER_INTAKE) {
    return INTAKE_FIRST_MESSAGE
  }
  if (direction === MOVE_DOWN && index >= count - 1) return LAST_STEP_MESSAGE
  return null
}

/**
 * What screen readers hear after a move.
 * @param {string} name - The moved step's name
 * @param {number} toIndex - Its new 0-based position
 * @returns {string} For example "Development moved to position 3"
 */
export const movedAnnouncement = (name, toIndex) =>
  `${name.trim() || 'Unnamed step'} moved to position ${toIndex + 1}`
