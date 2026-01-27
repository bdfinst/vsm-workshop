/**
 * @typedef {Object} Connection
 * @property {string} id - Composite ID in format "sourceId-targetId"
 * @property {string} source - Source step ID (where work flows from)
 * @property {string} target - Target step ID (where work flows to)
 * @property {'forward'|'rework'} type - Connection type
 *   - 'forward': Standard process flow (solid line)
 *   - 'rework': Loop back for corrections (dashed line)
 * @property {number} reworkRate - Percentage routed to rework (0-100, only meaningful for rework type)
 */

/**
 * Factory function for creating VSM connection objects
 * Factory function pattern - see .claude/examples/factory-functions.md
 *
 * Connections represent flow between steps:
 * - Forward connections: Normal process flow
 * - Rework connections: Quality failures looping back
 *
 * Domain rules:
 * - Forward connections have reworkRate = 0
 * - Rework connections must point to earlier step
 * - One step can have multiple outgoing connections
 *
 * @param {string} source - Source step ID (required)
 * @param {string} target - Target step ID (required)
 * @param {'forward'|'rework'} type - Connection type (default: 'forward')
 * @param {number} reworkRate - Rework percentage 0-100 (default: 0)
 * @returns {Connection} A new connection object
 *
 * @example
 * // Forward connection (standard flow)
 * const conn = createConnection('step-1', 'step-2')
 *
 * @example
 * // Rework connection (quality failure loop)
 * const conn = createConnection('step-2', 'step-1', 'rework', 15)
 * // 15% of items from step-2 loop back to step-1
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
