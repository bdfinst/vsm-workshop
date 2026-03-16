/**
 * Utility for auto-positioning steps on the canvas
 * Extracted from vsmDataStore to keep UI layout logic out of the domain store
 */
import { CANVAS_START_X, CANVAS_STEP_SPACING, CANVAS_Y } from '../../data/canvasConfig.js'

/**
 * Calculate the default canvas position for a new step
 * @param {number} existingStepCount - Number of steps already on the canvas
 * @returns {{ x: number, y: number }} Position object
 */
export function autoPositionStep(existingStepCount) {
  return {
    x: CANVAS_START_X + existingStepCount * CANVAS_STEP_SPACING,
    y: CANVAS_Y,
  }
}
