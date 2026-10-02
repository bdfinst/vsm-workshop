import { isWholeMinutes } from './timeRangeValidator.js'
import { toResult } from './result.js'

/**
 * Validate one v2 rework path against the version's ordered steps.
 * @param {Object} path - A v2 rework path
 * @param {Object[]} steps - The version's steps, in order
 * @returns {{valid: boolean, errors: Object<string, string>}}
 */
export const validateReworkPath = (path, steps) => {
  const errors = {}
  const fromIndex = steps.findIndex((step) => step?.id === path.fromStepId)
  const toIndex = steps.findIndex((step) => step?.id === path.toStepId)

  if (fromIndex === -1) errors.fromStepId = 'Rework must start at a step'
  if (toIndex === -1) errors.toStepId = 'Rework must go to a step'
  if (fromIndex !== -1 && toIndex !== -1 && toIndex > fromIndex) {
    errors.toStepId = 'A rework path must go to the same step or an earlier one'
  }
  if (fromIndex !== -1 && steps[fromIndex]?.pctCA === 100) {
    errors.fromStepId = 'A step at 100% %C/A has no rework paths'
  }

  const share = path.shareOfRejects
  if (!isWholeMinutes(share) || share < 1 || share > 100) {
    errors.shareOfRejects = 'Share must be a whole number from 1 to 100'
  }

  const time = path.reworkProcessTime
  if (time != null && (!isWholeMinutes(time) || time < 0)) {
    errors.reworkProcessTime =
      'Rework process time must be a whole number of minutes, 0 or more'
  }

  return toResult(errors)
}

/**
 * Flag steps below 100% %C/A whose rework shares do not sum to 100.
 * This is a stage-5 completeness check, so it is separate from the
 * structural validators. Errors are keyed by step id.
 * @param {Object[]} steps - The version's steps
 * @param {Object[]} reworkPaths - The version's rework paths
 * @returns {{valid: boolean, errors: Object<string, string>}}
 */
export const validateReworkShares = (steps, reworkPaths) => {
  const errors = {}

  for (const step of steps) {
    if (typeof step.pctCA !== 'number' || step.pctCA >= 100) continue
    const total = reworkPaths
      .filter((path) => path.fromStepId === step.id)
      .reduce((sum, path) => sum + path.shareOfRejects, 0)
    if (total !== 100) {
      errors[step.id] = `Rework shares from ${step.name} must add up to 100`
    }
  }

  return toResult(errors)
}
