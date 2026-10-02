import { STEP_KIND, TIME_SOURCE, isOutside } from './constants.js'

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
  const times = outside
    ? { elapsedTime: { typ: null } }
    : { processTime: { typ: null }, waitTime: { typ: null } }

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
