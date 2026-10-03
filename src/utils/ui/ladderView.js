import { FLAG_LABEL } from './flaggedSteps.js'
import { MIN_BOX_WIDTH, minutesOf } from './ladderLayout.js'

/** Pixels per minute: a working day (480 min) is at least a minimum-width box. */
export const MIN_SCALE = 0.05
/** Pixels per minute: an hour is 30 pixels at most, so a short map is not blown up. */
export const MAX_SCALE = 0.5
/** The narrowest and widest a box is drawn in equal mode, in pixels. */
export const MIN_EQUAL_WIDTH = 96
export const MAX_EQUAL_WIDTH = 160

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const sum = (numbers) => numbers.reduce((total, n) => total + n, 0)

const minutesInStep = (step) =>
  sum(Object.values(minutesOf(step)).map((n) => n ?? 0))

// The scale at which the boxes fill `width`, where a box too short for its
// minutes is drawn at MIN_BOX_WIDTH instead. Setting those boxes aside leaves
// less width for the rest, which can make more of them too short, so it
// repeats until none more are.
const fillingScale = (minutes, width) => {
  const scale = width / sum(minutes)
  const long = minutes.filter((m) => m * scale >= MIN_BOX_WIDTH)
  if (long.length === minutes.length || long.length === 0) return scale
  return fillingScale(
    long,
    width - (minutes.length - long.length) * MIN_BOX_WIDTH
  )
}

/**
 * The pixels per minute that fit the whole ladder into `availableWidth`, kept
 * between a minimum readable scale and a maximum. Boxes too short for their
 * minutes are drawn at the minimum box width and counted in the fit. Below the
 * minimum scale the ladder is wider than the pane and the pane scrolls.
 * @param {Object} version - A v2 map version
 * @param {number} availableWidth - Pixels the ladder may use
 * @returns {number} Pixels per minute
 */
export const scaleToFit = (version, availableWidth) => {
  const minutes = version.steps.map(minutesInStep)
  if (sum(minutes) === 0) return MAX_SCALE
  return clamp(fillingScale(minutes, availableWidth), MIN_SCALE, MAX_SCALE)
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
 * The text labels a laid-out step carries, so no encoding relies on colour
 * alone. `tone` says how to colour it: 'handoff', 'warn', 'crit' or 'muted'.
 * @param {Object} step - A step from ladderLayout
 * @returns {{text: string, tone: string}[]}
 */
export const annotationsOf = (step) => [
  ...(step.handoff ? [{ text: step.handoff, tone: 'handoff' }] : []),
  ...(step.outside
    ? [
        { text: step.outside.text, tone: 'muted' },
        { text: step.outside.label, tone: 'muted' },
      ]
    : []),
  ...step.flags.map((text) => ({
    text,
    tone: text === FLAG_LABEL.LOWEST_CA ? 'crit' : 'warn',
  })),
  ...step.missing.map((field) => ({
    text: `${MISSING_PREFIX} ${field}`,
    tone: 'warn',
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
