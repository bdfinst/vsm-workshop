/**
 * MinimumCD readiness reference data
 *
 * The CD Readiness Scorecard scores 13 items for a value stream:
 * - the 9 MinimumCD core practices (kind: 'practice'), and
 * - 4 VSM-derived flow readiness signals (kind: 'signal').
 *
 * This module is reference data only — it carries no inference logic.
 * The inference engine lives in src/utils/calculations/cdReadiness.js.
 *
 * Source: https://beyond.minimumcd.org/docs/reference/practices/
 */

const PRACTICES_URL = 'https://beyond.minimumcd.org/docs/reference/practices/'
const FOUNDATIONS_URL = 'https://beyond.minimumcd.org/docs/migrate-to-cd/foundations/'
const OPTIMIZE_URL = 'https://beyond.minimumcd.org/docs/migrate-to-cd/optimize/'

/**
 * @typedef {Object} ReadinessItem
 * @property {string} id - Stable identifier
 * @property {string} label - Display name
 * @property {'practice'|'signal'} kind - Core practice vs. flow signal
 * @property {string} phase - The MinimumCD phase a gap typically maps to
 * @property {string} link - Deep link to beyond.minimumcd.org
 */

/** The 9 MinimumCD core practices. @type {ReadinessItem[]} */
export const CORE_PRACTICES = [
  {
    id: 'continuous-integration',
    label: 'Continuous Integration',
    kind: 'practice',
    phase: 'Foundations',
    link: PRACTICES_URL,
  },
  {
    id: 'trunk-based-development',
    label: 'Trunk-Based Development',
    kind: 'practice',
    phase: 'Foundations',
    link: PRACTICES_URL,
  },
  {
    id: 'single-path-to-production',
    label: 'Single Path to Production',
    kind: 'practice',
    phase: 'Pipeline',
    link: PRACTICES_URL,
  },
  {
    id: 'deterministic-pipeline',
    label: 'Deterministic Pipeline',
    kind: 'practice',
    phase: 'Pipeline',
    link: PRACTICES_URL,
  },
  {
    id: 'definition-of-deployable',
    label: 'Definition of Deployable',
    kind: 'practice',
    phase: 'Pipeline',
    link: PRACTICES_URL,
  },
  {
    id: 'immutable-artifacts',
    label: 'Immutable Artifacts',
    kind: 'practice',
    phase: 'Pipeline',
    link: PRACTICES_URL,
  },
  {
    id: 'production-like-environments',
    label: 'Production-Like Environments',
    kind: 'practice',
    phase: 'Pipeline',
    link: PRACTICES_URL,
  },
  {
    id: 'rollback',
    label: 'Rollback',
    kind: 'practice',
    phase: 'Pipeline',
    link: PRACTICES_URL,
  },
  {
    id: 'application-configuration',
    label: 'Application Configuration',
    kind: 'practice',
    phase: 'Pipeline',
    link: PRACTICES_URL,
  },
]

/** The 4 VSM-derived flow readiness signals. @type {ReadinessItem[]} */
export const READINESS_SIGNALS = [
  {
    id: 'work-decomposition',
    label: 'Work Decomposition',
    kind: 'signal',
    phase: 'Foundations',
    link: FOUNDATIONS_URL,
  },
  {
    id: 'testing-fundamentals',
    label: 'Testing Fundamentals',
    kind: 'signal',
    phase: 'Foundations',
    link: FOUNDATIONS_URL,
  },
  {
    id: 'wip-limits',
    label: 'Work In Progress Limits',
    kind: 'signal',
    phase: 'Optimize',
    link: OPTIMIZE_URL,
  },
  {
    id: 'small-batches',
    label: 'Small Batches',
    kind: 'signal',
    phase: 'Optimize',
    link: OPTIMIZE_URL,
  },
]

/** All 13 readiness items (9 practices + 4 signals). @type {ReadinessItem[]} */
export const MINIMUM_CD_READINESS_ITEMS = [...CORE_PRACTICES, ...READINESS_SIGNALS]
