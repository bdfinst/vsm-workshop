const MINUTES_PER_HOUR = 60
const EN_DASH = '–'
const NOT_A_NUMBER = Object.freeze({ error: 'Enter a number' })

/**
 * The one place a number is rounded: half up (away from zero), to `decimals`
 * places, judged on the decimal digits the number prints with. Scaling by a
 * power of ten in binary would round 1.005 down, because 1.005 * 100 is
 * 100.49999999999999; shifting the decimal exponent as text does not.
 */
const roundTo = (value, decimals) => {
  const [mantissa, exponent] = Math.abs(value).toExponential().split('e')
  const shifted = Math.round(
    Number(`${mantissa}e${Number(exponent) + decimals}`)
  )
  // Adding 0 turns a negative zero into 0
  return Math.sign(value) * (shifted / 10 ** decimals) + 0
}

const assertFiniteNumber = (value) => {
  if (!Number.isFinite(value)) {
    throw new TypeError(
      `Expected a finite number, got ${JSON.stringify(value) ?? value}. Check for an incomplete figure first.`
    )
  }
  return value
}

const fixed = (value, decimals) => roundTo(value, decimals).toFixed(decimals)

const workdayMinutes = (workdayHours) => {
  if (!Number.isFinite(workdayHours) || workdayHours <= 0) {
    throw new RangeError(
      `workdayHours must be a positive number, got ${workdayHours}`
    )
  }
  return workdayHours * MINUTES_PER_HOUR
}

const minutesPerUnit = (unit, workdayHours) => {
  if (unit === 'minutes') return 1
  if (unit === 'hours') return MINUTES_PER_HOUR
  if (unit === 'days') return workdayMinutes(workdayHours)
  throw new RangeError(`Unknown duration unit: ${unit}`)
}

// Under one working day shows hours, from one working day shows days.
const durationParts = (minutes, workdayHours) => {
  assertFiniteNumber(minutes)
  const unit = minutes < workdayMinutes(workdayHours) ? 'hours' : 'days'
  return {
    unit,
    amount: fixed(minutes / minutesPerUnit(unit, workdayHours), 1),
  }
}

const partsText = ({ amount, unit }) => `${amount} ${unit}`

/**
 * Format minutes as hours (under one working day) or working days.
 * A working day is `workdayHours` long, so the same minutes read differently
 * with a different day length; the stored minutes never change.
 * @param {number} minutes - Duration in minutes
 * @param {number} workdayHours - Length of a working day in hours
 * @returns {string} For example "3.5 hours" or "18.8 days"
 * @throws {RangeError} When workdayHours is not a positive number
 * @throws {TypeError} When minutes is not a finite number (for example an incomplete figure)
 */
export const formatDuration = (minutes, workdayHours) => {
  return partsText(durationParts(minutes, workdayHours))
}

/**
 * Format a `{ low, high }` minutes range, for example "15.8–22.8 days".
 * Shows a single value when both ends display the same.
 * @param {{low: number, high: number}} range - Range in minutes
 * @param {number} workdayHours - Length of a working day in hours
 * @returns {string}
 */
export const formatDurationRange = ({ low, high }, workdayHours) => {
  const [lowEnd, highEnd] = [low, high].map((minutes) =>
    durationParts(minutes, workdayHours)
  )
  if (partsText(lowEnd) === partsText(highEnd)) return partsText(lowEnd)
  return lowEnd.unit === highEnd.unit
    ? `${lowEnd.amount}${EN_DASH}${highEnd.amount} ${lowEnd.unit}`
    : `${partsText(lowEnd)}${EN_DASH}${partsText(highEnd)}`
}

/**
 * Format a percentage. The scale is explicit because the metrics use both:
 * rolled %C/A, reject rate and share of items are 0-100 ("percent", the
 * default); flow efficiency is a 0-1 ratio ("ratio").
 * @param {number} value - The figure, on the given scale
 * @param {Object} [options]
 * @param {'percent'|'ratio'} [options.scale] - "percent" (0-100) or "ratio" (0-1)
 * @param {number} [options.decimals] - Decimal places, default 1
 * @returns {string} For example "9.6%" or "20%"
 * @throws {RangeError} When the scale is not "percent" or "ratio"
 * @throws {TypeError} When the value is not a finite number (for example an incomplete figure)
 */
export const formatPercent = (
  value,
  { scale = 'percent', decimals = 1 } = {}
) => {
  if (scale !== 'percent' && scale !== 'ratio') {
    throw new RangeError(`Unknown percent scale: ${scale}`)
  }
  assertFiniteNumber(value)
  const percentage = scale === 'ratio' ? value * 100 : value
  return `${fixed(percentage, decimals)}%`
}

/**
 * Format a `{ low, high }` range of percentages, for example "8.3%–22.1%".
 * Shows a single value when both ends display the same.
 * @param {{low: number, high: number}} range - Both ends on the same scale
 * @param {Object} [options] - Same options as formatPercent
 * @returns {string}
 */
export const formatPercentRange = ({ low, high }, options) => {
  const [lowText, highText] = [low, high].map((value) =>
    formatPercent(value, options)
  )
  return lowText === highText ? lowText : `${lowText}${EN_DASH}${highText}`
}

const parseNumber = (value) => {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  return NaN
}

/**
 * Convert a typed duration to whole minutes.
 * Decimals round to the nearest minute. Empty or non-numeric input gives an
 * error result rather than throwing, so a field can show it inline.
 * @param {number|string} value - The amount typed
 * @param {'minutes'|'hours'|'days'} unit - "days" are working days
 * @param {number} workdayHours - Length of a working day in hours
 * @returns {{minutes: number}|{error: string}}
 * @throws {RangeError} On an unknown unit, or a "days" unit with no valid workdayHours
 */
export const toMinutes = (value, unit, workdayHours) => {
  const perUnit = minutesPerUnit(unit, workdayHours)
  const amount = parseNumber(value)
  return Number.isFinite(amount)
    ? { minutes: roundTo(amount * perUnit, 0) }
    : NOT_A_NUMBER
}

/**
 * Convert minutes to the amount a field shows in `unit`, rounded to 4 decimals.
 * Four decimals is fine enough that `toMinutes(fromMinutes(m))` returns `m`
 * for working days up to 166 hours, so re-saving an unedited field changes nothing.
 * @param {number} minutes - Duration in minutes
 * @param {'minutes'|'hours'|'days'} unit - "days" are working days
 * @param {number} workdayHours - Length of a working day in hours
 * @returns {number}
 */
export const fromMinutes = (minutes, unit, workdayHours) =>
  roundTo(minutes / minutesPerUnit(unit, workdayHours), 4)
