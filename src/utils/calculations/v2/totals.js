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
  return {
    typ: part.typ / leadTime.typ,
    low: part.low / leadTime.low,
    high: (part.high + elapsedTime.high) / leadTime.high,
  }
}

/**
 * Flow efficiency as ratios (0-1). The low value uses every min and the high
 * value every max. With outside steps it spans from PT / LT (their time is all
 * wait) to (PT + EL) / LT (all work). Incomplete when the lead time is, and
 * null when the lead time is 0 at any of its three values (no ratio exists).
 * @param {Object} totals - Result of calculateTotals
 * @returns {{typ: number, low: number, high: number}|{incomplete: true, stepName: string}|null}
 */
export const calculateFlowEfficiency = (totals) =>
  shareOfLeadTime(totals.processTime, totals)

/**
 * Share of the lead time spent waiting, as ratios (0-1): WT / LT. With outside
 * steps the high value is (WT + EL) / LT, as their time may all be wait.
 * Incomplete when the lead time is, null when it is 0.
 * @param {Object} totals - Result of calculateTotals
 * @returns {{typ: number, low: number, high: number}|{incomplete: true, stepName: string}|null}
 */
export const calculateWaitShare = (totals) =>
  shareOfLeadTime(totals.waitTime, totals)
