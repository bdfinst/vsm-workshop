/**
 * Current-state vs future-state comparison (P3)
 *
 * The classic VSM workflow draws a current state, designs an improved future
 * state, and quantifies the projected improvement. This app captures a baseline
 * snapshot; the live ("working") map is then improved and compared against it.
 *
 * Pure function. Reuses calculateMetrics so the metric definitions are shared.
 */

import { calculateMetrics } from './metrics.js'

// For each metric: does a higher value mean improvement?
const HIGHER_IS_BETTER = {
  totalLeadTime: false,
  totalProcessTime: false,
  flowEfficiency: true,
  firstPassYield: true,
}

const summarize = (steps, connections) => {
  const m = calculateMetrics(steps, connections)
  return {
    totalLeadTime: m.totalLeadTime,
    totalProcessTime: m.totalProcessTime,
    flowEfficiency: m.flowEfficiency.percentage,
    firstPassYield: m.firstPassYield.percentage,
  }
}

const delta = (metric, base, work) => {
  const d = Number((work - base).toFixed(2))
  const improved = d === 0 ? false : HIGHER_IS_BETTER[metric] ? d > 0 : d < 0
  return { baseline: base, working: work, delta: d, improved }
}

/**
 * Compare a baseline state against a working state.
 * @returns {Object|null} null when there is no baseline to compare against
 */
export function compareStates(baselineSteps, baselineConnections, workingSteps, workingConnections) {
  if (!baselineSteps) return null

  const baseline = summarize(baselineSteps, baselineConnections || [])
  const working = summarize(workingSteps || [], workingConnections || [])

  const deltas = Object.keys(HIGHER_IS_BETTER).reduce((acc, metric) => {
    acc[metric] = delta(metric, baseline[metric], working[metric])
    return acc
  }, {})

  return { baseline, working, deltas }
}
