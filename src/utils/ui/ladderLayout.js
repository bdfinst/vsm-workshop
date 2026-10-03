import { isOutside } from '../../models/v2/constants.js'
import { displayNameOf, flagsOf } from './flaggedSteps.js'

/** How a ladder is sized: `SCALED` by minutes, `EQUAL` one width for every box. */
export const LADDER_MODE = Object.freeze({
  SCALED: 'scaled',
  EQUAL: 'equal',
})

/** How a step's box is outlined: plain, a handoff, or incomplete/outside. */
export const OUTLINE = Object.freeze({
  SOLID: 'solid',
  HANDOFF: 'handoff',
  DASHED: 'dashed',
})

/** The narrowest a scaled box is drawn, in pixels, so a step with no time (or 0) stays visible. */
export const MIN_SCALED_BOX_WIDTH = 24

const HANDOFF_TEXT = 'handoff'

const OUTSIDE_TEXT = Object.freeze({
  label: 'elapsed · split unknown',
  text: 'outside',
})

// The time fields a step of each kind needs, in the order they are named when missing.
const TEAM_TIMES = [
  ['processTime', 'process time'],
  ['waitTime', 'wait time'],
]
const OUTSIDE_TIMES = [['elapsedTime', 'elapsed time']]

// How each mode turns a step's minutes (null when not entered) into widths. A
// scaled box is its wait, process or elapsed time side by side; an equal box
// is one fixed width and both segments span all of it.
const SIZERS = {
  [LADDER_MODE.SCALED]:
    ({ pixelsPerMinute }) =>
    ({ wait, process, elapsed }) => {
      const waitWidth = (wait ?? 0) * pixelsPerMinute
      const processWidth = (process ?? 0) * pixelsPerMinute
      const elapsedWidth = (elapsed ?? 0) * pixelsPerMinute
      return {
        box: Math.max(
          waitWidth + processWidth + elapsedWidth,
          MIN_SCALED_BOX_WIDTH
        ),
        wait: waitWidth,
        process: processWidth,
        processOffset: waitWidth,
      }
    },
  [LADDER_MODE.EQUAL]:
    ({ width }) =>
    () => ({
      box: width,
      wait: width,
      process: width,
      processOffset: 0,
    }),
}

const minutesOf = (step) =>
  isOutside(step)
    ? { elapsed: step.elapsedTime?.typ }
    : { wait: step.waitTime?.typ, process: step.processTime?.typ }

const missingTimeLabelsOf = (step) =>
  (isOutside(step) ? OUTSIDE_TIMES : TEAM_TIMES)
    .filter(([field]) => step[field]?.typ == null)
    .map(([, label]) => label)

const outlineOf = (missingTimeLabels, outsideText, handoffText) => {
  if (missingTimeLabels.length > 0 || outsideText) return OUTLINE.DASHED
  return handoffText ? OUTLINE.HANDOFF : OUTLINE.SOLID
}

const segment = (minutes, x, width) =>
  minutes == null ? null : { x, width, minutes }

const assertPositive = (value, name, mode) => {
  if (!(Number.isFinite(value) && value > 0)) {
    throw new RangeError(`${mode} mode needs a positive, finite ${name}`)
  }
}

const sizerFor = ({ mode, pixelsPerMinute, width }) => {
  if (!Object.hasOwn(SIZERS, mode)) {
    throw new RangeError(`Unknown ladder mode: ${mode}`)
  }
  if (mode === LADDER_MODE.SCALED) {
    assertPositive(pixelsPerMinute, 'pixelsPerMinute', mode)
  } else {
    assertPositive(width, 'width', mode)
  }
  return SIZERS[mode]({ pixelsPerMinute, width })
}

// What a step looks like whatever the pane: its minutes, encodings and flags.
const modelStep = (step, flags) => {
  const missingTimeLabels = missingTimeLabelsOf(step)
  const outsideText = isOutside(step) ? OUTSIDE_TEXT : null
  const handoffText = step.isHandoff ? HANDOFF_TEXT : null

  return {
    stepId: step.id,
    name: displayNameOf(step.name),
    minutes: minutesOf(step),
    outline: outlineOf(missingTimeLabels, outsideText, handoffText),
    handoffText,
    missingTimeLabels,
    outsideText,
    flags: flagsOf(flags, step.id),
  }
}

const layoutStep = ({ minutes, ...encodings }, x, size) => {
  const widths = size(minutes)
  return {
    ...encodings,
    x,
    width: widths.box,
    wait: segment(minutes.wait, x, widths.wait),
    process: segment(minutes.process, x + widths.processOffset, widths.process),
  }
}

/**
 * The part of a time ladder that does not depend on the pane: per step its
 * `stepId`, `name` ("an unnamed step" when blank), `minutes` (`{wait, process}` or `{elapsed}`, null when not
 * entered), `outline` (an OUTLINE), `handoffText` ('handoff' or null, outside
 * steps included), `missingTimeLabels` (the names of the times not entered,
 * e.g. 'wait time'), `outsideText` (`{label, text}` for a hatched outside
 * block, or null) and `flags` (`{kind, label, tone}` for 'largest wait'
 * and/or 'lowest %C/A'). The value stream store derives this once per change,
 * so a pane or a mode switch only has to size it with `sizeLadder`. Pure.
 * @param {Object} version - A v2 map version ({ steps, reworkPaths })
 * @param {Object} flags - `metrics.flags` for this version
 * @returns {{steps: Object[]}}
 */
export const ladderModel = (version, flags) => ({
  steps: version.steps.map((step) => modelStep(step, flags)),
})

/**
 * Size a ladder model for a pane: the boxes and segments an SVG draws, with
 * nothing left to work out. Pure; no store or DOM. Step order is the
 * version's, boxes sit side by side from x 0, and the layout never shrinks to
 * fit: `totalWidth` grows with the steps and fitting or zooming is the
 * caller's job. Per step: the model's fields except `minutes`, plus `x`,
 * `width` (the box), and `wait` (drawn above the track) and `process` (below
 * it) as `{x, width, minutes}` or null when that time is not entered.
 * @param {{steps: Object[]}} model - From ladderModel
 * @param {Object} options
 * @param {string} options.mode - A LADDER_MODE: SCALED (widths proportional to minutes) or EQUAL (every box `width` wide)
 * @param {number} [options.pixelsPerMinute] - Required for scaled mode
 * @param {number} [options.width] - Width of every box in pixels; required for equal mode
 * @returns {{totalWidth: number, steps: Object[]}}
 * @throws {RangeError} For an unknown mode, or a missing, non-finite or non-positive pixelsPerMinute or width
 */
export const sizeLadder = (model, { mode, pixelsPerMinute, width }) => {
  const size = sizerFor({ mode, pixelsPerMinute, width })
  const { steps, totalWidth } = model.steps.reduce(
    (acc, step) => {
      const laid = layoutStep(step, acc.totalWidth, size)
      return {
        steps: [...acc.steps, laid],
        totalWidth: acc.totalWidth + laid.width,
      }
    },
    { steps: [], totalWidth: 0 }
  )
  return { totalWidth, steps }
}
