import {
  calculateTotals,
  calculateFlowEfficiency,
  calculateWaitShare,
} from './totals.js'
import { calculateRework, reworkAdjustedLeadTime, rolledCA } from './rework.js'
import { topWaits, largestWait, topPaths, lowestCA } from './flags.js'

/**
 * All v2 metrics for one map version. Pure: minutes in, minutes out (percentages
 * are 0-100, flow efficiency is a 0-1 ratio). Nothing is cached, so call it again
 * after an edit. A figure that depends on a missing value is
 * `{ incomplete: true, stepName }`.
 * @param {Object} version - A v2 map version ({ steps, reworkPaths })
 * @returns {Object} totals, flowEfficiency, rolledCA, rework, adjustedLeadTime, adjustedFlowEfficiency, waitShareOfLeadTime, stepCount, handoffCount, flags (`topWaits`, `largestWait`, `topPaths`, `lowestCA`: what the map, the strip and the table flag, worked out once here)
 */
export const calculateMetrics = ({ steps, reworkPaths }) => {
  const totals = calculateTotals(steps)
  const rework = calculateRework(steps, reworkPaths)
  const adjustedLeadTime = reworkAdjustedLeadTime(
    steps,
    totals.leadTime,
    rework.timeOnRework
  )

  return {
    totals,
    flowEfficiency: calculateFlowEfficiency(totals),
    waitShareOfLeadTime: calculateWaitShare(totals),
    rolledCA: rolledCA(steps),
    rework,
    adjustedLeadTime,
    adjustedFlowEfficiency: calculateFlowEfficiency({
      ...totals,
      leadTime: adjustedLeadTime,
    }),
    stepCount: totals.stepCount,
    handoffCount: totals.handoffCount,
    flags: {
      topWaits: topWaits(steps),
      largestWait: largestWait(steps),
      topPaths: topPaths(rework.paths),
      lowestCA: lowestCA(steps),
    },
  }
}
