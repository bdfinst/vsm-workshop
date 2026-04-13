/**
 * Calculate the width percentage for a queue bar in the chart
 *
 * Scales bars relative to the maximum peak queue across all steps,
 * so the largest queue always fills 100% and others are proportional.
 *
 * @param {number} peakQueue - The peak queue size for this step
 * @param {Array<{peakQueue: number}>} allData - All queue chart data items
 * @returns {number} Width as a percentage (0-100)
 */
export const calculateQueueBarWidth = (peakQueue, allData) => {
  const maxPeakQueue = Math.max(...allData.map((d) => d.peakQueue), 1)
  return (peakQueue / maxPeakQueue) * 100
}
