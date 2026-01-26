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
    if (
      connectionData.reworkRate < 0 ||
      connectionData.reworkRate > 100
    ) {
      errors.reworkRate = 'Rework rate must be between 0 and 100'
    }
    if (connectionData.reworkRate === 0) {
      errors.reworkRate = 'Rework connections need a rate > 0'
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
