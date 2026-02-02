/**
 * VSM Data Validator
 * Validates and sanitizes VSM data structures
 */

/**
 * Validate VSM data structure
 * @param {*} data - Data to validate
 * @returns {Object} Validation result with { valid, errors, data }
 */
export function validateVSMData(data) {
  const errors = []

  // Basic type checks
  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object')
    return { valid: false, errors, data: null }
  }

  // Required fields
  if (!Object.prototype.hasOwnProperty.call(data, 'id')) {
    errors.push('Missing field: id')
  }
  if (!Object.prototype.hasOwnProperty.call(data, 'name')) {
    errors.push('Missing field: name')
  }
  if (!Object.prototype.hasOwnProperty.call(data, 'steps')) {
    errors.push('Missing field: steps')
  }
  if (!Object.prototype.hasOwnProperty.call(data, 'connections')) {
    errors.push('Missing field: connections')
  }

  // Type validation
  if (data.steps !== undefined && !Array.isArray(data.steps)) {
    errors.push('steps must be an array')
  }
  if (data.connections !== undefined && !Array.isArray(data.connections)) {
    errors.push('connections must be an array')
  }

  // Validate steps structure
  if (Array.isArray(data.steps)) {
    data.steps.forEach((step, index) => {
      if (!step || typeof step !== 'object') {
        errors.push(`Step ${index}: must be an object`)
        return
      }
      if (!step.id) {
        errors.push(`Step ${index}: missing id`)
      }
      if (!step.name) {
        errors.push(`Step ${index}: missing name`)
      }
      if (
        step.processTime !== undefined &&
        typeof step.processTime !== 'number'
      ) {
        errors.push(`Step ${index}: processTime must be a number`)
      }
      if (step.leadTime !== undefined && typeof step.leadTime !== 'number') {
        errors.push(`Step ${index}: leadTime must be a number`)
      }
    })
  }

  // Validate connections structure
  if (Array.isArray(data.connections)) {
    data.connections.forEach((conn, index) => {
      if (!conn || typeof conn !== 'object') {
        errors.push(`Connection ${index}: must be an object`)
        return
      }
      if (!conn.id) {
        errors.push(`Connection ${index}: missing id`)
      }
      if (!conn.source) {
        errors.push(`Connection ${index}: missing source`)
      }
      if (!conn.target) {
        errors.push(`Connection ${index}: missing target`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : null,
  }
}

/**
 * Sanitize and normalize VSM data with safe defaults
 * @param {*} data - Raw data to sanitize
 * @returns {Object} Sanitized VSM data
 */
export function sanitizeVSMData(data) {
  if (!data || typeof data !== 'object') {
    return {
      id: null,
      name: '',
      description: '',
      steps: [],
      connections: [],
      createdAt: null,
      updatedAt: null,
    }
  }

  return {
    id: data.id || null,
    name: data.name || '',
    description: data.description || '',
    steps: Array.isArray(data.steps) ? data.steps : [],
    connections: Array.isArray(data.connections) ? data.connections : [],
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  }
}
