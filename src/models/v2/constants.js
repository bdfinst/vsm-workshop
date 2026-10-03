export const STEP_KIND = Object.freeze({ TEAM: 'team', OUTSIDE: 'outside' })

export const TIME_SOURCE = Object.freeze({
  ESTIMATE: 'estimate',
  MEASURED: 'measured',
})

export const VERSION_KIND = Object.freeze({
  CURRENT: 'current',
  FUTURE: 'future',
})

/** The units a duration is typed in; "days" are working days. */
export const DURATION_UNIT = Object.freeze({
  MINUTES: 'minutes',
  HOURS: 'hours',
  DAYS: 'days',
})

/** What one item of work in the stream is: set on Scope, with no default. */
export const UNIT_OF_WORK = Object.freeze({
  STORY: 'story',
  FEATURE: 'feature',
  DEFECT: 'defect',
})

/** The guided session's stages in order; stage N is `STAGE_NAMES[N - 1]`. */
export const STAGE_NAMES = Object.freeze([
  'Scope',
  'Steps',
  'Time',
  'Quality',
  'Rework',
  'Review',
  'Future',
])

/** The number of the last stage (Future). */
export const LAST_STAGE = STAGE_NAMES.length

/**
 * A stage number from a file, which can hold anything: kept when it is a whole
 * number in range, pulled to the nearest end when it is a whole number outside
 * the range, and the first stage when it is not a whole number at all.
 * @param {*} stage - A stage number as stored
 * @returns {number} A stage number from 1 to the last stage
 */
export const clampStage = (stage) =>
  Number.isInteger(stage) ? Math.min(Math.max(stage, 1), LAST_STAGE) : 1

/**
 * The one place a stage number becomes its name, for the rail, the headings,
 * the cards and the announcements. A number out of range or not a whole number
 * still gives a name (see `clampStage`), so nothing shows "undefined".
 * @param {*} stage - A stage number
 * @returns {string} The stage's name
 */
export const stageName = (stage) => STAGE_NAMES[clampStage(stage) - 1]

/** Each stage's number, 1-based: `STAGE_NAMES[STAGE_NUMBER.STEPS - 1]` is 'Steps'. */
export const STAGE_NUMBER = Object.freeze({
  SCOPE: 1,
  STEPS: 2,
  TIME: 3,
  QUALITY: 4,
  REWORK: 5,
  REVIEW: 6,
  FUTURE: 7,
})

/** The locked first step of every version. */
export const INTAKE_NAME = 'Intake'

/** A step whose work is all complete and accurate: %C/A is 100 (a percentage, 0-100). */
export const FULL_PCT_CA = 100

/** The label of the current-state version; reserved against future versions. */
export const CURRENT_LABEL = 'Current state'

/**
 * Whether a step is done by an outside team (one elapsed time, always a handoff).
 * @param {{kind: string}} step - A v2 step
 * @returns {boolean}
 */
export const isOutside = (step) => step.kind === STEP_KIND.OUTSIDE
