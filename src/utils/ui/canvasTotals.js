/**
 * Key totals for the always-visible canvas totals bar.
 *
 * Pure selector so the mobile/tablet totals overlay shows a compact, consistent
 * set of headline numbers without duplicating formatting logic.
 */
import { formatDuration } from '../calculations/metrics.js'

/**
 * @param {Object} metrics - Output of calculateMetrics
 * @returns {Array<{label:string, value:string, status?:string}>}
 */
export function selectCanvasTotals(metrics = {}) {
  const flowEfficiency = metrics.flowEfficiency || {}
  return [
    { label: 'Lead Time', value: formatDuration(metrics.totalLeadTime || 0) },
    { label: 'Process Time', value: formatDuration(metrics.totalProcessTime || 0) },
    { label: 'Flow Eff.', value: flowEfficiency.displayValue || 'N/A', status: flowEfficiency.status },
    { label: 'Steps', value: String(metrics.stepCount ?? 0) },
  ]
}
