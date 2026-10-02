export const STEP_KIND = Object.freeze({ TEAM: 'team', OUTSIDE: 'outside' })

export const TIME_SOURCE = Object.freeze({
  ESTIMATE: 'estimate',
  MEASURED: 'measured',
})

export const VERSION_KIND = Object.freeze({
  CURRENT: 'current',
  FUTURE: 'future',
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

/** The label of the current-state version; reserved against future versions. */
export const CURRENT_LABEL = 'Current state'

/**
 * Whether a step is done by an outside team (one elapsed time, always a handoff).
 * @param {{kind: string}} step - A v2 step
 * @returns {boolean}
 */
export const isOutside = (step) => step.kind === STEP_KIND.OUTSIDE
