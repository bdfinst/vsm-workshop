/**
 * Wait-time waterfall (P1a)
 *
 * Splits each step's lead time into value-add (process) time and wait time,
 * surfacing the hidden queues that dominate most value streams. Manual steps
 * are flagged as handoffs — Phase 2 of beyond.minimumcd.org names manual gates
 * and handoff delays as waste.
 *
 * Pure functions; all times in minutes.
 */

import { isAutomated } from '../../models/StepFactory.js'
import { WAIT_DOMINATED_THRESHOLD } from '../../data/thresholds.js'

/**
 * @typedef {Object} WaitRow
 * @property {string} stepId
 * @property {string} name
 * @property {number} processTime - Value-add minutes
 * @property {number} waitTime - Wait minutes (leadTime - processTime, floored at 0)
 * @property {number} leadTime
 * @property {number} waitPercentage - Wait as a % of lead time (0 when leadTime is 0)
 * @property {boolean} waitDominated - Wait percentage at/above the threshold
 * @property {boolean} manual - Step is a manual handoff (a hidden queue)
 */

const waitPct = (waitTime, leadTime) => (leadTime > 0 ? (waitTime / leadTime) * 100 : 0)

/**
 * Break a value stream down into per-step value-add vs. wait time, with totals.
 * @param {Array} steps
 * @returns {{steps: WaitRow[], totals: {processTime:number, waitTime:number, leadTime:number, waitPercentage:number}}}
 */
export function calculateWaitTimeBreakdown(steps = []) {
  const rows = steps.map((s) => {
    const processTime = s.processTime || 0
    const leadTime = s.leadTime || 0
    const waitTime = Math.max(0, leadTime - processTime)
    const percentage = waitPct(waitTime, leadTime)
    return {
      stepId: s.id,
      name: s.name,
      processTime,
      waitTime,
      leadTime,
      waitPercentage: Number(percentage.toFixed(1)),
      waitDominated: percentage >= WAIT_DOMINATED_THRESHOLD,
      manual: !isAutomated(s),
    }
  })

  const totals = rows.reduce(
    (acc, r) => ({
      processTime: acc.processTime + r.processTime,
      waitTime: acc.waitTime + r.waitTime,
      leadTime: acc.leadTime + r.leadTime,
    }),
    { processTime: 0, waitTime: 0, leadTime: 0 }
  )

  return {
    steps: rows,
    totals: {
      ...totals,
      waitPercentage: Number(waitPct(totals.waitTime, totals.leadTime).toFixed(1)),
    },
  }
}
