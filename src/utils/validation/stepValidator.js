/**
 * Domain validation for VSM Step entity
 * Enforces business rules for step data
 *
 * See: .claude/rules/vsm-domain.md#validation-rules
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - True if all validations pass
 * @property {Object<string, string>} errors - Map of field names to error messages
 */

/**
 * @typedef {Object} Step
 * @property {string} name - Step name
 * @property {number} processTime - Active work time (minutes)
 * @property {number} leadTime - Total elapsed time (minutes)
 * @property {number} percentCompleteAccurate - Quality metric (0-100)
 * @property {number} queueSize - Items waiting
 * @property {number} batchSize - Items processed together
 * @property {number} [peopleCount] - Resources available
 */

/**
 * Validate step data against VSM domain rules
 *
 * Domain rules enforced:
 * - Name must not be empty
 * - Process time >= 0
 * - Lead time >= 0
 * - Lead time >= Process time (waiting time cannot be negative)
 * - %C&A between 0-100 (percentage format)
 * - Queue size >= 0
 * - Batch size >= 1 (must process at least one item)
 * - People count >= 1 (if specified)
 *
 * @param {Partial<Step>} stepData - Step data to validate
 * @returns {ValidationResult} Validation result with errors keyed by field name
 *
 * @example
 * const result = validateStep({
 *   name: 'Development',
 *   processTime: 60,
 *   leadTime: 240
 * })
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors)
 * }
 *
 * @example
 * // Invalid: lead time < process time
 * const result = validateStep({
 *   name: 'Test',
 *   processTime: 100,
 *   leadTime: 50
 * })
 * // result.errors.leadTime = 'Lead time must be >= process time'
 */
export function validateStep(stepData) {
  const errors = {}

  if (!stepData.name || !stepData.name.trim()) {
    errors.name = 'Name is required'
  }

  if (stepData.processTime < 0) {
    errors.processTime = 'Process time must be >= 0'
  }

  if (stepData.leadTime < 0) {
    errors.leadTime = 'Lead time must be >= 0'
  }

  if (stepData.leadTime < stepData.processTime) {
    errors.leadTime = 'Lead time must be >= process time'
  }

  if (
    stepData.percentCompleteAccurate < 0 ||
    stepData.percentCompleteAccurate > 100
  ) {
    errors.percentCompleteAccurate = '%C&A must be between 0 and 100'
  }

  if (stepData.queueSize < 0) {
    errors.queueSize = 'Queue size must be >= 0'
  }

  if (stepData.batchSize < 1) {
    errors.batchSize = 'Batch size must be >= 1'
  }

  if (stepData.peopleCount !== undefined && stepData.peopleCount < 1) {
    errors.peopleCount = 'People count must be >= 1'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
