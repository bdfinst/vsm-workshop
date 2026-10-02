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
  const isNegative = (value) =>
    !positive && typeof value === 'number' && value < 0
  const badValue = (name, value) =>
    isNegative(value)
      ? `${name} can't be negative`
      : `${name} must be a whole number of minutes, ${bound}`

  if (typ != null && !inBounds(typ)) return badValue(label, typ)
  if (min != null && !inBounds(min)) return badValue(`${label} min`, min)
  if (max != null && !inBounds(max)) return badValue(`${label} max`, max)
  if (min != null && max != null && min > max) {
    return "Min can't be more than max"
  }
  if (typ != null && min != null && min > typ) {
    return "Min can't be more than typical"
  }
  if (typ != null && max != null && max < typ) {
    return "Max can't be less than typical"
  }
  return null
}
