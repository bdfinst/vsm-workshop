import { DURATION_UNIT } from '../../../models/v2/constants.js'
import {
  boundError,
  rangeOrderErrors,
} from '../../validation/v2/timeRangeValidator.js'

const MINUTES_PER_HOUR = 60
const EN_DASH = '–'
const NOT_A_NUMBER_RESULT = Object.freeze({ error: 'Enter a number' })

// Places shown when a duration is formatted for reading.
const DURATION_DISPLAY_DECIMALS = 1
// Places a field shows, fine enough that its text converts back to the same
// whole minutes (see `fromMinutes`).
const FIELD_ROUND_TRIP_DECIMALS = 4

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

const toRoundedFixed = (value, decimals) =>
  roundTo(value, decimals).toFixed(decimals)

const workdayMinutes = (workdayHours) => {
  if (!Number.isFinite(workdayHours) || workdayHours <= 0) {
    throw new RangeError(
      `workdayHours must be a positive number, got ${workdayHours}`
    )
  }
  return workdayHours * MINUTES_PER_HOUR
}

const minutesPerUnit = (unit, workdayHours) => {
  if (unit === DURATION_UNIT.MINUTES) return 1
  if (unit === DURATION_UNIT.HOURS) return MINUTES_PER_HOUR
  if (unit === DURATION_UNIT.DAYS) return workdayMinutes(workdayHours)
  throw new RangeError(`Unknown duration unit: ${unit}`)
}

// Under one working day shows hours, from one working day shows days.
const durationParts = (minutes, workdayHours) => {
  assertFiniteNumber(minutes)
  const unit =
    minutes < workdayMinutes(workdayHours)
      ? DURATION_UNIT.HOURS
      : DURATION_UNIT.DAYS
  return {
    unit,
    amountText: toRoundedFixed(
      minutes / minutesPerUnit(unit, workdayHours),
      DURATION_DISPLAY_DECIMALS
    ),
  }
}

const partsText = ({ amountText, unit }) => `${amountText} ${unit}`

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
    ? `${lowEnd.amountText}${EN_DASH}${highEnd.amountText} ${lowEnd.unit}`
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
  return `${toRoundedFixed(percentage, decimals)}%`
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

// Plain decimals only: Number() would also read "1e3" and "0x10" as numbers.
// The digit runs never overlap ("\d+" then an optional "." and "\d*"), so a
// long run of digits that fails at the end is rejected in linear time.
const PLAIN_DECIMAL = /^[+-]?(\d+(\.\d*)?|\.\d+)$/

const parseNumber = (value) => {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return NaN
  const text = value.trim()
  return PLAIN_DECIMAL.test(text) ? Number(text) : NaN
}

/**
 * Convert a typed duration to whole minutes.
 * Decimals round to the nearest minute. Empty or non-numeric input (including
 * exponent, hexadecimal and comma forms) gives an error result rather than
 * throwing, so a field can show it inline.
 * @param {number|string} value - The amount typed
 * @param {'minutes'|'hours'|'days'} unit - A `DURATION_UNIT`; "days" are working days
 * @param {number} workdayHours - Length of a working day in hours
 * @returns {{minutes: number}|{error: string}}
 * @throws {RangeError} On an unknown unit, or a "days" unit with no valid workdayHours
 */
export const toMinutes = (value, unit, workdayHours) => {
  const perUnit = minutesPerUnit(unit, workdayHours)
  const amount = parseNumber(value)
  if (!Number.isFinite(amount)) return NOT_A_NUMBER_RESULT
  // A figure too large to scale overflows to Infinity, which is not minutes.
  const minutes = roundTo(amount * perUnit, 0)
  return Number.isFinite(minutes) ? { minutes } : NOT_A_NUMBER_RESULT
}

/**
 * Convert minutes to the amount a field shows in `unit`, rounded to `FIELD_ROUND_TRIP_DECIMALS` (4) places.
 * Four decimals is fine enough that `toMinutes(fromMinutes(m))` returns `m`
 * for working days up to 166 hours, so re-saving an unedited field changes nothing.
 * @param {number} minutes - Duration in minutes
 * @param {'minutes'|'hours'|'days'} unit - A `DURATION_UNIT`; "days" are working days
 * @param {number} workdayHours - Length of a working day in hours
 * @returns {number}
 */
export const fromMinutes = (minutes, unit, workdayHours) =>
  roundTo(
    minutes / minutesPerUnit(unit, workdayHours),
    FIELD_ROUND_TRIP_DECIMALS
  )

const isNotEntered = (text) => text == null || String(text).trim() === ''

// A blank field is "not entered", which is a stage status, not an error.
const parseField = (text, unit, workdayHours) =>
  isNotEntered(text) ? { minutes: null } : toMinutes(text, unit, workdayHours)

const RANGE_FIELDS = Object.freeze(['typ', 'min', 'max'])

