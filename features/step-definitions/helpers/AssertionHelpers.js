import { expect } from 'chai'

/**
 * Helper functions for common assertion patterns in step definitions
 */

/**
 * Assert that a connection exists with specific properties
 * @param {Object} connection - The connection to assert
 * @param {string} type - Expected connection type ('forward' or 'rework')
 */
export function assertConnectionType(connection, type) {
  expect(connection).to.exist
  expect(connection.type).to.equal(type)
}

/**
 * Assert that a connection has the expected rework rate
 * @param {Object} connection - The connection to check
 * @param {number} expectedRate - Expected rework rate
 */
export function assertReworkRate(connection, expectedRate) {
  expect(connection).to.exist
  expect(connection.reworkRate).to.equal(expectedRate)
}

/**
 * Assert that a step has the expected queue size
 * @param {Object} step - The step to check
 * @param {number} expectedSize - Expected queue size
 */
export function assertQueueSize(step, expectedSize) {
  expect(step.queueSize).to.equal(expectedSize)
}

/**
 * Assert that a step is marked as a bottleneck
 * @param {string} stepId - The step ID to check
 * @param {Array} bottlenecks - Array of bottleneck IDs
 */
export function assertIsBottleneck(stepId, bottlenecks) {
  expect(bottlenecks).to.include(stepId)
}

/**
 * Assert that a step has the expected batch size
 * @param {Object} step - The step to check
 * @param {number} expectedSize - Expected batch size
 */
export function assertBatchSize(step, expectedSize) {
  expect(step.batchSize).to.equal(expectedSize)
}

/**
 * Assert batch badge format
 * @param {Object} step - The step with batch size
 * @param {string} expected - Expected badge text (e.g., "3x")
 */
export function assertBatchBadge(step, expected) {
  expect(`${step.batchSize}x`).to.equal(expected)
}

/**
 * Assert that a step has pre-configured timing
 * @param {Object} step - The step to check
 */
export function assertHasTimingConfiguration(step) {
  expect(step.processTime).to.be.greaterThan(0)
  expect(step.leadTime).to.be.greaterThan(0)
}

/**
 * Assert that a VSM has minimum number of steps
 * @param {Array} steps - Steps array
 * @param {number} minCount - Minimum number of steps
 */
export function assertMinimumSteps(steps, minCount) {
  expect(steps.length).to.be.at.least(minCount)
}

/**
 * Assert that a VSM has minimum number of connections
 * @param {Array} connections - Connections array
 * @param {number} minCount - Minimum number of connections
 */
export function assertMinimumConnections(connections, minCount) {
  expect(connections.length).to.be.at.least(minCount)
}

/**
 * Assert that rework impact has specific status
 * @param {Object} reworkImpact - Rework impact calculation result
 * @param {string} expectedStatus - Expected status ('good', 'warning', or 'critical')
 */
export function assertReworkStatus(reworkImpact, expectedStatus) {
  expect(reworkImpact.status).to.equal(expectedStatus)
}

/**
 * Assert that effective lead time is greater than base lead time
 * @param {number} effectiveLeadTime - Effective lead time with rework
 * @param {number} baseLeadTime - Base lead time without rework
 */
export function assertReworkImpact(effectiveLeadTime, baseLeadTime) {
  expect(effectiveLeadTime).to.be.greaterThan(baseLeadTime)
}

/**
 * Assert that a value matches expected display format
 * @param {string} actual - Actual display value
 * @param {string} expected - Expected display value
 */
export function assertDisplayValue(actual, expected) {
  expect(actual).to.equal(expected)
}

/**
 * Assert that rework multiplier matches expected value
 * @param {Object} reworkImpact - Rework impact result
 * @param {string} expectedMultiplier - Expected multiplier string (e.g., "1.25x")
 */
export function assertReworkMultiplier(reworkImpact, expectedMultiplier) {
  // Format the multiplier to match expected precision and compare exactly
  const actualMultiplier = `${reworkImpact.reworkMultiplier}x`
  expect(actualMultiplier).to.equal(expectedMultiplier)
}

/**
 * Assert that there are no rework connections
 * @param {Array} connections - Connections array
 */
export function assertNoReworkConnections(connections) {
  const reworkConns = connections.filter((c) => c.type === 'rework')
  expect(reworkConns).to.have.lengthOf(0)
}

/**
 * Assert queue size is greater than zero (queue badge visible)
 * @param {Object} step - The step to check
 */
export function assertQueueBadgeVisible(step) {
  expect(step.queueSize).to.be.greaterThan(0)
}

/**
 * Assert queue is at high threshold
 * @param {Object} step - The step to check
 * @param {number} threshold - High queue threshold (default: 5)
 */
export function assertHighQueueThreshold(step, threshold = 5) {
  expect(step.queueSize).to.be.at.least(threshold)
}
