import { TONE } from './flaggedSteps.js'
import {
  LABEL_CHAR_WIDTH,
  LABEL_FONT_SIZE,
  LABEL_GAP,
  LABEL_INSET,
  MAX_EQUAL_BOX_WIDTH,
  MIN_EQUAL_BOX_WIDTH,
  MIN_SCALED_BOX_WIDTH,
} from './ladderGeometry.js'

/** Pixels per minute: 480 minutes are at least a minimum-width box. */
export const MIN_PIXELS_PER_MINUTE = 0.05
/** Pixels per minute: an hour is 30 pixels at most, so a short map is not blown up. */
export const MAX_PIXELS_PER_MINUTE = 0.5

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const sum = (numbers) => numbers.reduce((total, n) => total + n, 0)

const minutesInStep = ({ minutes }) =>
  sum(Object.values(minutes).map((n) => n ?? 0))

// The pixels per minute at which the boxes fill `availableWidth`, where a box too short
// for its minutes is drawn at MIN_SCALED_BOX_WIDTH instead. Setting those boxes
// aside leaves less width for the rest, which can make more of them too short,
// so it repeats until none more are.
const fillingPixelsPerMinute = (minutes, availableWidth) => {
  const pixelsPerMinute = availableWidth / sum(minutes)
  const long = minutes.filter(
    (m) => m * pixelsPerMinute >= MIN_SCALED_BOX_WIDTH
  )
  if (long.length === minutes.length || long.length === 0) {
    return pixelsPerMinute
  }
  return fillingPixelsPerMinute(
    long,
    availableWidth - (minutes.length - long.length) * MIN_SCALED_BOX_WIDTH
  )
}

/**
 * The pixels per minute that fit the whole ladder into `availableWidth`, kept
 * between MIN_PIXELS_PER_MINUTE and MAX_PIXELS_PER_MINUTE. Boxes too short for
 * their minutes are drawn at the minimum box width and counted in the fit.
 * Below the minimum the ladder is wider than the available width and its scroller scrolls.
 * @param {{steps: Object[]}} model - The ladder model (`store.ladderModel`)
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
 * The width of every box in equal mode: the available width split between the steps,
 * kept between a readable minimum and a maximum.
 * @param {number} stepCount
 * @param {number} availableWidth - Pixels the ladder may use
 * @returns {number} Pixels
 */
export const equalBoxWidthFor = (stepCount, availableWidth) =>
  clamp(
    availableWidth / Math.max(stepCount, 1),
    MIN_EQUAL_BOX_WIDTH,
    MAX_EQUAL_BOX_WIDTH
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
 * @param {{x: number, width: number}[]} extents - Where each label starts and how wide it is, in left-to-right order
 * @param {number} [gap] - Pixels to keep between labels on one lane
 * @returns {number[]} A lane number (0 is the top lane) for each label
 */
export const labelLanes = (extents, gap = 0) => {
  const laneEnds = []
  return extents.map(({ x, width }) => {
    const free = laneEnds.findIndex((end) => end + gap <= x)
    const lane = free === -1 ? laneEnds.length : free
    laneEnds[lane] = x + width
    return lane
  })
}

// Code points drawn about one em wide: East Asian wide and fullwidth forms
// (Hangul, CJK punctuation, kana, ideographs, compatibility and fullwidth
// forms), and the characters outside the Basic Multilingual Plane that
// Unicode also gives the wide class (CJK extensions B and later).
const WIDE_RANGES = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3040, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe6f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x20000, 0x3fffd],
]
// The capitals a bold sans draws about as wide as an em.
const WIDE_CAPITALS = new Set(['W', 'M'])
// The lower-case letters that run well past the average.
const WIDE_LOWERCASE = new Set(['m', 'w'])
const CAPITAL = /^\p{Lu}/u
// A glyph from the emoji fonts: pictographs, flags (regional indicators), and
// anything made emoji by a presentation selector or a keycap.
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\uFE0F|\u20E3/u

// Widths of the classes, in ems of LABEL_FONT_SIZE, probed in the label font
// (IBM Plex Sans semibold) and rounded up so the estimate stays on the wide
// side: the widest capitals (H, N, O, G, Q) are 0.72 em, m is 0.89, w 0.82 and
// an emoji 1.25 in the system emoji fonts. Everything else is the ordinary
// LABEL_CHAR_WIDTH.
const CAPITAL_EMS = 0.72
const WIDE_LOWERCASE_EMS = 0.9
const FULL_EM = 1
const EMOJI_EMS = 1.3

