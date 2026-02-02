/**
 * VSM Metrics Calculations
 *
 * Pure functions for calculating value stream metrics.
 * All times are in minutes, percentages as 0-100.
 *
 * See: .claude/rules/vsm-domain.md#metric-calculations
 */

// ==============================================================================
// TYPE DEFINITIONS
// ==============================================================================

/**
 * @typedef {Object} Step
 * @property {string} id
 * @property {string} name
 * @property {number} processTime - Active work time (minutes)
 * @property {number} leadTime - Total elapsed time (minutes)
 * @property {number} percentCompleteAccurate - Quality metric (0-100)
 * @property {number} queueSize - Items waiting
 */

/**
 * @typedef {Object} Connection
 * @property {string} source - Source step ID
 * @property {string} target - Target step ID
 * @property {'forward'|'rework'} type
 * @property {number} reworkRate - Percentage (0-100)
 */

/**
 * @typedef {Object} Metrics
 * @property {number} totalLeadTime - Sum of all lead times (minutes)
 * @property {number} totalProcessTime - Sum of all process times (minutes)
 * @property {Object} flowEfficiency - Efficiency calculation result
 * @property {number} flowEfficiency.value - Percentage (0-100)
 * @property {string} flowEfficiency.label - Status label
 * @property {Object} firstPassYield - Quality metric result
 * @property {number} firstPassYield.value - Percentage (0-100)
 * @property {string} firstPassYield.label - Status label
 * @property {number} stepCount - Number of steps
 * @property {number} totalQueueSize - Sum of all queue sizes
 * @property {number} activityRatio - Process time / Lead time ratio
 * @property {number} reworkImpact - Estimated rework overhead
 * @property {string[]} bottleneckIds - IDs of bottleneck steps
 */

// ==============================================================================
// PRIMARY API - Use these functions as entry points
// ==============================================================================

// Time constants
const MINUTES_PER_WORK_DAY = 480

/**
 * Calculate all metrics for a value stream (Main facade function)
 *
 * This is the primary entry point for metric calculations.
 * Computes comprehensive VSM metrics including:
 * - Time metrics (lead time, process time)
 * - Quality metrics (flow efficiency, first pass yield)
 * - Bottleneck identification
 * - Rework impact analysis
 *
 * @param {Step[]} steps - Array of process steps
 * @param {Connection[]} connections - Array of connections between steps
 * @returns {Metrics} All calculated metrics
 *
 * @example
 * const metrics = calculateMetrics(steps, connections)
 * console.log(metrics.flowEfficiency.value) // 25
 * console.log(metrics.bottleneckIds) // ['step-2', 'step-5']
 */
export function calculateMetrics(steps = [], connections = []) {
  return {
    totalLeadTime: calculateTotalLeadTime(steps),
    totalProcessTime: calculateTotalProcessTime(steps),
    flowEfficiency: calculateFlowEfficiency(steps),
    firstPassYield: calculateFirstPassYield(steps),
    stepCount: steps.length,
    totalQueueSize: calculateTotalQueueSize(steps),
    activityRatio: calculateActivityRatio(steps),
    reworkImpact: calculateReworkImpact(steps, connections),
    bottleneckIds: identifyBottlenecks(steps),
  }
}

/**
 * Format duration for display
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration string
 */
