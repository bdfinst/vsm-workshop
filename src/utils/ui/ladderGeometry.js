// Where things sit in the ladder drawing, in pixels. Wait blocks sit above the
// track and process blocks below it; the outline of a step surrounds both;
// labels hang below in lanes. Shared by the layout functions, LadderMap and
// LadderStep, so this file imports nothing.

/** Pixels. The size labels are drawn at; the width estimate follows from it. */
export const LABEL_FONT_SIZE = 12
/**
 * Pixels one ordinary character of a label is assumed to take: two thirds of
 * an em, a little wider than the average Latin glyph in the semibold label
 * font, so the estimate leans wide rather than letting labels overlap.
 */
export const LABEL_CHAR_WIDTH = (LABEL_FONT_SIZE * 2) / 3
/** Pixels from a step's left edge to where its label text starts. */
export const LABEL_INSET = 4
/** Pixels kept between two labels on one lane. */
export const LABEL_GAP = 8

/** The narrowest a scaled box is drawn, in pixels, so a step with no time (or 0) stays visible. */
export const MIN_SCALED_BOX_WIDTH = 24
/** The narrowest and widest a box is drawn in equal mode, in pixels. */
export const MIN_EQUAL_BOX_WIDTH = 96
export const MAX_EQUAL_BOX_WIDTH = 160

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
const COLUMN_TO_LABELS = 16
export const LABEL_TOP = COLUMN_BOTTOM + COLUMN_TO_LABELS
export const LABEL_BASELINE = LABEL_FONT_SIZE
export const LINE_HEIGHT = 15
export const LANE_PADDING = 8
export const HANDOFF_STROKE_WIDTH = 3
export const DASHED_STROKE_WIDTH = 2
export const DASH_PATTERN = '6 4'
export const BLOCK_STROKE_WIDTH = 1.5
// The leader runs from a step's outline down to its label, a little inside its left edge.
export const LEADER_INSET = 2
export const LEADER_STROKE_WIDTH = 1
// The hatch an outside step is filled with: a tile of diagonal lines.
export const HATCH_TILE_SIZE = 8
export const HATCH_STROKE_WIDTH = 2
export const HATCH_ANGLE = 45
