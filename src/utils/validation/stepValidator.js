/**
 * Domain validation for VSM Step entity
 * Enforces business rules for step data
 */

/**
 * Validate step data
 * @param {Object} stepData - Step data to validate
 * @returns {Object} Validation result with valid flag and errors object
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
