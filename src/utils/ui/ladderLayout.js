import { isOutside } from '../../models/v2/constants.js'
import { calculateMetrics } from '../calculations/v2/index.js'
import { flagLabelsOf } from './flaggedSteps.js'

/** The narrowest a scaled box is drawn, in pixels, so a step with no time (or 0) stays visible. */
export const MIN_BOX_WIDTH = 24

const OUTSIDE_ENCODING = Object.freeze({
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
  scaled:
    ({ scale }) =>
    ({ wait, process, elapsed }) => {
      const waitWidth = (wait ?? 0) * scale
      const processWidth = (process ?? 0) * scale
      const elapsedWidth = (elapsed ?? 0) * scale
      return {
        box: Math.max(waitWidth + processWidth + elapsedWidth, MIN_BOX_WIDTH),
        wait: waitWidth,
        process: processWidth,
        processOffset: waitWidth,
      }
    },
  equal:
    ({ width }) =>
    () => ({
      box: width,
      wait: width,
      process: width,
      processOffset: 0,
    }),
}

export const minutesOf = (step) =>
  isOutside(step)
    ? { elapsed: step.elapsedTime?.typ }
    : { wait: step.waitTime?.typ, process: step.processTime?.typ }

const missingTimes = (step) =>
  (isOutside(step) ? OUTSIDE_TIMES : TEAM_TIMES)
    .filter(([field]) => step[field]?.typ == null)
    .map(([, label]) => label)

const outlineOf = (missing, outside, handoff) => {
  if (missing.length > 0 || outside) return 'dashed'
  return handoff ? 'handoff' : 'solid'
}

const segment = (minutes, x, width) =>
  minutes == null ? null : { x, width, minutes }

const assertPositive = (value, name, mode) => {
  if (!(value > 0)) {
    throw new RangeError(`${mode} mode needs a positive ${name}`)
  }
}

const sizerFor = ({ mode, scale, width }) => {
  if (!Object.hasOwn(SIZERS, mode)) {
    throw new RangeError(`Unknown ladder mode: ${mode}`)
  }
  if (mode === 'scaled') assertPositive(scale, 'scale', mode)
  else assertPositive(width, 'width', mode)
  return SIZERS[mode]({ scale, width })
}

const layoutStep = (step, x, size, flags) => {
  const minutes = minutesOf(step)
  const widths = size(minutes)
  const missing = missingTimes(step)
  const outside = isOutside(step) ? OUTSIDE_ENCODING : null
  const handoff = step.isHandoff && !outside ? 'handoff' : null

  return {
    stepId: step.id,
    name: step.name,
    x,
    width: widths.box,
    wait: segment(minutes.wait, x, widths.wait),
    process: segment(minutes.process, x + widths.processOffset, widths.process),
    outline: outlineOf(missing, outside, handoff),
    handoff,
    missing,
    outside,
    flags: flagLabelsOf(flags, step.id),
  }
}

/**
 * Lay out a map version as a time ladder: the boxes, segments, encodings and
 * flags an SVG can draw directly, with nothing left to work out. Pure; no
 * store or DOM. Step order is the version's, boxes sit side by side from x 0,
 * and the layout never shrinks to fit: `totalWidth` grows with the steps and
 * fitting or zooming is the caller's job.
 *
 * Per step: `stepId`, `name`, `x`, `width` (the box); `wait` (drawn above the
 * track) and `process` (below it) as `{x, width, minutes}` or null when that
 * time is not entered; `outline` ('solid' | 'handoff' | 'dashed'); `handoff`
 * ('handoff' or null); `missing` (the names of the times not entered, e.g.
 * 'wait time'); `outside` (`{label, text}` for a hatched outside block, or
 * null); `flags` ('largest wait' and/or 'lowest %C/A').
 * @param {Object} version - A v2 map version ({ steps, reworkPaths })
 * @param {Object} options
 * @param {string} options.mode - 'scaled' (widths proportional to minutes) or 'equal' (every box `width` wide)
 * @param {number} [options.scale] - Pixels per minute; required for scaled mode
 * @param {number} [options.width] - Width of every box in pixels; required for equal mode
 * @param {Object} [options.flags] - `metrics.flags` for this version; worked out with calculateMetrics when not given
 * @returns {{totalWidth: number, steps: Object[]}}
 * @throws {RangeError} For an unknown mode, or a missing or non-positive scale or width
 */
export const ladderLayout = (
  version,
  { mode, scale, width, flags = calculateMetrics(version).flags }
) => {
  const size = sizerFor({ mode, scale, width })
  const { steps, totalWidth } = version.steps.reduce(
    (acc, step) => {
      const laid = layoutStep(step, acc.totalWidth, size, flags)
      return {
        steps: [...acc.steps, laid],
        totalWidth: acc.totalWidth + laid.width,
      }
    },
    { steps: [], totalWidth: 0 }
  )
  return { totalWidth, steps }
}
