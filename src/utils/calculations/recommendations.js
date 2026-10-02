/**
 * Constraint → countermeasure recommendations (P2)
 *
 * Turns detected CD-readiness gaps into prescriptive, deep-linked countermeasures,
 * prioritizing the gaps that sit on the flow constraint (Theory of Constraints:
 * fix the bottleneck first).
 *
 * Iterative framing — recommendations point at practices/constraints, never a
 * single migration phase (beyond.minimumcd.org phases run simultaneously).
 *
 * Pure function. Consumes the output of calculateCdReadiness, so the inference
 * logic is not duplicated here.
 */

/** Prescriptive countermeasure per readiness item id. */
const COUNTERMEASURES = {
  'work-decomposition': 'Slice work so each item completes within two days; integrate sooner.',
  'testing-fundamentals':
    'Re-architect the test suite to run in under 10 minutes — parallelize and replace slow dependencies.',
  'wip-limits': 'Set an explicit WIP limit on this step so it acts as a flow governor.',
  'small-batches': 'Reduce batch size; integrate and release smaller increments.',
  'single-path-to-production':
    'Automate one path to production and remove manual or duplicate deployment steps.',
  'continuous-integration': 'Integrate to trunk at least daily behind automated tests.',
  'definition-of-deployable':
    'Define automated "definition of deployable" criteria so work does not bounce back.',
  rollback: 'Add an automated rollback path that recovers production within minutes.',
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

/**
 * Generate prioritized countermeasure recommendations from readiness gaps.
 * @param {Array} readinessItems - Output of calculateCdReadiness
 * @param {string[]} [bottleneckStepIds] - Step ids flagged as the constraint
 * @returns {Array} Recommendations sorted constraint-first
 */
export function generateRecommendations(readinessItems = [], bottleneckStepIds = []) {
  const onConstraint = new Set(bottleneckStepIds)

  const recs = readinessItems
    .filter((item) => item.status === 'gap' && COUNTERMEASURES[item.id])
    .map((item) => ({
      id: item.id,
      title: item.label,
      finding: item.explanation,
      countermeasure: COUNTERMEASURES[item.id],
      link: item.link,
      targetStepId: item.stepId ?? null,
      priority: item.stepId && onConstraint.has(item.stepId) ? 'high' : 'medium',
    }))

  return recs.sort((a, b) => {
    const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    return byPriority !== 0 ? byPriority : a.title.localeCompare(b.title)
  })
}
