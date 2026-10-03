import {
  STAGE_NAMES,
  STAGE_NUMBER,
  UNIT_OF_WORK,
} from '../../models/v2/constants.js'
import { timeFieldsOf } from '../../models/v2/step.js'
import { isBlankName } from '../../models/v2/valueStream.js'
import { stepLabelOf } from './stepData.js'

/**
 * The guided session's stages: the one place their metadata lives. `prompt`
 * is the card shown above the stage's work, or null while the stage still
 * uses the placeholder.
 */
const PROMPTS = {
  Scope: {
    question: 'What value stream are you mapping?',
    explanation:
      'Name it and say where it starts and ends, so everyone maps the same thing.',
    example:
      'Checkout delivery: starts when a customer asks for a change, ends when the change is live.',
  },
  Steps: {
    question: 'What steps does the work go through?',
    explanation:
      'List every step in order, starting from Intake. Say who does each one and mark where work is handed to another team.',
    example:
      'Refinement: the dev team splits and sizes stories, then hands them to development.',
  },
  Time: {
    question: 'How long does each step take, and how long does work wait?',
    explanation:
      'Enter the hands-on process time and the wait time before each step. For a step done by an outside team, enter one elapsed time from submitted to returned.',
    example:
      'Code review: 30 minutes of process time, 1 working day of wait time for a reviewer.',
  },
}

export const STAGES = Object.freeze(
  STAGE_NAMES.map((name, index) => ({
    number: index + 1,
    name,
    prompt: PROMPTS[name] ?? null,
  }))
)

const isBlank = (value) => typeof value !== 'string' || value.trim() === ''

// In form order; `noun` and `article` are how the gate reason names the field.
const SCOPE_FIELDS = [
  {
    key: 'name',
    article: 'a',
    noun: 'name',
    isMissing: ({ name }) => isBlankName(name),
  },
  {
    key: 'trigger',
    article: 'a',
    noun: 'trigger',
    isMissing: ({ trigger }) => isBlank(trigger),
  },
  {
    key: 'endPoint',
    article: 'an',
    noun: 'end point',
    isMissing: ({ endPoint }) => isBlank(endPoint),
  },
  {
    key: 'unitOfWork',
    article: 'a',
    noun: 'unit of work',
    isMissing: ({ unitOfWork }) =>
      !Object.values(UNIT_OF_WORK).includes(unitOfWork),
  },
]

/**
 * The Scope fields still to fill. Whitespace-only text counts as empty.
 * @param {{name: string, trigger: string, endPoint: string, unitOfWork: ?string}} scope - The Scope fields, or a value stream
 * @returns {string[]} Field keys, in form order
 */
export const missingScopeFields = (scope) =>
  SCOPE_FIELDS.filter((field) => field.isMissing(scope)).map(
    (field) => field.key
  )

// "a, b and c"
const joinWithAnd = (items) =>
  items.length < 2
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`

/**
 * Why Next is disabled on Scope: it names only what is missing. A map with
 * nothing filled yet gets the short form without repeated articles.
 * @param {string[]} missing - Keys from `missingScopeFields`
 * @returns {?string} The reason, or null when nothing is missing
 */
export const scopeReason = (missing) => {
  if (missing.length === 0) return null
  const fields = SCOPE_FIELDS.filter((field) => missing.includes(field.key))
  if (fields.length === SCOPE_FIELDS.length) {
    return `Add a ${joinWithAnd(fields.map((field) => field.noun))}`
  }
  return `Add ${joinWithAnd(fields.map((f) => `${f.article} ${f.noun}`))}`
}

const MIN_STEP_COUNT = 2

/**
 * Why Next is disabled on Steps: Intake plus one more step, every step named,
 * and every step with someone who does it. Names come first, then performers,
 * both in step order.
 * @param {{name: string, performedBy: string}[]} steps - The steps in order, Intake first
 * @returns {?string} The reason, or null when the steps are ready
 */
export const stepsReason = (steps) => {
  if (steps.length < MIN_STEP_COUNT) return 'Add at least one step after Intake'
  if (steps.some((step) => isBlank(step.name))) return 'Name every step'
  const unattributed = steps.find((step) => isBlank(step.performedBy))
  return unattributed ? `Add who does "${unattributed.name.trim()}"` : null
}

// How the Time gate names each time field.
const TIME_FIELD_NOUNS = {
  processTime: 'process time',
  waitTime: 'wait time',
  elapsedTime: 'elapsed time',
}

/**
 * The typical times still to enter. Zero counts as entered.
 * @param {{name: string, kind: string}[]} steps - Step rows in order, Intake first
 * @returns {{stepLabel: string, noun: string}[]} In step order, `noun` being how the gate names the time ("process time"); a team step asks for process then wait time, an outside step for elapsed time
 */
export const missingTimeFields = (steps) =>
  steps.flatMap((step, index) =>
    timeFieldsOf(step.kind)
      .filter((field) => step[field]?.typ == null)
      .map((field) => ({
        stepLabel: stepLabelOf(step.name, index + 1),
        noun: TIME_FIELD_NOUNS[field],
      }))
  )

/**
 * Why Next is disabled on Time: an entry that shows an error comes first, then
 * every typical time still missing.
 * @param {{name: string, kind: string}[]} steps - Step rows in order, Intake first
 * @param {boolean} hasInvalid - Whether any time field shows an error
 * @returns {?string} The reason, or null when the times are ready
 */
export const timeReason = (steps, hasInvalid) => {
  if (hasInvalid) return 'Fix the times that show an error'
  const missing = missingTimeFields(steps)
  if (missing.length === 0) return null
  return `Add ${joinWithAnd(
    missing.map(({ stepLabel, noun }) => `the ${noun} for "${stepLabel}"`)
  )}`
}

// A stage with no rule yet has nothing to check; later slices add theirs.
const STAGE_REASONS = {
  [STAGE_NUMBER.SCOPE]: (stream) => scopeReason(missingScopeFields(stream)),
}

/**
 * Each stage's state, derived from the data (never stored).
 * - `not-selectable`: beyond the furthest stage reached.
 * - `needs-attention`: reached, but its data is not valid now; `reason` says why.
 * - `complete`: reached, and its data is valid.
 * - `reached`: reached, and it has no completion rule yet.
 * @param {Object} stream - A v2 value stream
 * @param {Object<number, function(Object): ?string>} [rules] - Each stage's rule by stage number, giving the reason its data is not valid or null; the built stages' rules by default
 * @returns {{number: number, name: string, state: string, reason: ?string}[]}
 */
export const stageStatus = (stream, rules = STAGE_REASONS) =>
  STAGES.map(({ number, name }) => {
    if (number > stream.session.furthestStage) {
      return { number, name, state: 'not-selectable', reason: null }
    }
    const check = rules[number]
    if (!check) return { number, name, state: 'reached', reason: null }
    const reason = check(stream)
    return {
      number,
      name,
      state: reason ? 'needs-attention' : 'complete',
      reason,
    }
  })
