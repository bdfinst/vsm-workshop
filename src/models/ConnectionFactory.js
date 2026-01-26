/**
 * Factory function for creating VSM connections
 * @param {string} source - The source step ID
 * @param {string} target - The target step ID
 * @param {string} type - The connection type ('forward' or 'rework')
 * @param {number} reworkRate - The rework rate (0-100)
 * @returns {Object} A new connection object
 */
export const createConnection = (
  source,
  target,
  type = 'forward',
  reworkRate = 0
) => ({
  id: `${source}-${target}`,
  source,
  target,
  type,
  reworkRate,
})
