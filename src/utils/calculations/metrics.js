// ==============================================================================
// DOMAIN SERVICE - ValueStreamAnalyzer
// ==============================================================================

// Time constants
const MINUTES_PER_WORK_DAY = 480

/**
 * ValueStreamAnalyzer - Domain service for analyzing value stream metrics
 * Encapsulates all domain operations for calculating VSM metrics and insights
 */
export class ValueStreamAnalyzer {
  constructor(steps, connections = []) {
    this.steps = steps || []
    this.connections = connections || []
  }

  /**
   * Analyze the value stream and return all metrics
   * @returns {Object} Complete analysis with all metrics
   */
  analyze() {
    return {
      totalLeadTime: this.calculateTotalLeadTime(),
      totalProcessTime: this.calculateTotalProcessTime(),
      flowEfficiency: this.calculateFlowEfficiency(),
      firstPassYield: this.calculateFirstPassYield(),
      stepCount: this.steps.length,
      totalQueueSize: this.calculateTotalQueueSize(),
      activityRatio: this.calculateActivityRatio(),
      reworkImpact: this.calculateReworkImpact(),
      bottleneckIds: this.identifyBottlenecks(),
    }
  }

  calculateTotalLeadTime() {
    return calculateTotalLeadTime(this.steps)
  }

  calculateTotalProcessTime() {
    return calculateTotalProcessTime(this.steps)
  }

  calculateFlowEfficiency() {
    return calculateFlowEfficiency(this.steps)
  }

  calculateFirstPassYield() {
    return calculateFirstPassYield(this.steps)
  }

  calculateTotalQueueSize() {
    return calculateTotalQueueSize(this.steps)
  }

  calculateActivityRatio() {
    return calculateActivityRatio(this.steps)
  }

  calculateReworkImpact() {
    return calculateReworkImpact(this.steps, this.connections)
  }

  identifyBottlenecks() {
    return identifyBottlenecks(this.steps)
  }
}

// ==============================================================================
// PRIMARY API - Use these functions as entry points
// ==============================================================================

/**
 * Calculate all metrics for a value stream (Main facade function)
 * @param {Array} steps - Array of process steps
 * @param {Array} connections - Array of connections between steps
 * @returns {Object} All calculated metrics
 */
export function calculateMetrics(steps, connections = []) {
  const analyzer = new ValueStreamAnalyzer(steps, connections)
  return analyzer.analyze()
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
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  const d = Math.floor(minutes / MINUTES_PER_WORK_DAY)
  const remainingMinutes = minutes % MINUTES_PER_WORK_DAY
  const h = Math.floor(remainingMinutes / 60)
  return h > 0 ? `${d}d ${h}h` : `${d}d`
}

// ==============================================================================
// INTERNAL CALCULATION UTILITIES - Used by calculateMetrics
// ==============================================================================

// Cap to avoid infinity in rework calculations
const MAX_REWORK_RATE = 0.95

/**
 * Calculate total lead time for a value stream
 * @param {Array} steps - Array of process steps
 * @returns {number} Total lead time in minutes
 */
function calculateTotalLeadTime(steps) {
  if (!steps || steps.length === 0) return 0
  return steps.reduce((sum, step) => sum + (step.leadTime || 0), 0)
}

/**
 * Calculate total process time for a value stream
 * @param {Array} steps - Array of process steps
 * @returns {number} Total process time in minutes
 */
function calculateTotalProcessTime(steps) {
  if (!steps || steps.length === 0) return 0
  return steps.reduce((sum, step) => sum + (step.processTime || 0), 0)
}

/**
 * Calculate flow efficiency
 * @param {Array} steps - Array of process steps
 * @returns {Object} Flow efficiency result
 */
function calculateFlowEfficiency(steps) {
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
function calculateFirstPassYield(steps) {
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
function calculateTotalQueueSize(steps) {
  if (!steps || steps.length === 0) return 0
  return steps.reduce((sum, step) => sum + (step.queueSize || 0), 0)
}

/**
 * Calculate activity ratio (average process time per step)
 * Higher indicates more value-added work per step
 * @param {Array} steps - Array of process steps
 * @returns {Object} Activity ratio result
 */
function calculateActivityRatio(steps) {
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
function calculateReworkImpact(steps, connections) {
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
function identifyBottlenecks(steps) {
  if (!steps || steps.length === 0) return []

  const stepsWithQueue = steps.filter((s) => (s.queueSize || 0) > 0)
  if (stepsWithQueue.length === 0) return []

  const avgQueue = stepsWithQueue.reduce((sum, s) => sum + s.queueSize, 0) / stepsWithQueue.length
  const threshold = Math.max(avgQueue * 1.5, 5) // At least 5 items to be a bottleneck

  return steps.filter((s) => (s.queueSize || 0) > threshold).map((s) => s.id)
}
