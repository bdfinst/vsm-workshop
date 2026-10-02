/**
 * DORA reconciliation (P1c)
 *
 * Captures the four DORA metrics per map and reconciles the VSM-derived lead
 * time against the actual lead time for changes. The gap between them is the
 * hidden queue the map does not yet model — the strongest Phase-0 "Assess"
 * signal that a value stream is incomplete.
 *
 * Pure functions. Durations in minutes; rates as 0-100 percentages;
 * deployment frequency as deploys per (calendar) day.
 */

import { calculateTotalLeadTime } from './metrics.js'

const ONE_DAY = 1440 // minutes
const ONE_WEEK = ONE_DAY * 7
const ONE_MONTH = ONE_DAY * 30

/** A blank DORA record (all metrics unknown). */
export const emptyDora = () => ({
  deploymentFrequencyPerDay: null,
  leadTimeForChangesMinutes: null,
  changeFailureRatePct: null,
  mttrMinutes: null,
})

// Actual lead time within this ratio of the VSM-derived total counts as aligned.
const ALIGNED_RATIO = 1.5

/**
 * Reconcile the VSM-derived lead time against the recorded actual lead time.
 * @param {Array} steps
 * @param {Object} dora
 * @returns {{vsmLeadTime:number, actualLeadTime:(number|null), hiddenQueue:number, ratio:(number|null), status:string}}
 */
export function reconcileLeadTime(steps = [], dora = emptyDora()) {
  const vsmLeadTime = calculateTotalLeadTime(steps)
  const actualLeadTime = dora?.leadTimeForChangesMinutes ?? null

  if (actualLeadTime === null) {
    return { vsmLeadTime, actualLeadTime: null, hiddenQueue: 0, ratio: null, status: 'unknown' }
  }

  const hiddenQueue = Math.max(0, actualLeadTime - vsmLeadTime)
  const ratio = vsmLeadTime > 0 ? actualLeadTime / vsmLeadTime : null

  let status
  if (actualLeadTime < vsmLeadTime) status = 'optimistic-map'
  else if (ratio !== null && ratio <= ALIGNED_RATIO) status = 'aligned'
  else status = 'hidden-queue'

  return { vsmLeadTime, actualLeadTime, hiddenQueue, ratio, status }
}

const tier = (value, { elite, high, medium }, lowerIsBetter = true) => {
  if (value === null || value === undefined) return 'unknown'
  if (lowerIsBetter) {
    if (value <= elite) return 'elite'
    if (value <= high) return 'high'
    if (value <= medium) return 'medium'
    return 'low'
  }
  if (value >= elite) return 'elite'
  if (value >= high) return 'high'
  if (value >= medium) return 'medium'
  return 'low'
}

/**
 * Classify each DORA metric into an elite/high/medium/low tier.
 * Bands follow the DORA "Accelerate" performance clusters.
 * @param {Object} dora
 * @returns {{deploymentFrequency:string, leadTimeForChanges:string, changeFailureRate:string, mttr:string}}
 */
export function classifyDora(dora = emptyDora()) {
  return {
    // deploys per day — higher is better
    deploymentFrequency: tier(
      dora.deploymentFrequencyPerDay,
      { elite: 1, high: 1 / 7, medium: 1 / 30 },
      false
    ),
    // lead time for changes (minutes) — lower is better
    leadTimeForChanges: tier(dora.leadTimeForChangesMinutes, {
      elite: ONE_DAY,
      high: ONE_WEEK,
      medium: ONE_MONTH,
    }),
    // change failure rate (%) — lower is better
    changeFailureRate: tier(dora.changeFailureRatePct, { elite: 15, high: 20, medium: 30 }),
    // mttr (minutes) — lower is better
    mttr: tier(dora.mttrMinutes, { elite: 60, high: ONE_DAY, medium: ONE_WEEK }),
  }
}
