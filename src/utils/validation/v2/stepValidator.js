import {
  STEP_KIND,
  TIME_SOURCE,
  isOutside,
} from '../../../models/v2/constants.js'
import { createErrorCollector, toResult } from './result.js'
import { validateTimeRange } from './timeRangeValidator.js'

const isOneOf = (allowed, value) => Object.values(allowed).includes(value)

const validateCommon = (step, { set }) => {
  if (typeof step.name !== 'string') set('name', 'Name must be text')
  if (!isOneOf(STEP_KIND, step.kind)) {
    set('kind', 'Kind must be team or outside')
  }
  if (!isOneOf(TIME_SOURCE, step.timeSource)) {
    set('timeSource', 'Time source must be estimate or measured')
  }
  if (
    step.pctCA != null &&
    !(typeof step.pctCA === 'number' && step.pctCA >= 0 && step.pctCA <= 100)
  ) {
    set('pctCA', '%C/A must be between 0 and 100')
  }
}

const validateOutsideTimes = (step, { set }) => {
  set(
    'elapsedTime',
    validateTimeRange(step.elapsedTime, {
      label: 'Elapsed time',
      mustBePositive: true,
    })
  )
  if (step.processTime) {
    set('processTime', 'An outside step has no process time')
  }
  if (step.waitTime) set('waitTime', 'An outside step has no wait time')
  if (step.isHandoff !== true) {
    set('isHandoff', 'An outside step is always a handoff')
  }
}

const validateTeamTimes = (step, { set }) => {
  set(
    'processTime',
    validateTimeRange(step.processTime, { label: 'Process time' })
  )
  set('waitTime', validateTimeRange(step.waitTime, { label: 'Wait time' }))
  if (step.elapsedTime) set('elapsedTime', 'A team step has no elapsed time')
}

/**
 * Validate a v2 step's values. Completeness (missing names or times) is a
 * stage status, not an error here: unset values (`null`) pass.
 * @param {Object} step - A v2 step
 * @returns {{valid: boolean, errors: Object<string, string>}}
 */
export const validateStep = (step) => {
  const collector = createErrorCollector()

  validateCommon(step, collector)
  if (isOutside(step)) validateOutsideTimes(step, collector)
  else validateTeamTimes(step, collector)

  return toResult(collector.errors)
}