/**
 * Parse the typed typical, min and max of one duration into whole minutes.
 * A blank field is not entered: typ becomes null, and a blank min or max is left
 * out of the range. Errors are keyed by the field they belong to.
 * @param {{typ?: number|string, min?: number|string, max?: number|string}} texts - What each field holds
 * @param {'minutes'|'hours'|'days'} unit - A `DURATION_UNIT`; "days" are working days
 * @param {number} workdayHours - Length of a working day in hours
 * @param {Object} options
 * @param {string} options.label - Name used in messages ("Process time")
 * @param {boolean} [options.mustBePositive=false] - Require more than 0 instead of 0 or more
 * @returns {{range: {typ: number|null, min?: number, max?: number}}|{errors: {typ?: string, min?: string, max?: string}}}
 * @throws {RangeError} On an unknown unit, or a "days" unit with no valid workdayHours
 */
export const parseDurationRange = (
  texts,
  unit,
  workdayHours,
  { label, mustBePositive = false }
) => {
  const names = { typ: label, min: `${label} min`, max: `${label} max` }
  const minutesByField = {}
  const fieldErrors = {}

  RANGE_FIELDS.forEach((field) => {
    const parsed = parseField(texts[field], unit, workdayHours)
    minutesByField[field] = parsed.minutes ?? null
    const error =
      parsed.error ??
      (minutesByField[field] === null
        ? null
        : boundError(names[field], minutesByField[field], mustBePositive))
    if (error) fieldErrors[field] = error
  })

  // A field that already shows an error is left out of the comparison.
  const compared = Object.fromEntries(
    RANGE_FIELDS.map((field) => [
      field,
      fieldErrors[field] ? null : minutesByField[field],
    ])
  )
  const errors = { ...fieldErrors, ...rangeOrderErrors(compared) }

  if (Object.keys(errors).length > 0) return { errors }

  const { typ, min, max } = minutesByField
  return {
    range: {
      typ,
      ...(min !== null && { min }),
      ...(max !== null && { max }),
    },
  }
}

/**
 * The unit a field first shows a stored duration in: the one `formatDuration`
 * reads it in, so a saved 2 working days reopens as "2 days", not "16 hours".
 * Hours when nothing is entered yet.
 * @param {number|null|undefined} minutes - The stored duration, if any
 * @param {number} workdayHours - Length of a working day in hours
 * @returns {'hours'|'days'}
 * @throws {RangeError} When workdayHours is not a positive number
 */
export const durationUnitOf = (minutes, workdayHours) =>
  Number.isFinite(minutes)
    ? durationParts(minutes, workdayHours).unit
    : DURATION_UNIT.HOURS

const MILLISECONDS_PER_MINUTE = 60 * 1000
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR
const DAYS_PER_MONTH = 30
const DAYS_PER_YEAR = 365
const MONTH_NAMES = Object.freeze([
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
])

// A Date, milliseconds or an ISO string as milliseconds, or NaN when it is none
// of those. `new Date(null)` is the epoch, so only these three kinds are read.
const toMilliseconds = (time) => {
  if (time instanceof Date) return time.getTime()
  if (typeof time === 'number') return time
  return typeof time === 'string' ? Date.parse(time) : NaN
}

const countOf = (amount, unit) => `${amount} ${unit}${amount === 1 ? '' : 's'}`

/**
 * How long ago a time was, in the largest whole unit: minutes, hours, days
 * (under 30), months (30 days each, under a year) or years (365 days each).
 * Under a minute, and any time after `now`, read as "just now".
 * @param {Date|number|string} timestamp - The earlier time
 * @param {Date|number|string} now - The time to measure to (a Date, milliseconds or an ISO string)
 * @returns {?string} For example "2 days ago", or null when either time cannot be read
 */
export const formatRelativeTime = (timestamp, now) => {
  const elapsed = toMilliseconds(now) - toMilliseconds(timestamp)
  if (!Number.isFinite(elapsed)) return null
  const minutes = Math.floor(elapsed / MILLISECONDS_PER_MINUTE)
  if (minutes < 1) return 'just now'
  const hours = Math.floor(minutes / MINUTES_PER_HOUR)
  if (hours < 1) return `${countOf(minutes, 'minute')} ago`
  const days = Math.floor(minutes / MINUTES_PER_DAY)
  if (days < 1) return `${countOf(hours, 'hour')} ago`
  if (days < DAYS_PER_MONTH) return `${countOf(days, 'day')} ago`
  if (days < DAYS_PER_YEAR) {
    return `${countOf(Math.floor(days / DAYS_PER_MONTH), 'month')} ago`
  }
  return `${countOf(Math.floor(days / DAYS_PER_YEAR), 'year')} ago`
}

/**
 * The day and month of a time, in UTC with English month names, so it reads the
 * same on every machine.
 * @param {Date|number|string} timestamp - A Date, milliseconds or an ISO string
 * @returns {?string} For example "3 Mar", or null when the time cannot be read
 */
export const formatDayMonth = (timestamp) => {
  const milliseconds = toMilliseconds(timestamp)
  if (!Number.isFinite(milliseconds)) return null
  const date = new Date(milliseconds)
  return `${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]}`
}
