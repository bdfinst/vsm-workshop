import { isOutside } from '../../models/v2/constants.js'
import { TIME_FIELD_NOUNS, missingTimesOf } from '../../models/v2/step.js'
import { displayNameOf, flagsOf } from './flaggedSteps.js'

// The ladder model is view vocabulary (outlines, texts, flag tones), so it
// lives here and not in utils/calculations, which never imports utils/ui. The
// value stream store derives it next to the metrics so no component works it
// out again.

/** How a step's box is outlined: plain, a handoff, or incomplete/outside. */
export const OUTLINE = Object.freeze({
  SOLID: 'solid',
  HANDOFF: 'handoff',
  DASHED: 'dashed',
})

const HANDOFF_TEXT = 'handoff'

const OUTSIDE_TEXT = Object.freeze({
  label: 'elapsed · split unknown',
  text: 'outside',
})

const minutesOf = (step) =>
  isOutside(step)
    ? { elapsed: step.elapsedTime?.typ }
    : { wait: step.waitTime?.typ, process: step.processTime?.typ }

const missingTimeLabelsOf = (step) =>
  missingTimesOf(step).map((field) => TIME_FIELD_NOUNS[field])

const outlineOf = (missingTimeLabels, outsideText, handoffText) => {
  if (missingTimeLabels.length > 0 || outsideText) return OUTLINE.DASHED
  return handoffText ? OUTLINE.HANDOFF : OUTLINE.SOLID
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

/**
 * The part of a time ladder that does not depend on the pane: per step its
 * `stepId`, `name` ("an unnamed step" when blank), `minutes` (`{wait, process}` or `{elapsed}`, null when not
 * entered), `outline` (an OUTLINE), `handoffText` ('handoff' or null, outside
 * steps included), `missingTimeLabels` (the names of the times not entered,
 * e.g. 'wait time'), `outsideText` (`{label, text}` for a hatched outside
 * block, or null) and `flags` (`{kind, label, tone}` for 'largest wait'
 * and/or 'lowest %C/A'). The value stream store derives this once per change,
 * so a pane or a mode switch only has to size it with `sizeLadder`. Works out
 * no metrics: the flags are the ones already worked out for this version, so a
 * comparison can build one model per version from each version's own metrics.
 * Pure.
 * @param {Object} version - A v2 map version ({ steps, reworkPaths })
 * @param {Object} flags - `metrics.flags` for this version
 * @returns {{steps: Object[]}}
 */
export const ladderModel = (version, flags) => ({
  steps: version.steps.map((step) => modelStep(step, flags)),
})
