/**
 * Domain validation for VSM Connection entity
 * Enforces business rules for connection data
 */

/**
 * Validate connection data
 * @param {Object} connectionData - Connection data to validate
 * @returns {Object} Validation result with valid flag and errors object
 */
export function validateConnection(connectionData) {
  const errors = {}

  if (connectionData.type === 'rework') {
    const rate = connectionData.reworkRate
    if (rate === undefined || rate === null || typeof rate !== 'number' || isNaN(rate)) {
      errors.reworkRate = 'Rework rate is required and must be a number'
    } else if (rate < 0 || rate > 100) {
      errors.reworkRate = 'Rework rate must be between 0 and 100'
    } else if (rate === 0) {
      errors.reworkRate = 'Rework connections need a rate > 0'
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
