/**
 * Calculate an SVG path for rework (backwards) edges that routes
 * above the node row to avoid overlapping step nodes.
 *
 * The vertical offset scales with the horizontal span between source
 * and target so that longer rework loops arc higher, preventing
 * multiple rework edges from stacking on the same line.
 */

/** Base vertical offset above the node row */
const BASE_Y_OFFSET = 60

/** Additional offset per SPAN_THRESHOLD_PX of horizontal span */
const OFFSET_PER_SPAN = 30

/** Horizontal span unit for scaling the vertical offset */
const SPAN_THRESHOLD_PX = 250

/** Horizontal padding from the source/target handles before turning up */
const HANDLE_PADDING = 20

/**
 * Calculate a rework edge SVG path and label position
 * @param {Object} params
 * @param {number} params.sourceX - Source handle X
 * @param {number} params.sourceY - Source handle Y
 * @param {number} params.targetX - Target handle X
 * @param {number} params.targetY - Target handle Y
 * @returns {{ path: string, labelPosition: { x: number, y: number } }}
 */
export const calculateReworkPath = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
}) => {
  const span = Math.abs(sourceX - targetX)
  const verticalOffset = BASE_Y_OFFSET + (span / SPAN_THRESHOLD_PX) * OFFSET_PER_SPAN

  // Route: source handle -> right padding -> up -> across -> down -> left padding -> target handle
  const topY = Math.min(sourceY, targetY) - verticalOffset
  const rightX = sourceX + HANDLE_PADDING
  const leftX = targetX - HANDLE_PADDING
  const midX = (sourceX + targetX) / 2

  const path = [
    `M ${sourceX} ${sourceY}`,
    `L ${rightX} ${sourceY}`,
    `Q ${rightX} ${topY} ${midX} ${topY}`,
    `Q ${leftX} ${topY} ${leftX} ${targetY}`,
    `L ${targetX} ${targetY}`,
  ].join(' ')

  return {
    path,
    labelPosition: { x: midX, y: topY },
  }
}
