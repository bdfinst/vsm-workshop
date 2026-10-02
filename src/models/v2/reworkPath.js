/**
 * Create a v2 rework path from one step back to an earlier (or the same) step.
 * `reworkProcessTime` is optional and omitted until given.
 * @param {Object} overrides - Fields; fromStepId and toStepId are required in practice
 * @returns {Object} A new rework path
 */
export const createReworkPath = (overrides = {}) => ({
  id: crypto.randomUUID(),
  fromStepId: null,
  toStepId: null,
  shareOfRejects: 100,
  note: '',
  ...overrides,
})

/**
 * Whether the path starts or ends at the step; deleting the step removes it.
 * @param {{fromStepId: string, toStepId: string}} path - A rework path
 * @param {string} stepId - The step's id
 * @returns {boolean}
 */
export const pathTouchesStep = (path, stepId) =>
  path.fromStepId === stepId || path.toStepId === stepId
