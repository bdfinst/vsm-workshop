import { FULL_PCT_CA, isOutside } from '../../../models/v2/constants.js'
import { incomplete, sumRanges } from './range.js'
import { leadTimeOf } from './totals.js'

/**
 * Reject rate of a step, as a percentage (0-100): full %C/A (100) minus its %C/A.
 * An outside step with no %C/A has none to show (null), since its quality is
 * not part of the team's own figures; a rework loop can still start there once
 * a %C/A is entered.
 * @param {Object} step - A v2 step
 * @returns {number|null|{incomplete: true, stepName: string}} Incomplete when a team step's %C/A is missing
 */
export const rejectRate = (step) => {
  if (step.pctCA != null) return FULL_PCT_CA - step.pctCA
  return isOutside(step) ? null : incomplete(step.name)
}

/**
 * Rolled %C/A: the product of the team steps' %C/A, as a percentage (0-100).
 * Outside steps are left out.
 * @param {Object[]} steps - v2 steps
 * @returns {number|{incomplete: true, stepName: string}} Incomplete naming the first team step with no %C/A
 */
export const rolledCA = (steps) => {
  const teamSteps = steps.filter((step) => !isOutside(step))
  const missing = teamSteps.find((step) => step.pctCA == null)
  if (missing) return incomplete(missing.name)
  return teamSteps.reduce(
    (rolled, step) => (rolled * step.pctCA) / 100,
    FULL_PCT_CA
  )
}

const mapRange = (range, fn) => ({
  typ: fn(range.typ),
  low: fn(range.low),
  high: fn(range.high),
})

const hasMissingTime = (step) => leadTimeOf([step]).incomplete === true

const indexOfFirstGap = (steps, toIndex, fromIndex) => {
  const offset = steps.slice(toIndex, fromIndex).findIndex(hasMissingTime)
  return offset === -1 ? null : toIndex + offset
}

// A path's added time depends on the times of steps k..j-1, then on %C/A of j.
// Returns the index of the first step it is missing a value for, or null.
const findGap = (steps, toIndex, fromIndex) =>
  indexOfFirstGap(steps, toIndex, fromIndex) ??
  (steps[fromIndex].pctCA == null ? fromIndex : null)

const shareOfItemsFor = (fromStep, path) =>
  fromStep.pctCA == null
    ? incomplete(fromStep.name)
    : (rejectRate(fromStep) * path.shareOfRejects) / 100

const reworkTimeFor = (steps, path, toIndex, fromIndex) => {
  const timeGap = indexOfFirstGap(steps, toIndex, fromIndex)
  return timeGap == null
    ? mapRange(
        leadTimeOf(steps.slice(toIndex, fromIndex)),
        (minutes) => minutes + (path.reworkProcessTime ?? 0)
      )
    : incomplete(steps[timeGap].name)
}

const addedTimeFor = (steps, gap, shareOfItems, reworkTime) =>
  gap == null
    ? mapRange(reworkTime, (minutes) => (shareOfItems * minutes) / 100)
    : incomplete(steps[gap].name)

const analyzePath = (steps, path) => {
  const fromIndex = steps.findIndex((step) => step.id === path.fromStepId)
  const toIndex = steps.findIndex((step) => step.id === path.toStepId)
  const gap = findGap(steps, toIndex, fromIndex)
  const shareOfItems = shareOfItemsFor(steps[fromIndex], path)
  const reworkTime = reworkTimeFor(steps, path, toIndex, fromIndex)

  return {
    gap,
    row: {
      id: path.id,
      fromStepId: path.fromStepId,
      toStepId: path.toStepId,
      depth: fromIndex - toIndex,
      shareOfRejects: path.shareOfRejects,
      shareOfItems,
      reworkTime,
      addedTime: addedTimeFor(steps, gap, shareOfItems, reworkTime),
    },
  }
}

/**
 * Rework cost, assuming no single rework loop is repeated more than once for
 * an individual work item. For a path from step j back to step k:
 * depth = index(j) - index(k); R = the time of steps k to j - 1 plus the path's
 * `reworkProcessTime`; P = (100 - %C/A of j) x share / 100 is the share of items
 * taking it (a percentage, 0-100); added time per item = P x R / 100.
 * A figure that depends on a missing value is `{ incomplete: true, stepName }`,
 * and `timeOnRework` names the first such step in step order.
 * @param {Object[]} steps - v2 steps, in order
 * @param {Object[]} reworkPaths - v2 rework paths
 * @returns {{paths: Object[], timeOnRework: {typ: number, low: number, high: number}|{incomplete: true, stepName: string}}}
 */
export const calculateRework = (steps, reworkPaths) => {
  const analyses = reworkPaths.map((path) => analyzePath(steps, path))
  const gaps = analyses.map(({ gap }) => gap).filter((gap) => gap != null)

  return {
    paths: analyses.map(({ row }) => row),
    timeOnRework:
      gaps.length > 0
        ? incomplete(steps[Math.min(...gaps)].name)
        : sumRanges(analyses.map(({ row }) => row.addedTime)),
  }
}

/**
 * Rework-adjusted lead time: lead time plus time on rework. Incomplete when
 * either is, naming the missing step that comes first in step order.
 * @param {Object[]} steps - v2 steps, in order
 * @param {Object} leadTime - `leadTime` from calculateTotals
 * @param {Object} timeOnRework - `timeOnRework` from calculateRework
 * @returns {{typ: number, low: number, high: number}|{incomplete: true, stepName: string}}
 */
export const reworkAdjustedLeadTime = (steps, leadTime, timeOnRework) => {
  const missing = [leadTime, timeOnRework].filter((range) => range.incomplete)
  if (missing.length === 0) return sumRanges([leadTime, timeOnRework])

  const position = (range) =>
    steps.findIndex((step) => step.name === range.stepName)
  return missing.reduce((first, range) =>
    position(range) < position(first) ? range : first
  )
}
