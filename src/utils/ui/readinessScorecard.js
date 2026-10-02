/**
 * Presentation helpers for the CD Readiness Scorecard.
 *
 * Pure functions shared by the CdReadinessScorecard component and its tests,
 * so grouping/sorting/summary logic lives in one place (not the template).
 */

// Lower number = shown first within a group.
const STATUS_ORDER = { gap: 0, 'needs-review': 1, met: 2 }

const byStatusThenLabel = (a, b) => {
  const order = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
  return order !== 0 ? order : a.label.localeCompare(b.label)
}

/**
 * Split readiness items into core practices and flow signals, each sorted
 * with gaps first.
 * @param {Array} items - Readiness items from calculateCdReadiness
 * @returns {{practices: Array, signals: Array}}
 */
export function groupReadinessItems(items = []) {
  const sorted = [...items].sort(byStatusThenLabel)
  return {
    practices: sorted.filter((i) => i.kind === 'practice'),
    signals: sorted.filter((i) => i.kind === 'signal'),
  }
}

/**
 * Count readiness items by status.
 * @param {Array} items - Readiness items
 * @returns {{met: number, gap: number, needsReview: number}}
 */
export function summarizeReadiness(items = []) {
  return items.reduce(
    (acc, i) => {
      if (i.status === 'met') acc.met += 1
      else if (i.status === 'gap') acc.gap += 1
      else if (i.status === 'needs-review') acc.needsReview += 1
      return acc
    },
    { met: 0, gap: 0, needsReview: 0 }
  )
}

/**
 * Human-readable text for a status (used for accessible, non-color status).
 * @param {string} status
 * @returns {string}
 */
export function readinessStatusText(status) {
  if (status === 'needs-review') return 'needs review'
  return status
}
