import { STEP_KIND } from '../../models/v2/constants.js'

const hasText = (value) => typeof value === 'string' && value.trim() !== ''

const isEntered = (value) => value !== null && value !== undefined

// A time range holds typ, and perhaps min and max; any of them is data.
const hasRangeValue = (range) => Object.values(range ?? {}).some(isEntered)

const TIME_FIELDS = ['processTime', 'waitTime', 'elapsedTime']

/**
 * Whether any time is entered. These are the values a kind switch discards.
 * @param {Object} row - A step row from rowModel
 * @returns {boolean}
 */
export const hasTimeData = (row) =>
  TIME_FIELDS.some((field) => hasRangeValue(row[field]))

/**
 * Whether the step holds anything beyond its name. The handoff flag is not
 * counted: an outside step has it set for the user.
 * @param {Object} row - A step row from rowModel
 * @returns {boolean}
 */
export const hasStepData = (row) =>
  hasText(row.description) ||
  hasText(row.performedBy) ||
  hasText(row.notes) ||
  isEntered(row.pctCA) ||
  hasTimeData(row)

/**
 * How many rework paths start or end at the step; deleting it removes them.
 * @param {{fromStepId: string, toStepId: string}[]} paths - The version's paths
 * @param {string} stepId - The step's id
 * @returns {number}
 */
export const countReworkPathsOf = (paths, stepId) =>
  paths.filter(({ fromStepId, toStepId }) =>
    [fromStepId, toStepId].includes(stepId)
  ).length

/**
 * Whether deleting the step should ask first.
 * @param {Object} row - A step row from rowModel
 * @param {number} pathCount - `countReworkPathsOf` for the step
 * @returns {boolean}
 */
export const needsDeleteConfirm = (row, pathCount) =>
  hasStepData(row) || pathCount > 0

/**
 * The question asked before a delete.
 * @param {string} label - The step's name, or a stand-in
 * @param {number} pathCount - Rework paths that would go with it
 * @returns {string}
 */
export const deleteConfirmMessage = (label, pathCount) => {
  const question = `Delete ${label}?`
  if (pathCount === 0) return question
  const noun = pathCount === 1 ? 'path' : 'paths'
  return `${question} ${pathCount} rework ${noun} will be removed.`
}

/**
 * The question asked before a kind switch that clears times.
 * @param {string} label - The step's name, or a stand-in
 * @param {string} toKind - STEP_KIND.OUTSIDE or STEP_KIND.TEAM
 * @returns {string}
 */
export const kindSwitchMessage = (label, toKind) =>
  toKind === STEP_KIND.OUTSIDE
    ? `Switch ${label} to outside? Its process time and wait time will be cleared.`
    : `Switch ${label} to a team step? Its elapsed time will be cleared.`
