/**
 * CD Readiness inference engine
 *
 * Pure function. Scores the 13 MinimumCD readiness items (9 core practices +
 * 4 flow signals) for a value stream by inferring likely gaps from data the
 * VSM already stores per step, then applies any user confirm/override/reset
 * decisions. Reuses metrics.js rather than recomputing flow/bottleneck data.
 *
 * Framing is iterative: items point at practices/constraints, never a phase.
 *
 * See: docs/specs/cd-readiness-scorecard.md
 */

import { MINIMUM_CD_READINESS_ITEMS } from '../../data/minimumCdPractices.js'
import {
  WORK_ITEM_MAX_LEAD_TIME_MINUTES,
  TEST_STEP_MAX_PROCESS_TIME_MINUTES,
  FLOW_EFFICIENCY_GOOD_THRESHOLD,
  FIRST_PASS_YIELD_WARNING_THRESHOLD,
} from '../../data/thresholds.js'
import { calculateFlowEfficiency, identifyBottlenecks } from './metrics.js'
import { isAutomated } from '../../models/StepFactory.js'

const TESTING_TYPE = 'testing'
const DEPLOYMENT_TYPE = 'deployment'

const maxBy = (items, selector) =>
  items.reduce((best, item) => (selector(item) > selector(best) ? item : best), items[0])

const minBy = (items, selector) =>
  items.reduce((best, item) => (selector(item) < selector(best) ? item : best), items[0])

/**
 * Infer the raw status for a single readiness item from VSM data.
 * @returns {{status: string, stepId: (string|null), explanation: string}}
 */
function inferItem(itemId, steps, connections) {
  const hasRework = connections.some((c) => c.type === 'rework')
  const lowQualitySteps = steps.filter(
    (s) => (s.percentCompleteAccurate ?? 100) < FIRST_PASS_YIELD_WARNING_THRESHOLD
  )
  const deploymentSteps = steps.filter((s) => s.type === DEPLOYMENT_TYPE)

  switch (itemId) {
    // ---- Flow readiness signals (met | gap) ----
    case 'work-decomposition': {
      const overLimit = steps.filter((s) => (s.leadTime || 0) > WORK_ITEM_MAX_LEAD_TIME_MINUTES)
      if (overLimit.length === 0) return met('Work items complete within two days.')
      const worst = maxBy(overLimit, (s) => s.leadTime)
      return gap(
        `"${worst.name}" takes longer than two days; small items integrate sooner.`,
        worst.id
      )
    }
    case 'testing-fundamentals': {
      const slow = steps.filter(
        (s) => s.type === TESTING_TYPE && (s.processTime || 0) > TEST_STEP_MAX_PROCESS_TIME_MINUTES
      )
      if (slow.length === 0) return met('No test step exceeds 10 minutes.')
      const worst = maxBy(slow, (s) => s.processTime)
      return gap(`"${worst.name}" tests take over 10 minutes to run.`, worst.id)
    }
    case 'wip-limits': {
      const bottleneckIds = identifyBottlenecks(steps)
      if (bottleneckIds.length === 0) return met('No step is acting as a flow constraint.')
      const bottleneckSteps = steps.filter((s) => bottleneckIds.includes(s.id))
      const worst = maxBy(bottleneckSteps, (s) => s.queueSize || 0)
      return gap(`"${worst.name}" has a large queue; limit work in progress.`, worst.id)
    }
    case 'small-batches': {
      const flowEfficiency = calculateFlowEfficiency(steps)
      // status 'neutral' means there is no lead-time data to judge flow against,
      // so there is no wait-dominated batch problem to flag.
      if (flowEfficiency.status === 'neutral') return met('Not enough lead-time data to flag.')
      if (flowEfficiency.percentage >= FLOW_EFFICIENCY_GOOD_THRESHOLD)
        return met('Flow is dominated by active work.')
      return gap('Flow is dominated by waiting rather than working; reduce batch size.', null)
    }

    // ---- Core practices with a negative VSM signal (gap | needs-review) ----
    case 'continuous-integration':
    case 'definition-of-deployable': {
      if (lowQualitySteps.length > 0) {
        const worst = minBy(lowQualitySteps, (s) => s.percentCompleteAccurate ?? 100)
        return gap(`"${worst.name}" passes incomplete work downstream (low %C&A).`, worst.id)
      }
      if (hasRework) {
        return gap('Rework loops indicate work is not deployable when first integrated.', null)
      }
      return needsReview()
    }
    case 'single-path-to-production': {
      const manual = deploymentSteps.find((s) => !isAutomated(s))
      if (manual) return gap(`"${manual.name}" deploys manually; automate the path to production.`, manual.id)
      if (deploymentSteps.length >= 2)
        return gap('Multiple deployment steps suggest more than one path to production.', null)
      if (deploymentSteps.length === 1) return met('A single automated deployment path is present.')
      return needsReview()
    }
    case 'rollback': {
      if (deploymentSteps.length === 0)
        return gap('No deployment step is modeled; ensure recovery can run in minutes.', null)
      return needsReview()
    }

    // ---- Core practices with no VSM signal (always needs-review) ----
    default:
      return needsReview()
  }
}

const met = (explanation) => ({ status: 'met', stepId: null, explanation })
const gap = (explanation, stepId) => ({ status: 'gap', stepId: stepId ?? null, explanation })
const needsReview = () => ({
  status: 'needs-review',
  stepId: null,
  explanation: 'Cannot be inferred from the value stream; assess manually.',
})

const OVERRIDE_STATUSES = new Set(['met', 'gap', 'needs-review'])

/**
 * Apply a user decision (override/confirm/reset) over an inferred result.
 * overrides[itemId] may be:
 *   'met' | 'gap' | 'needs-review'  -> override to that status (source: overridden)
 *   'confirmed'                     -> keep inferred status (source: confirmed)
 *   absent / unrecognized           -> inferred (source: inferred)
 *
 * Unrecognized values (e.g. from corrupted storage) fall back to the inferred
 * status rather than leaking a bad value into the rendered status.
 */
function applyOverride(inferred, decision) {
  if (decision === 'confirmed') return { ...inferred, source: 'confirmed' }
  if (OVERRIDE_STATUSES.has(decision)) return { ...inferred, status: decision, source: 'overridden' }
  return { ...inferred, source: 'inferred' }
}

/**
 * Score CD readiness for a value stream.
 * @param {Array} steps - Process steps
 * @param {Array} connections - Connections between steps
 * @param {Object} [overrides] - Per-item user decisions keyed by item id
 * @returns {Array} 13 readiness item results
 */
export function calculateCdReadiness(steps = [], connections = [], overrides = {}) {
  return MINIMUM_CD_READINESS_ITEMS.map((item) => {
    const inferred = inferItem(item.id, steps, connections)
    // `signal` preserves the raw VSM-derived status independent of any user
    // override, so a reset can restore it and the UI can show the inferred value.
    const resolved = applyOverride(
      { ...inferred, signal: inferred.status },
      overrides[item.id]
    )
    return {
      id: item.id,
      label: item.label,
      kind: item.kind,
      link: item.link,
      ...resolved,
    }
  })
}
