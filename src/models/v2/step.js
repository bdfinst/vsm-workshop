import { FULL_PCT_CA, STEP_KIND, TIME_SOURCE, isOutside } from './constants.js'

const TEAM_TIME_FIELDS = Object.freeze(['processTime', 'waitTime'])
const OUTSIDE_TIME_FIELDS = Object.freeze(['elapsedTime'])

/** Every time field a step can hold, whatever its kind. */
export const TIME_FIELDS = Object.freeze([
  ...TEAM_TIME_FIELDS,
  ...OUTSIDE_TIME_FIELDS,
])

/**
 * The time fields a step of this kind holds.
 * @param {string} kind - STEP_KIND.TEAM or STEP_KIND.OUTSIDE
 * @returns {readonly string[]}
 */
export const timeFieldsOf = (kind) =>
  isOutside({ kind }) ? OUTSIDE_TIME_FIELDS : TEAM_TIME_FIELDS

/**
 * Create a v2 step.
 * Team steps carry process and wait time; outside steps carry one elapsed time
 * and are always handoffs. Time values stay `typ: null` until entered.
 * @param {Object} [overrides] - Fields to override
 * @returns {Object} A new step
 */
export const createStep = (overrides = {}) => {
  const kind = overrides.kind ?? STEP_KIND.TEAM
  const outside = isOutside({ kind })
  const times = Object.fromEntries(
    timeFieldsOf(kind).map((field) => [field, { typ: null }])
  )

  return {
    id: crypto.randomUUID(),
    originStepId: null,
    name: '',
    description: '',
    performedBy: '',
    kind,
    isHandoff: false,
    ...times,
    timeSource: TIME_SOURCE.ESTIMATE,
    pctCA: null,
    notes: '',
    position: { x: 0, y: 0 },
    ...overrides,
    ...(outside && { isHandoff: true }),
  }
}

/**
 * Whether a step passes less than all its work on as complete and accurate: its
 * %C/A is entered and below 100, so some of what it passes on comes back. A
 * step with no %C/A entered has no known rejects, and a step at 100 has none.
 * @param {{pctCA: ?number}} step - A v2 step
 * @returns {boolean}
 */
export const hasRejects = (step) =>
  typeof step.pctCA === 'number' && step.pctCA < FULL_PCT_CA
