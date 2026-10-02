import { isOutside } from '../../../models/v2/constants.js'
import { incomplete, sumRanges } from './range.js'

/**
 * Sum the time ranges `pick` selects from each step.
 * Unset min and max fall back to the typical value. A missing typical value
 * gives `{ incomplete: true, stepName }` for the first such step, never a
 * partial sum.
 * @param {Object[]} steps - v2 steps
 * @param {function(Object): Object[]} pick - The `{typ, min?, max?}` ranges a step contributes
 * @returns {{typ: number, low: number, high: number}|{incomplete: true, stepName: string}}
 */
export const rangeOf = (steps, pick) => {
  const missing = steps.find((step) =>
    pick(step).some((range) => range.typ == null)
  )
  if (missing) return incomplete(missing.name)

  return sumRanges(
    steps.flatMap(pick).map((range) => ({
      typ: range.typ,
      low: range.min ?? range.typ,
      high: range.max ?? range.typ,
    }))
  )
}

// A step with no time object at all is treated like one with no value entered.
const UNSET = { typ: null }

const processRanges = (step) =>
  isOutside(step) ? [] : [step.processTime ?? UNSET]
const waitRanges = (step) => (isOutside(step) ? [] : [step.waitTime ?? UNSET])
const elapsedRanges = (step) =>
  isOutside(step) ? [step.elapsedTime ?? UNSET] : []
const leadRanges = (step) => [
  ...processRanges(step),
  ...waitRanges(step),
  ...elapsedRanges(step),
]

/**
 * The lead time of a step list: process, wait and elapsed time together.
 * @param {Object[]} steps - v2 steps
 * @returns {{typ: number, low: number, high: number}|{incomplete: true, stepName: string}}
 */
export const leadTimeOf = (steps) => rangeOf(steps, leadRanges)

/**
 * Totals over a step list, in minutes. A total that depends on a missing
 * value is `{ incomplete: true, stepName }`, naming the first such step.
 * @param {Object[]} steps - v2 steps
 * @returns {Object} processTime, waitTime, elapsedTime and leadTime as `{ typ, low, high }`, plus stepCount and handoffCount
 */
export const calculateTotals = (steps) => ({
  processTime: rangeOf(steps, processRanges),
  waitTime: rangeOf(steps, waitRanges),
  elapsedTime: rangeOf(steps, elapsedRanges),
  leadTime: leadTimeOf(steps),
  stepCount: steps.length,
  handoffCount: steps.filter((step) => step.isHandoff).length,
})

const shareOfLeadTime = (part, { elapsedTime, leadTime }) => {
  if (leadTime.incomplete) return leadTime
  if (leadTime.typ === 0 || leadTime.low === 0 || leadTime.high === 0) {
    return null
  }
  // The two ends can cross when the lead time varies more than the part does,
  // so the range is always the smaller ratio to the larger.
  const atLow = part.low / leadTime.low
  const atHigh = (part.high + elapsedTime.high) / leadTime.high
  return {
    typ: part.typ / leadTime.typ,
    low: Math.min(atLow, atHigh),
    high: Math.max(atLow, atHigh),
  }
}

/**
 * Flow efficiency as ratios (0-1). The range runs from the smaller to the
 * larger of PT(min) / LT(min) and PT(max) / LT(max), so a longer lead time can
 * make the low end come from the max values. With outside steps the max case is
 * (PT + EL) / LT (their time all work) rather than PT / LT (all wait).
 * Incomplete when the lead time is, and null when the lead time is 0 at any
 * of its three values (no ratio exists).
 * @param {Object} totals - Result of calculateTotals
 * @returns {{typ: number, low: number, high: number}|{incomplete: true, stepName: string}|null}
 */
export const calculateFlowEfficiency = (totals) =>
  shareOfLeadTime(totals.processTime, totals)

/**
 * Share of the lead time spent waiting, as ratios (0-1): WT / LT, from the
 * smaller to the larger of the min and max cases. With outside steps the max
 * case is (WT + EL) / LT, as their time may all be wait.
 * Incomplete when the lead time is, null when it is 0.
 * @param {Object} totals - Result of calculateTotals
 * @returns {{typ: number, low: number, high: number}|{incomplete: true, stepName: string}|null}
 */
export const calculateWaitShare = (totals) =>
  shareOfLeadTime(totals.waitTime, totals)
