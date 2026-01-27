import { STEP_TYPES } from '../data/stepTypes.js'

/**
 * @typedef {Object} Step
 * @property {string} id - Auto-generated unique identifier (UUID)
 * @property {string} name - Step name (e.g., "Development", "Testing")
 * @property {string} type - Step type constant from STEP_TYPES
 * @property {string} description - Optional step description
 * @property {number} processTime - Active work time in minutes (hands-on-keyboard)
 * @property {number} leadTime - Total elapsed time in minutes (includes waiting)
 * @property {number} percentCompleteAccurate - Quality metric: % passing to next step without rework (0-100)
 * @property {number} queueSize - Number of items waiting to enter this step
 * @property {number} batchSize - Number of items processed together
 * @property {number} peopleCount - Number of resources/people available
 * @property {string[]} tools - Array of tools/technologies used (e.g., ["IDE", "Git"])
 * @property {{x: number, y: number}} position - Canvas position for React Flow visualization
 */

/**
 * Factory function for creating VSM step objects
 * Factory function pattern - see .claude/examples/factory-functions.md
 *
 * Domain rules (validated separately):
 * - Times must be in minutes (not seconds or hours)
 * - Percentages as 0-100 (not 0-1 decimals)
 * - Lead time should be >= Process time (validated by stepValidator)
 *
 * @param {string} name - The step name (required)
 * @param {Partial<Step>} overrides - Optional property overrides for defaults
 * @returns {Step} A new step object with generated UUID
 *
 * @example
 * // Basic step
 * const step = createStep('Development')
 *
 * @example
 * // Step with custom values
 * const step = createStep('Testing', {
 *   processTime: 30,
 *   leadTime: 120,
 *   percentCompleteAccurate: 95
 * })
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
