/** @param {*} value @returns {boolean} True for a whole number of minutes */
export const isWholeMinutes = (value) => Number.isInteger(value)

/**
 * Validate a `{typ, min?, max?}` duration in whole minutes.
 * Unset (`null`/`undefined`) values pass: missing data is a stage status.
 * @param {{typ?: number|null, min?: number|null, max?: number|null}} range
 * @param {Object} options
 * @param {string} options.label - Name used in messages ("Process time")
 * @param {boolean} [options.positive=false] - Require values above 0 instead of 0 or more
 * @returns {string|null} An error message, or null when valid
 */
export const validateTimeRange = (range, { label, positive = false }) => {
  if (!range) return null

  const bound = positive ? 'above 0' : '0 or more'
  const inBounds = (value) =>
    isWholeMinutes(value) && (positive ? value > 0 : value >= 0)
  const { typ, min, max } = range

  if (typ != null && !inBounds(typ)) {
    return `${label} must be a whole number of minutes, ${bound}`
  }
  if (min != null && !inBounds(min)) {
    return `${label} min must be a whole number of minutes, ${bound}`
  }
  if (max != null && !inBounds(max)) {
    return `${label} max must be a whole number of minutes, ${bound}`
  }
  if (min != null && max != null && min > max) {
    return `${label} min must not be above the max`
  }
  if (typ != null && min != null && min > typ) {
    return `${label} min must not be above the typical value`
  }
  if (typ != null && max != null && max < typ) {
    return `${label} max must not be below the typical value`
  }
  return null
}
