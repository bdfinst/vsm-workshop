/**
 * Derive a value stream map from a real-tooling event log (P3).
 *
 * Maps recorded state-transition timestamps (one WorkItemEvent per stage visit)
 * onto VSM steps, deriving process time, lead time, %C&A, queue size, and the
 * forward/rework connections from the data rather than from estimates.
 *
 * Pure function. Source-agnostic: adapters normalize Jira/GitHub/CI/CSV/JSON
 * into the WorkItemEvent shape, then this builds the map.
 *
 * @typedef {Object} WorkItemEvent
 * @property {string} workItemId
 * @property {string} stage
 * @property {string} enteredAt - ISO timestamp
 * @property {string} [exitedAt] - ISO timestamp
 */

import { createStep } from '../../models/StepFactory.js'
import { createConnection } from '../../models/ConnectionFactory.js'
import { STEP_TYPES } from '../../data/stepTypes.js'
import { CANVAS_START_X, CANVAS_STEP_SPACING, CANVAS_Y } from '../../data/canvasConfig.js'

const MS_PER_MIN = 60000

const median = (values) => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/** Time-weighted average number of overlapping intervals (a WIP proxy). */
const averageConcurrency = (intervals) => {
  const spans = intervals.filter(([start, end]) => end > start)
  if (spans.length === 0) return 0
  const points = [...new Set(spans.flatMap(([s, e]) => [s, e]))].sort((a, b) => a - b)
  let weighted = 0
  let total = 0
  for (let i = 0; i < points.length - 1; i++) {
    const segStart = points[i]
    const segEnd = points[i + 1]
    const len = segEnd - segStart
    const count = spans.filter(([s, e]) => s <= segStart && e >= segEnd).length
    weighted += count * len
    total += len
  }
  return total > 0 ? weighted / total : 0
}

/** Best-effort step type from a stage name (improves downstream diagnostics). */
const inferStepType = (name) => {
  const n = name.toLowerCase()
  if (/(test|qa)/.test(n)) return STEP_TYPES.TESTING
  if (/(deploy|release|ship)/.test(n)) return STEP_TYPES.DEPLOYMENT
  if (/review/.test(n)) return STEP_TYPES.CODE_REVIEW
  if (/(plan|backlog|groom)/.test(n)) return STEP_TYPES.PLANNING
  if (/(build|dev|code|implement)/.test(n)) return STEP_TYPES.DEVELOPMENT
  if (/stag/.test(n)) return STEP_TYPES.STAGING
  if (/monitor/.test(n)) return STEP_TYPES.MONITORING
  return STEP_TYPES.CUSTOM
}

const toMs = (iso) => Date.parse(iso)

/**
 * Build a VSM from a flat list of work-item events.
 * @param {WorkItemEvent[]} events
 * @param {{stageOrder?: string[]}} [options]
 * @returns {{steps: Array, connections: Array}}
 */
export function deriveVsmFromEvents(events = [], options = {}) {
  const valid = events.filter(
    (e) => e && e.workItemId && e.stage && Number.isFinite(toMs(e.enteredAt))
  )
  if (valid.length === 0) return { steps: [], connections: [] }

  // --- Stage ordering ---
  const seen = []
  valid
    .slice()
    .sort((a, b) => toMs(a.enteredAt) - toMs(b.enteredAt))
    .forEach((e) => {
      if (!seen.includes(e.stage)) seen.push(e.stage)
    })
  const order = (options.stageOrder?.filter((s) => seen.includes(s)) || seen).slice()
  const orderIndex = new Map(order.map((s, i) => [s, i]))

  // --- Per-stage accumulators ---
  const stageData = new Map(
    order.map((s) => [s, { active: [], lead: [], intervals: [], items: new Set(), reentered: new Set() }])
  )
  const totalItems = new Set(valid.map((e) => e.workItemId))
  const reworkCounts = new Map() // "from→to" -> Set(workItemId)

  // --- Walk each item's timeline ---
  const byItem = new Map()
  valid.forEach((e) => {
    if (!byItem.has(e.workItemId)) byItem.set(e.workItemId, [])
    byItem.get(e.workItemId).push(e)
  })

  for (const [itemId, itemEvents] of byItem) {
    itemEvents.sort((a, b) => toMs(a.enteredAt) - toMs(b.enteredAt))
    itemEvents.forEach((e, i) => {
      const data = stageData.get(e.stage)
      if (!data) return
      const enteredMs = toMs(e.enteredAt)
      const next = itemEvents[i + 1]
      const exitedMs = Number.isFinite(toMs(e.exitedAt)) ? toMs(e.exitedAt) : null
      const nextEntryMs = next ? toMs(next.enteredAt) : null

      const activeMs = (exitedMs ?? nextEntryMs ?? enteredMs) - enteredMs
      const leadMs = (nextEntryMs ?? exitedMs ?? enteredMs) - enteredMs

      data.active.push(Math.max(0, activeMs) / MS_PER_MIN)
      data.lead.push(Math.max(0, leadMs) / MS_PER_MIN)
      data.intervals.push([enteredMs, exitedMs ?? nextEntryMs ?? enteredMs])
      if (data.items.has(itemId)) data.reentered.add(itemId)
      data.items.add(itemId)

      // Backward move = rework edge from the previous stage back to this one
      if (next && orderIndex.get(next.stage) < orderIndex.get(e.stage)) {
        const key = `${e.stage}→${next.stage}`
        if (!reworkCounts.has(key)) reworkCounts.set(key, new Set())
        reworkCounts.get(key).add(itemId)
      }
    })
  }

  // --- Steps ---
  const steps = order.map((stage, i) => {
    const data = stageData.get(stage)
    const processTime = Math.round(median(data.active))
    const leadTime = Math.max(processTime, Math.round(median(data.lead)))
    const reentryRate = data.items.size > 0 ? data.reentered.size / data.items.size : 0
    return createStep(stage, {
      type: inferStepType(stage),
      processTime,
      leadTime,
      percentCompleteAccurate: Math.round((1 - reentryRate) * 100),
      queueSize: Math.round(averageConcurrency(data.intervals)),
      position: { x: CANVAS_START_X + i * CANVAS_STEP_SPACING, y: CANVAS_Y },
    })
  })

  const stepIdByStage = new Map(steps.map((s) => [s.name, s.id]))

  // --- Connections: forward (consecutive) + rework (backward moves) ---
  const connections = []
  for (let i = 0; i < order.length - 1; i++) {
    connections.push(
      createConnection(stepIdByStage.get(order[i]), stepIdByStage.get(order[i + 1]), 'forward')
    )
  }
  for (const [key, items] of reworkCounts) {
    const [from, to] = key.split('→')
    const reworkRate = Math.round((items.size / totalItems.size) * 100)
    connections.push(
      createConnection(stepIdByStage.get(from), stepIdByStage.get(to), 'rework', reworkRate)
    )
  }

  return { steps, connections }
}
