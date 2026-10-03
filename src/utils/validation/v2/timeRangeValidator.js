/** @param {*} value @returns {boolean} True for a whole number of minutes */
export const isWholeMinutes = (value) => Number.isInteger(value)

// Order matters: the first rule a field breaks is the one it shows.
const ORDER_RULES = Object.freeze([
  {
    field: 'min',
    other: 'typ',
    message: "Min can't be more than typical",
    breaks: (min, typ) => min > typ,
  },
  {
    field: 'max',
    other: 'typ',
    message: "Max can't be less than typical",
    breaks: (max, typ) => max < typ,
  },
  {
    field: 'min',
    other: 'max',
    message: "Min can't be more than max",
    breaks: (min, max) => min > max,
  },
])

/**
 * The ordering mistakes in a `{typ, min?, max?}` range, keyed by the field that
 * shows each. This is the one place the ordering wording and precedence live.
 * Values that are not entered (`null`/`undefined`) are not compared, so a
 * caller leaves out a value that already shows its own error. A field that has
 * an ordering error is not compared again, so one mistake does not produce a
 * second, misleading one.
 * @param {{typ?: number|null, min?: number|null, max?: number|null}} range - Values on one scale
 * @returns {{min?: string, max?: string}} The ordering errors, a field's first broken rule only
 */
export const rangeOrderErrors = (range) => {
  const found = {}
  ORDER_RULES.forEach(({ field, other, message, breaks }) => {
    const [value, otherValue] = [range[field], range[other]]
    const bothEntered = value != null && otherValue != null
    if (
      !found[field] &&
      !found[other] &&
      bothEntered &&
      breaks(value, otherValue)
    )
      found[field] = message
  })
  return found
}

/**
 * Whether one duration is in bounds: 0 or more, or more than 0 when it must be
 * positive. This is the one place the bound wording lives.
 * @param {string} name - What the value is called in the message ("Process time min")
 * @param {number} minutes - The value, in minutes
 * @param {boolean} mustBePositive - Require more than 0 instead of 0 or more
 * @returns {string|null} An error message, or null when in bounds
 */
export const boundError = (name, minutes, mustBePositive) => {
  if (mustBePositive) {
    return minutes > 0 ? null : `${name} must be more than 0`
  }
  return minutes < 0 ? `${name} can't be negative` : null
}

/**
 * Validate a `{typ, min?, max?}` duration in whole minutes.
 * Unset (`null`/`undefined`) values pass: missing data is a stage status.
 * @param {{typ?: number|null, min?: number|null, max?: number|null}} range
 * @param {Object} options
 * @param {string} options.label - Name used in messages ("Process time")
 * @param {boolean} [options.mustBePositive=false] - Require values above 0 instead of 0 or more
 * @returns {string|null} An error message, or null when valid
 */
export const validateTimeRange = (range, { label, mustBePositive = false }) => {
  if (!range) return null

  const wholeBound = mustBePositive ? 'above 0' : '0 or more'
  const valueError = (name, value) => {
    if (value == null) return null
    const notWhole = `${name} must be a whole number of minutes, ${wholeBound}`
    if (!Number.isFinite(value)) return notWhole
    return (
      boundError(name, value, mustBePositive) ??
      (isWholeMinutes(value) ? null : notWhole)
    )
  }

  const { typ, min, max } = range
  return (
    valueError(label, typ) ??
    valueError(`${label} min`, min) ??
    valueError(`${label} max`, max) ??
    Object.values(rangeOrderErrors(range))[0] ??
    null
  )
}
