/** Which flag a step carries. Stable: code branches on it, never on the label. */
export const FLAG_KIND = Object.freeze({
  LARGEST_WAIT: 'largest-wait',
  LOWEST_CA: 'lowest-ca',
})

/** How a piece of text is coloured on the map and the strip. */
export const TONE = Object.freeze({
  WARN: 'warn',
  CRIT: 'crit',
  HANDOFF: 'handoff',
  MUTED: 'muted',
})

// How each flag reads (`label`) and how serious it is (`tone`).
const FLAG_DISPLAY = Object.freeze({
  [FLAG_KIND.LARGEST_WAIT]: { label: 'largest wait', tone: TONE.WARN },
  [FLAG_KIND.LOWEST_CA]: { label: 'lowest %C/A', tone: TONE.CRIT },
})

/** What a step is called when its name is blank. */
export const UNNAMED_STEP = 'an unnamed step'

/**
 * A step's name as it is shown: the name, or "an unnamed step" when blank.
 * @param {?string} name
 * @returns {string}
 */
export const displayNameOf = (name) => name?.trim() || UNNAMED_STEP

const flag = (kind, { stepId, name }) => ({
  kind,
  ...FLAG_DISPLAY[kind],
  stepId,
  name: displayNameOf(name),
})

/**
 * The steps `metrics.flags` singles out, in the order they are shown. The
 * ladder and the summary strip both read it, so they cannot name different
 * steps. (rowModel.js reads the same `metrics.flags` for the table.)
 * @param {Object} flags - `metrics.flags`
 * @returns {{kind: string, label: string, tone: string, stepId: string, name: string}[]} No entry for a flag with no step: no wait entered, or no %C/A below 100
 */
export const flaggedSteps = ({ largestWait, lowestCA }) =>
  [
    largestWait && flag(FLAG_KIND.LARGEST_WAIT, largestWait),
    lowestCA && flag(FLAG_KIND.LOWEST_CA, lowestCA),
  ].filter(Boolean)

/**
 * The flags that sit on one step.
 * @param {Object} flags - `metrics.flags`
 * @param {string} stepId
 * @returns {{kind: string, label: string, tone: string}[]}
 */
export const flagsOf = (flags, stepId) =>
  flaggedSteps(flags)
    .filter((flagged) => flagged.stepId === stepId)
    .map(({ kind, label, tone }) => ({ kind, label, tone }))
