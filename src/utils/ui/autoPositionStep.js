/**
 * Utility for auto-positioning steps on the canvas
 * Extracted from vsmDataStore to keep UI layout logic out of the domain store
 *
 * Steps are placed right-to-left to encourage the canonical VSM practice
 * of starting from production/delivery and mapping backwards.
 */
import { CANVAS_RIGHT_X, CANVAS_STEP_SPACING, CANVAS_Y } from '../../data/canvasConfig.js'

/**
 * Calculate the default canvas position for a new step
 * First step goes to the right; each subsequent step is placed to the left.
 * @param {number} existingStepCount - Number of steps already on the canvas
 * @returns {{ x: number, y: number }} Position object
 */
export function autoPositionStep(existingStepCount) {
  return {
    x: CANVAS_RIGHT_X - existingStepCount * CANVAS_STEP_SPACING,
    y: CANVAS_Y,
  }
}
