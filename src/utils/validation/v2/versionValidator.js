import {
  CURRENT_LABEL,
  INTAKE_NAME,
  STEP_KIND,
  VERSION_KIND,
} from '../../../models/v2/constants.js'
import { validateReworkPath } from './reworkPathValidator.js'
import { createErrorCollector, isRecord, toResult } from './result.js'
import { validateStep } from './stepValidator.js'

const MAX_FOCUS_ITEMS = 2

const normalize = (label) => label.trim().toLowerCase()

const validateLabel = (version, otherVersions) => {
  if (typeof version.label !== 'string' || version.label.trim() === '') {
    return 'Label is required'
  }
  const label = normalize(version.label)
  if (
    version.kind === VERSION_KIND.FUTURE &&
    label === normalize(CURRENT_LABEL)
  ) {
    return `"${CURRENT_LABEL}" is reserved`
  }
  const taken = otherVersions.some(
    (other) =>
      other.id !== version.id &&
      typeof other.label === 'string' &&
      normalize(other.label) === label
  )
  return taken ? 'Another version already has this label' : null
}

const validateFocusItems = (focusItems) => {
  if (!Array.isArray(focusItems)) return 'Focus items must be a list'
  return focusItems.length > MAX_FOCUS_ITEMS
    ? `Pick at most ${MAX_FOCUS_ITEMS} focus items`
    : null
}

// Step order and ids, then each step's own values. A step that is not an
// object is reported at its position and skipped.
const validateStepStructure = (steps, { set, addAll }) => {
  if (!Array.isArray(steps)) return set('steps', 'Steps must be a list')

  if (steps.length === 0) {
    set('steps', 'A version needs an Intake step first')
  } else if (
    steps[0]?.name !== INTAKE_NAME ||
    steps[0]?.kind !== STEP_KIND.TEAM
  ) {
    set('steps[0]', 'The first step must be the team step Intake')
  }
  if (new Set(steps.map((step) => step?.id)).size !== steps.length) {
    set('steps', 'Step ids must be unique')
  }
  steps.forEach((step, index) => {
    const field = `steps[${index}]`
    if (isRecord(step)) addAll(field, validateStep(step))
    else set(field, 'Step must be an object')
  })
}

const validateReworkPaths = (reworkPaths, steps, { set, addAll }) => {
  if (!Array.isArray(reworkPaths)) {
    return set('reworkPaths', 'Rework paths must be a list')
  }
  if (!Array.isArray(steps)) return
  reworkPaths.forEach((path, index) => {
    const field = `reworkPaths[${index}]`
    if (isRecord(path)) addAll(field, validateReworkPath(path, steps))
    else set(field, 'Rework path must be an object')
  })
}

/**
 * Validate a v2 map version: label, focus items, step order and values, and
 * rework paths. Completeness and rework share sums are stage statuses and are
 * not checked here. A malformed version gives errors, never a throw.
 * @param {Object} version - A v2 map version
 * @param {Object[]} [otherVersions] - The stream's versions, for label uniqueness
 * @returns {{valid: boolean, errors: Object<string, string>}}
 */
export const validateVersion = (version, otherVersions = []) => {
  const collector = createErrorCollector()
  const { set } = collector

  if (!Object.values(VERSION_KIND).includes(version.kind)) {
    set('kind', 'Kind must be current or future')
  }
  set('label', validateLabel(version, otherVersions))
  set('focusItems', validateFocusItems(version.focusItems))
  validateStepStructure(version.steps, collector)
  validateReworkPaths(version.reworkPaths, version.steps, collector)

  return toResult(collector.errors)
}