// Splits text into what a reader sees as one character: a skin-toned or joined
// emoji, a flag or a letter with its accent is one.
const segmenter = new Intl.Segmenter()
const graphemesOf = (text) =>
  Array.from(segmenter.segment(text), ({ segment }) => segment)

const isWide = (grapheme) => {
  const code = grapheme.codePointAt(0)
  return (
    WIDE_CAPITALS.has(grapheme) ||
    WIDE_RANGES.some(([from, to]) => code >= from && code <= to)
  )
}

const widthOfGrapheme = (grapheme) => {
  if (EMOJI.test(grapheme)) return EMOJI_EMS * LABEL_FONT_SIZE
  if (isWide(grapheme)) return FULL_EM * LABEL_FONT_SIZE
  if (CAPITAL.test(grapheme)) return CAPITAL_EMS * LABEL_FONT_SIZE
  if (WIDE_LOWERCASE.has(grapheme)) return WIDE_LOWERCASE_EMS * LABEL_FONT_SIZE
  return LABEL_CHAR_WIDTH
}

/**
 * An estimate, in pixels, of how wide a label line is drawn. It weights each
 * character (a grapheme, so a joined emoji or an accented letter counts once)
 * by class: emoji at 1.3 em, East Asian wide and fullwidth characters and the
 * capitals W and M at a full em, the other capitals at 0.72 em, the lower-case
 * m and w at 0.9 em, and every other character at LABEL_CHAR_WIDTH. It is
 * pure, so it cannot read font metrics: it measures by class, from widths
 * probed in the label font, and errs on the wide side so labels never overlap
 * or clip. Needs Intl.Segmenter.
 * @param {string} text
 * @returns {number} Pixels
 */
export const textWidthOf = (text) => sum(graphemesOf(text).map(widthOfGrapheme))

const nameLine = ({ name }) => ({ text: name, tone: null })

const linesOf = (step) => [nameLine(step), ...annotationsOf(step)]

const labelWidthOf = (lines) =>
  Math.max(...lines.map(({ text }) => textWidthOf(text)))

/**
 * Where each step's label goes and how far right the labels reach: the label
 * lines (the name, then its annotations), the left edge and estimated `labelWidth`,
 * the lane each takes so none overlaps, and the right-most pixel of the
 * ladder, boxes and labels together. A label can run past the last box (a
 * narrow box with a long name), so an SVG must be at least `rightEdge` wide.
 * Widths are estimated by textWidthOf, which errs wide.
 * @param {Object[]} steps - Laid-out steps, from sizeLadder
 * @param {number} [gap] - Pixels to keep between labels on one lane
 * @returns {{labels: {step: Object, lines: {text: string, tone: ?string}[], left: number, labelWidth: number, right: number}[], lanes: number[], rightEdge: number}}
 */
export const layoutLabels = (steps, gap = LABEL_GAP) => {
  const labels = steps.map((step) => {
    const lines = linesOf(step)
    const left = step.x + LABEL_INSET
    const labelWidth = labelWidthOf(lines)
    return { step, lines, left, labelWidth, right: left + labelWidth }
  })
  const lanes = labelLanes(
    labels.map(({ left, labelWidth }) => ({ x: left, width: labelWidth })),
    gap
  )
  const rightEdge = Math.max(
    0,
    ...labels.map(({ right }) => right),
    ...steps.map(({ x, boxWidth }) => x + boxWidth)
  )
  return { labels, lanes, rightEdge }
}

/**
 * An upper bound, in pixels, on how far a label can reach past the end of the
 * ladder, whatever the available width: it only assumes every box is at least
 * `minBoxWidth`, so the boxes from a step to the end cover at least that much
 * of its label. Used to leave room before fitting, so labels do not push a
 * fitted ladder into a scrollbar.
 * @param {Object[]} steps - Steps from ladderModel (or sizeLadder)
 * @param {number} minBoxWidth - The narrowest any box can be drawn
 * @returns {number} Pixels, never below 0
 */
export const labelOverhangFor = (steps, minBoxWidth) =>
  Math.max(
    0,
    ...steps.map(
      (step, index) =>
        LABEL_INSET +
        labelWidthOf(linesOf(step)) -
        minBoxWidth * (steps.length - index)
    )
  )
