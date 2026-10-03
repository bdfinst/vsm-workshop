import { LABEL_FONT_SIZE } from './ladderView.js'

// Where things sit in the ladder drawing, in pixels. Wait blocks sit above the
// track and process blocks below it; the outline of a step surrounds both;
// labels hang below in lanes. Shared by LadderMap and LadderStep.

export const PAD_X = 12
export const BLOCK_HEIGHT = 48
const BLOCK_GAP = 4
export const WAIT_TOP = 8
export const TRACK_HEIGHT = 2
export const TRACK_Y = WAIT_TOP + BLOCK_HEIGHT + BLOCK_GAP
export const PROCESS_TOP = TRACK_Y + TRACK_HEIGHT + BLOCK_GAP
export const COLUMN_BOTTOM = PROCESS_TOP + BLOCK_HEIGHT
const OUTLINE_PADDING = 4
export const OUTLINE_TOP = WAIT_TOP - OUTLINE_PADDING
export const OUTLINE_HEIGHT = COLUMN_BOTTOM + OUTLINE_PADDING - OUTLINE_TOP
export const LABEL_TOP = COLUMN_BOTTOM + 16
export const LABEL_BASELINE = LABEL_FONT_SIZE
export const LINE_HEIGHT = 15
export const LANE_PADDING = 8
export const HANDOFF_STROKE_WIDTH = 3
export const DASHED_STROKE_WIDTH = 2
export const DASH_PATTERN = '6 4'
