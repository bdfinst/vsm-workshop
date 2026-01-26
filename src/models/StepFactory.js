import { STEP_TYPES } from '../data/stepTypes.js'

/**
 * Factory function for creating VSM steps
 * @param {string} name - The name of the step
 * @param {Object} overrides - Optional overrides for default values
 * @returns {Object} A new step object
 */
export const createStep = (name, overrides = {}) => {
  return {
    id: crypto.randomUUID(),
    name,
    type: STEP_TYPES.CUSTOM,
    description: '',
    processTime: 60,
    leadTime: 240,
    percentCompleteAccurate: 100,
    queueSize: 0,
    batchSize: 1,
    peopleCount: 1,
    tools: [],
    position: { x: 0, y: 0 },
    ...overrides,
  }
}
