/** How a ladder is sized: `SCALED` by minutes, `EQUAL` one width for every box. */
export const LADDER_MODE = Object.freeze({
  SCALED: 'scaled',
  EQUAL: 'equal',
})

/** The narrowest a scaled box is drawn, in pixels, so a step with no time (or 0) stays visible. */
export const MIN_SCALED_BOX_WIDTH = 24

// How each mode turns a step's minutes (null when not entered) into widths. A
// scaled box is its wait, process or elapsed time side by side; an equal box
// is one fixed width and both blocks span all of it.
const SIZERS = {
  [LADDER_MODE.SCALED]:
    ({ pixelsPerMinute }) =>
    ({
      wait: waitMinutes,
      process: processMinutes,
      elapsed: elapsedMinutes,
    }) => {
      const waitWidth = (waitMinutes ?? 0) * pixelsPerMinute
      const processWidth = (processMinutes ?? 0) * pixelsPerMinute
      const elapsedWidth = (elapsedMinutes ?? 0) * pixelsPerMinute
      return {
        boxWidth: Math.max(
          waitWidth + processWidth + elapsedWidth,
          MIN_SCALED_BOX_WIDTH
        ),
        waitWidth,
        processWidth,
        processOffset: waitWidth,
      }
    },
  [LADDER_MODE.EQUAL]:
    ({ boxWidth }) =>
    () => ({
      boxWidth,
      waitWidth: boxWidth,
      processWidth: boxWidth,
      processOffset: 0,
    }),
}

const block = (minutes, x, width) =>
  minutes == null ? null : { x, width, minutes }

const assertPositive = (value, name, mode) => {
  if (!(Number.isFinite(value) && value > 0)) {
    throw new RangeError(`${mode} mode needs a positive, finite ${name}`)
  }
}

const sizerFor = ({ mode, pixelsPerMinute, boxWidth }) => {
  if (!Object.hasOwn(SIZERS, mode)) {
    throw new RangeError(`Unknown ladder mode: ${mode}`)
  }
  if (mode === LADDER_MODE.SCALED) {
    assertPositive(pixelsPerMinute, 'pixelsPerMinute', mode)
  } else {
    assertPositive(boxWidth, 'boxWidth', mode)
  }
  return SIZERS[mode]({ pixelsPerMinute, boxWidth })
}

const layoutStep = ({ minutes, ...encodings }, x, size) => {
  const widths = size(minutes)
  return {
    ...encodings,
    x,
    boxWidth: widths.boxWidth,
    waitBlock: block(minutes.wait, x, widths.waitWidth),
    processBlock: block(
      minutes.process,
      x + widths.processOffset,
      widths.processWidth
    ),
  }
}

/**
 * Size a ladder model for a pane: the boxes and blocks an SVG draws, with
 * nothing left to work out. Pure; no store or DOM. Step order is the
 * version's, boxes sit side by side from x 0, and the layout never shrinks to
 * fit: `totalWidth` grows with the steps and fitting or zooming is the
 * caller's job. Per step: the model's fields except `minutes`, plus `x`,
 * `boxWidth`, and `waitBlock` (drawn above the track) and `processBlock`
 * (below it) as `{x, width, minutes}` or null when that time is not entered.
 * @param {{steps: Object[]}} model - From ladderModel
 * @param {Object} options
 * @param {string} options.mode - A LADDER_MODE: SCALED (widths proportional to minutes) or EQUAL (every box `boxWidth` wide)
 * @param {number} [options.pixelsPerMinute] - Required for scaled mode
 * @param {number} [options.boxWidth] - Width of every box in pixels; required for equal mode
 * @returns {{totalWidth: number, steps: Object[]}}
 * @throws {RangeError} For an unknown mode, or a missing, non-finite or non-positive pixelsPerMinute or boxWidth
 */
export const sizeLadder = (model, { mode, pixelsPerMinute, boxWidth }) => {
  const size = sizerFor({ mode, pixelsPerMinute, boxWidth })
  const { steps, totalWidth } = model.steps.reduce(
    (acc, step) => {
      const laid = layoutStep(step, acc.totalWidth, size)
      return {
        steps: [...acc.steps, laid],
        totalWidth: acc.totalWidth + laid.boxWidth,
      }
    },
    { steps: [], totalWidth: 0 }
  )
  return { totalWidth, steps }
}