export function formatDuration(minutes) {
  if (minutes === 0) return '0m'
  if (minutes < 60) return `${minutes}m`
  if (minutes < MINUTES_PER_WORK_DAY) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  const days = Math.floor(minutes / MINUTES_PER_WORK_DAY)
  const remainingMinutes = minutes % MINUTES_PER_WORK_DAY
  const hours = Math.floor(remainingMinutes / 60)
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`
}

// ==============================================================================
// CALCULATION UTILITIES - Exported for testing and direct use
// ==============================================================================

// Cap to avoid infinity in rework calculations
const MAX_REWORK_RATE = 0.95

/**
 * Calculate total lead time for a value stream
 * @param {Array} steps - Array of process steps
 * @returns {number} Total lead time in minutes
 */
export function calculateTotalLeadTime(steps) {
  if (!steps || steps.length === 0) return 0
  return steps.reduce((sum, step) => sum + (step.leadTime || 0), 0)
}

/**
 * Calculate total process time for a value stream
 * @param {Array} steps - Array of process steps
 * @returns {number} Total process time in minutes
 */
export function calculateTotalProcessTime(steps) {
  if (!steps || steps.length === 0) return 0
  return steps.reduce((sum, step) => sum + (step.processTime || 0), 0)
}

/**
 * Calculate flow efficiency
 * @param {Array} steps - Array of process steps
 * @returns {Object} Flow efficiency result
 */
export function calculateFlowEfficiency(steps) {
  const processTime = calculateTotalProcessTime(steps)
  const leadTime = calculateTotalLeadTime(steps)

  if (leadTime === 0) {
    return {
      value: 0,
      percentage: 0,
      status: 'neutral',
      displayValue: 'N/A',
    }
  }

  const value = processTime / leadTime
  const percentage = value * 100

  let status
  if (percentage >= 25) {
    status = 'good'
  } else if (percentage >= 15) {
    status = 'warning'
  } else {
    status = 'critical'
  }

  return {
    value,
    percentage,
    status,
    displayValue: `${percentage.toFixed(1)}%`,
  }
}

/**
 * Calculate first pass yield (product of all %C&A)
 * @param {Array} steps - Array of process steps
 * @returns {Object} First pass yield result
 */
export function calculateFirstPassYield(steps) {
  if (!steps || steps.length === 0) {
    return {
      value: 0,
      percentage: 0,
      status: 'neutral',
      displayValue: 'N/A',
    }
  }

  const value = steps.reduce(
    (product, step) => product * ((step.percentCompleteAccurate || 100) / 100),
    1
  )
  const percentage = value * 100

  let status
  if (percentage >= 80) {
    status = 'good'
  } else if (percentage >= 60) {
    status = 'warning'
  } else {
    status = 'critical'
  }

  return {
    value,
    percentage,
    status,
    displayValue: `${percentage.toFixed(1)}%`,
  }
}

/**
 * Calculate total queue size across all steps
 * @param {Array} steps - Array of process steps
 * @returns {number} Total queue size
 */
export function calculateTotalQueueSize(steps) {
  if (!steps || steps.length === 0) return 0
  return steps.reduce((sum, step) => sum + (step.queueSize || 0), 0)
}

/**
 * Calculate activity ratio (average process time per step)
 * Higher indicates more value-added work per step
 * @param {Array} steps - Array of process steps
 * @returns {Object} Activity ratio result
 */
export function calculateActivityRatio(steps) {
  if (!steps || steps.length === 0) {
    return {
      value: 0,
      displayValue: 'N/A',
    }
  }
  const avgProcessTime = calculateTotalProcessTime(steps) / steps.length
  return {
    value: avgProcessTime,
    displayValue: formatDuration(Math.round(avgProcessTime)),
  }
}

/**
 * Calculate effective lead time accounting for rework loops
 * Uses geometric series: for each rework loop, multiply affected path by 1/(1-reworkRate)
 * @param {Array} steps - Array of process steps
 * @param {Array} connections - Array of connections between steps
 * @returns {Object} Rework impact metrics
 */
export function calculateReworkImpact(steps, connections) {
  const baseLeadTime = calculateTotalLeadTime(steps)

  if (!connections || connections.length === 0) {
    return {
      effectiveLeadTime: baseLeadTime,
      reworkMultiplier: 1,
      totalReworkRate: 0,
      status: 'neutral',
      displayValue: formatDuration(baseLeadTime),
    }
  }

  const reworkConnections = connections.filter((c) => c.type === 'rework')
  if (reworkConnections.length === 0) {
    return {
      effectiveLeadTime: baseLeadTime,
      reworkMultiplier: 1,
      totalReworkRate: 0,
      status: 'neutral',
      displayValue: formatDuration(baseLeadTime),
    }
  }

  // Calculate cumulative rework impact
  // For simplicity, we sum rework rates (capped to avoid infinity)
  const totalReworkRate = Math.min(
    reworkConnections.reduce((sum, c) => sum + (c.reworkRate || 0) / 100, 0),
    MAX_REWORK_RATE
  )

  const reworkMultiplier = 1 / (1 - totalReworkRate)
  const effectiveLeadTime = Math.round(baseLeadTime * reworkMultiplier)

  let status
  if (reworkMultiplier <= 1.1) {
    status = 'good'
  } else if (reworkMultiplier <= 1.3) {
    status = 'warning'
  } else {
    status = 'critical'
  }

  return {
    effectiveLeadTime,
    reworkMultiplier: Number(reworkMultiplier.toFixed(2)),
    totalReworkRate: Number((totalReworkRate * 100).toFixed(1)),
    status,
    displayValue: formatDuration(effectiveLeadTime),
  }
}

/**
 * Identify bottleneck steps (queue size significantly above average)
 * @param {Array} steps - Array of process steps
 * @returns {Array} Array of step IDs identified as bottlenecks
 */
export function identifyBottlenecks(steps) {
  if (!steps || steps.length === 0) return []

  const stepsWithQueue = steps.filter((s) => (s.queueSize || 0) > 0)
  if (stepsWithQueue.length === 0) return []

  const avgQueue = stepsWithQueue.reduce((sum, s) => sum + s.queueSize, 0) / stepsWithQueue.length
  const threshold = Math.max(avgQueue * 1.5, 5) // At least 5 items to be a bottleneck

  return steps.filter((s) => (s.queueSize || 0) > threshold).map((s) => s.id)
}

// Alias for backward compatibility
export const calculateAllMetrics = calculateMetrics
