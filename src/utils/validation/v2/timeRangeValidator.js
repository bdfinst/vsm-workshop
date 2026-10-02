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
    const entered = value != null && otherValue != null
    if (!found[field] && !found[other] && entered && breaks(value, otherValue))
      found[field] = message
  })
  return found
}

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
  return Object.values(rangeOrderErrors(range))[0] ?? null
}
