import { CURRENT_LABEL, INTAKE_NAME, VERSION_KIND } from './constants.js'
import { createStep } from './step.js'

/**
 * Create a v2 map version. It starts with the locked Intake step.
 * @param {Object} [overrides] - Fields to override
 * @returns {Object} A new map version
 */
export const createMapVersion = (overrides = {}) => ({
  id: crypto.randomUUID(),
  kind: VERSION_KIND.CURRENT,
  label: CURRENT_LABEL,
  basedOnVersionId: null,
  focusItems: [],
  steps: [createStep({ name: INTAKE_NAME })],
  reworkPaths: [],
  createdAt: new Date().toISOString(),
  ...overrides,
})

/**
 * Copy a map version for a new state. Steps and rework paths get new ids; each
 * copied step remembers the step it came from in `originStepId`, and paths
 * keep pointing at the copied steps. The copy starts with no focus items.
 * @param {Object} source - The version to copy (not changed)
 * @param {Object} [overrides] - Fields to override, such as kind and label
 * @returns {Object} A new map version based on `source`
 */
export const copyMapVersion = (source, overrides = {}) => {
  const newIds = new Map(
    source.steps.map((step) => [step.id, crypto.randomUUID()])
  )

  return createMapVersion({
    basedOnVersionId: source.id,
    steps: source.steps.map((step) => ({
      ...structuredClone(step),
      id: newIds.get(step.id),
      originStepId: step.id,
    })),
    reworkPaths: source.reworkPaths.map((path) => ({
      ...structuredClone(path),
      id: crypto.randomUUID(),
      fromStepId: newIds.get(path.fromStepId),
      toStepId: newIds.get(path.toStepId),
    })),
    ...overrides,
  })
}
