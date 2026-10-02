import { STAGE_NAMES, UNIT_OF_WORK } from '../../models/v2/constants.js'

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
    isMissing: ({ name }) => isBlank(name),
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

// A stage with no rule yet has nothing to check; later slices add theirs.
const STAGE_REASONS = {
  1: (stream) => scopeReason(missingScopeFields(stream)),
}

/**
 * Each stage's state, derived from the data (never stored).
 * - `not-selectable`: beyond the furthest stage reached.
 * - `needs-attention`: reached, but its data is not valid now; `reason` says why.
 * - `complete`: reached, and its data is valid.
 * - `reached`: reached, and it has no completion rule yet.
 * @param {Object} stream - A v2 value stream
 * @returns {{number: number, name: string, state: string, reason: ?string}[]}
 */
export const stageStatus = (stream) =>
  STAGES.map(({ number, name }) => {
    if (number > stream.session.furthestStage) {
      return { number, name, state: 'not-selectable', reason: null }
    }
    const check = STAGE_REASONS[number]
    if (!check) return { number, name, state: 'reached', reason: null }
    const reason = check(stream)
    return {
      number,
      name,
      state: reason ? 'needs-attention' : 'complete',
      reason,
    }
  })
