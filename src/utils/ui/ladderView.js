import { TONE } from './flaggedSteps.js'
import { MIN_SCALED_BOX_WIDTH } from './ladderLayout.js'

export { TONE }

/** Pixels per minute: 480 minutes are at least a minimum-width box. */
export const MIN_PIXELS_PER_MINUTE = 0.05
/** Pixels per minute: an hour is 30 pixels at most, so a short map is not blown up. */
export const MAX_PIXELS_PER_MINUTE = 0.5
/** The narrowest and widest a box is drawn in equal mode, in pixels. */
export const MIN_EQUAL_WIDTH = 96
export const MAX_EQUAL_WIDTH = 160

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const sum = (numbers) => numbers.reduce((total, n) => total + n, 0)

const minutesInStep = ({ minutes }) =>
  sum(Object.values(minutes).map((n) => n ?? 0))

// The pixels per minute at which the boxes fill `width`, where a box too short
// for its minutes is drawn at MIN_SCALED_BOX_WIDTH instead. Setting those boxes
// aside leaves less width for the rest, which can make more of them too short,
// so it repeats until none more are.
const fillingPixelsPerMinute = (minutes, width) => {
  const pixelsPerMinute = width / sum(minutes)
  const long = minutes.filter(
    (m) => m * pixelsPerMinute >= MIN_SCALED_BOX_WIDTH
  )
  if (long.length === minutes.length || long.length === 0) {
    return pixelsPerMinute
  }
  return fillingPixelsPerMinute(
    long,
    width - (minutes.length - long.length) * MIN_SCALED_BOX_WIDTH
  )
}

/**
 * The pixels per minute that fit the whole ladder into `availableWidth`, kept
 * between MIN_PIXELS_PER_MINUTE and MAX_PIXELS_PER_MINUTE. Boxes too short for
 * their minutes are drawn at the minimum box width and counted in the fit.
 * Below the minimum the ladder is wider than the pane and the pane scrolls.
 * @param {{steps: Object[]}} model - The ladder model (`store.ladder`)
 * @param {number} availableWidth - Pixels the ladder may use
 * @returns {number} Pixels per minute
 */
export const pixelsPerMinuteToFit = (model, availableWidth) => {
  const minutes = model.steps.map(minutesInStep)
  if (sum(minutes) === 0) return MAX_PIXELS_PER_MINUTE
  return clamp(
    fillingPixelsPerMinute(minutes, availableWidth),
    MIN_PIXELS_PER_MINUTE,
    MAX_PIXELS_PER_MINUTE
  )
}

/**
 * The width of every box in equal mode: the pane split between the steps,
 * kept between a readable minimum and a maximum.
 * @param {number} stepCount
 * @param {number} availableWidth - Pixels the ladder may use
 * @returns {number} Pixels
 */
export const equalWidthFor = (stepCount, availableWidth) =>
  clamp(
    availableWidth / Math.max(stepCount, 1),
    MIN_EQUAL_WIDTH,
    MAX_EQUAL_WIDTH
  )

const MISSING_PREFIX = 'needs'

/**
 * The text labels a step carries, so no encoding relies on colour alone.
 * `tone` (a TONE) says how to colour it.
 * @param {Object} step - A step from ladderModel or sizeLadder
 * @returns {{text: string, tone: string}[]}
 */
export const annotationsOf = (step) => [
  ...(step.handoffText ? [{ text: step.handoffText, tone: TONE.HANDOFF }] : []),
  ...(step.outsideText
    ? [
        { text: step.outsideText.text, tone: TONE.MUTED },
        { text: step.outsideText.label, tone: TONE.MUTED },
      ]
    : []),
  ...step.flags.map(({ label, tone }) => ({ text: label, tone })),
  ...step.missingTimeLabels.map((field) => ({
    text: `${MISSING_PREFIX} ${field}`,
    tone: TONE.WARN,
  })),
]

/**
 * Give each label the first lane where it does not run into the label before
 * it, so names never overlap however narrow their boxes are.
 * @param {{x: number, width: number}[]} blocks - Labels in left-to-right order
 * @param {number} [gap] - Pixels to keep between labels on one lane
 * @returns {number[]} A lane number (0 is the top lane) for each block
 */
export const labelLanes = (blocks, gap = 0) => {
  const laneEnds = []
  return blocks.map(({ x, width }) => {
    const free = laneEnds.findIndex((end) => end + gap <= x)
    const lane = free === -1 ? laneEnds.length : free
    laneEnds[lane] = x + width
    return lane
  })
}
