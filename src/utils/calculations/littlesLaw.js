/**
 * WIP & batch-size levers via Little's Law (P2)
 *
 * Little's Law: WIP = throughput × lead time. Batch size is the primary lever:
 * smaller batches shrink the queueing (wait) portion of lead time. These pure
 * functions let the simulator/dashboard project "what if we halve the batch?".
 *
 * Durations in minutes; throughput in items per (work) day.
 */

const MINUTES_PER_WORK_DAY = 480

/**
 * Estimate work in progress from Little's Law.
 * @param {number} throughputPerDay - Completed items per work day
 * @param {number} leadTimeMinutes - Lead time per item (minutes)
 * @param {number} [minutesPerDay]
 * @returns {number} Items in progress
 */
export function wipFromLittlesLaw(throughputPerDay, leadTimeMinutes, minutesPerDay = MINUTES_PER_WORK_DAY) {
  if (!throughputPerDay || throughputPerDay <= 0) return 0
  const leadTimeDays = (leadTimeMinutes || 0) / minutesPerDay
  return Number((throughputPerDay * leadTimeDays).toFixed(2))
}

/**
 * Project the lead-time impact of changing a step's batch size.
 *
 * Model: lead time = process time + wait time. Wait time scales linearly with
 * batch size (smaller batches queue less), so projectedWait = wait × (new/current).
 *
 * @param {{processTime:number, leadTime:number, batchSize:number}} step
 * @param {number} newBatchSize
 * @returns {{newBatchSize:number, currentLeadTime:number, projectedLeadTime:number, deltaMinutes:number, deltaPercent:number}}
 */
export function projectBatchSizeChange(step, newBatchSize) {
  const processTime = step.processTime || 0
  const currentLeadTime = step.leadTime || 0
  const currentBatch = step.batchSize && step.batchSize > 0 ? step.batchSize : 1
  const batch = Math.max(1, Math.floor(newBatchSize) || 1)

  const waitTime = Math.max(0, currentLeadTime - processTime)
  const projectedWait = waitTime * (batch / currentBatch)
  const projectedLeadTime = Math.round(processTime + projectedWait)

  const deltaMinutes = projectedLeadTime - currentLeadTime
  const deltaPercent =
    currentLeadTime > 0 ? Number(((deltaMinutes / currentLeadTime) * 100).toFixed(1)) : 0

  return { newBatchSize: batch, currentLeadTime, projectedLeadTime, deltaMinutes, deltaPercent }
}
