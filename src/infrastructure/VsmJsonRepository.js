/**
 * VSM JSON Repository
 * Handles serialization and deserialization of VSM data to/from JSON format
 * Separates infrastructure concerns from domain store
 */

/**
 * Serialize VSM domain object to JSON string
 * @param {Object} vsm - VSM domain object
 * @param {string} vsm.id - VSM identifier
 * @param {string} vsm.name - VSM name
 * @param {string} vsm.description - VSM description
 * @param {Array} vsm.steps - VSM steps
 * @param {Array} vsm.connections - VSM connections
 * @param {string} vsm.createdAt - Creation timestamp
 * @param {string} vsm.updatedAt - Update timestamp
 * @returns {string} JSON string representation
 */
export function serializeVsm(vsm) {
  const { id, name, description, steps, connections, createdAt, updatedAt } = vsm
  return JSON.stringify(
    { id, name, description, steps, connections, createdAt, updatedAt },
    null,
    2
  )
}

/**
 * Deserialize JSON string to VSM domain object
 * @param {string} jsonString - JSON string to parse
 * @returns {Object} VSM domain object with defaults applied
 * @throws {Error} If JSON parsing fails
 */
export function deserializeVsm(jsonString) {
  const data = JSON.parse(jsonString)

  // Validate structure
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid VSM data: not an object')
  }

  if (data.steps && !Array.isArray(data.steps)) {
    throw new Error('Invalid VSM data: steps must be an array')
  }

  if (data.connections && !Array.isArray(data.connections)) {
    throw new Error('Invalid VSM data: connections must be an array')
  }

  return {
    id: data.id || crypto.randomUUID(),
    name: data.name || 'Imported Map',
    description: data.description || '',
    steps: data.steps || [],
    connections: data.connections || [],
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
