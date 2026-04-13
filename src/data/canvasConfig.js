/**
 * Canvas layout configuration constants
 * UI-layer positioning values for the Svelte Flow canvas
 *
 * Steps are positioned right-to-left to encourage the canonical
 * VSM practice of mapping backwards from delivery/production.
 */

export const CANVAS_START_X = 50
export const CANVAS_STEP_SPACING = 250
export const CANVAS_Y = 150

/** X position of the first (rightmost) step when mapping backwards.
 *  Kept within the default viewport to avoid clipping behind the sidebar. */
export const CANVAS_RIGHT_X = 650
