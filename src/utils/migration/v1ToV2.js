import { INTAKE_NAME } from '../../models/v2/constants.js'
import { createMapVersion } from '../../models/v2/mapVersion.js'
import { createReworkPath } from '../../models/v2/reworkPath.js'
import { createStep } from '../../models/v2/step.js'
import { createValueStream } from '../../models/v2/valueStream.js'
import { isRecord } from '../validation/v2/result.js'

/**
 * v1 -> v2 migration. Every helper here is pure: the v1 map is read, never
 * changed, and nothing touches storage.
 */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const isRework = (connection) => connection.type === 'rework'

/** @returns {number} Whole minutes, 0 or more; anything that is not a number is 0 */
const toMinutes = (value) =>
  Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0

// --- Damaged input ---------------------------------------------------------

/** @returns {Object[]} The objects in a list; anything else gives none */
const recordsOf = (list) => (Array.isArray(list) ? list.filter(isRecord) : [])

/**
 * Give every step an id that is text and unique. The first step to use an id
 * keeps it, so connections to it still land; later repeats and missing or
 * non-text ids get fresh ones. Steps are copied only when their id changes.
 * @param {Object[]} steps - v1 steps
 * @returns {Object[]} The steps with usable ids
 */
const withUniqueIds = (steps) => {
  const seen = new Set()
  return steps.map((step) => {
    const usable = typeof step.id === 'string' && !seen.has(step.id)
    const id = usable ? step.id : crypto.randomUUID()
    seen.add(id)
    return usable ? step : { ...step, id }
  })
}

// --- Ordering -------------------------------------------------------------

const positionOf = (step) => ({
  x: step.position?.x ?? 0,
  y: step.position?.y ?? 0,
})

const nameOf = (step) => (typeof step.name === 'string' ? step.name : '')

const byPosition = (a, b) =>
  positionOf(a.step).x - positionOf(b.step).x ||
  positionOf(a.step).y - positionOf(b.step).y ||
  a.index - b.index

/**
 * Put v1 steps in one sequence. Forward connections give a topological order;
 * where several steps are ready at once, the leftmost goes first. A cycle
 * makes the whole order fall back to position.
 * @param {Object[]} steps - v1 steps
 * @param {Object[]} connections - v1 connections
 * @returns {{ordered: Object[], parallel: boolean}} The steps in order, and whether position had to decide
 */
const orderSteps = (steps, connections) => {
  const nodes = steps.map((step, index) => ({ step, index }))
  const byId = new Map(nodes.map((node) => [node.step.id, node]))
  const incoming = new Map(nodes.map((node) => [node, 0]))
  const outgoing = new Map(nodes.map((node) => [node, []]))

  for (const { source, target } of connections.filter((c) => !isRework(c))) {
    const from = byId.get(source)
    const to = byId.get(target)
    if (!from || !to || from === to) continue
    outgoing.get(from).push(to)
    incoming.set(to, incoming.get(to) + 1)
  }

  const ready = nodes.filter((node) => incoming.get(node) === 0)
  const sorted = []
  let parallel = false
  while (ready.length > 0) {
    ready.sort(byPosition)
    if (ready.length > 1) parallel = true
    const next = ready.shift()
    sorted.push(next)
    for (const to of outgoing.get(next)) {
      incoming.set(to, incoming.get(to) - 1)
      if (incoming.get(to) === 0) ready.push(to)
    }
  }

  const hasCycle = sorted.length < nodes.length
  const result = hasCycle ? [...nodes].sort(byPosition) : sorted
  return {
    ordered: result.map((node) => node.step),
    parallel: parallel || hasCycle,
  }
}

// --- Step mapping ---------------------------------------------------------

const processOf = (v1Step) => toMinutes(v1Step.processTime)

const waitOf = (v1Step) =>
  Math.max(0, toMinutes(v1Step.leadTime) - processOf(v1Step))

// A lead time shorter than the process time leaves no wait, so it is clamped to 0.
const isWaitClamped = (v1Step) => toMinutes(v1Step.leadTime) < processOf(v1Step)

const qualityOf = (v1Step) =>
  Number.isFinite(v1Step.percentCompleteAccurate)
    ? clamp(Math.round(v1Step.percentCompleteAccurate), 0, 100)
    : 100

const mapStep = (v1Step, pctCA) =>
  createStep({
    id: v1Step.id,
    name: nameOf(v1Step),
    description: v1Step.description ?? '',
    processTime: { typ: processOf(v1Step) },
    waitTime: { typ: waitOf(v1Step) },
    pctCA,
    position: positionOf(v1Step),
  })

// v1 fields with no v2 home, in report order, each with its "was set" test.
const DROPPED_FIELDS = [
  ['queue size', (step) => step.queueSize != null && step.queueSize !== 0],
  ['batch size', (step) => step.batchSize != null && step.batchSize !== 1],
  [
    'people count',
    (step) => step.peopleCount != null && step.peopleCount !== 1,
  ],
  ['tools', (step) => Array.isArray(step.tools) && step.tools.length > 0],
]

/** @returns {string[]} Labels of the dropped fields that any step actually set */
const droppedFields = (v1Steps) =>
  DROPPED_FIELDS.filter(([, isSet]) => v1Steps.some(isSet)).map(
    ([label]) => label
  )

// --- Intake ---------------------------------------------------------------

const isIntake = (step) => nameOf(step).trim().toLowerCase() === 'intake'

const newIntake = () =>
  createStep({
    name: INTAKE_NAME,
    processTime: { typ: 0 },
    waitTime: { typ: 0 },
    pctCA: 100,
  })

// Intake first, before rework direction is judged: rename and move the v1 step
// called intake to the front. Without one, `added` says a new Intake is needed.
const moveIntakeFirst = (v1Steps) => {
  const found = v1Steps.find(isIntake)
  if (!found) return { v1Steps, added: true }
  return {
    v1Steps: [
      { ...found, name: INTAKE_NAME },
      ...v1Steps.filter((step) => step !== found),
    ],
    added: false,
  }
}

// --- Rework mapping -------------------------------------------------------

/**
 * Split 100 across rates by the largest-remainder method, with every share at
 * least 1 so each path stays valid.
 * @param {number[]} rates - Positive rework rates
 * @returns {number[]} Whole-number shares that add up to 100
 */
const apportionShares = (rates) => {
  const total = rates.reduce((sum, rate) => sum + rate, 0)
  const exact = rates.map((rate) => (rate / total) * 100)
  const shares = exact.map(Math.floor)

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - shares[index] }))
    .sort((a, b) => b.remainder - a.remainder)
  const leftover = 100 - shares.reduce((sum, share) => sum + share, 0)
  byRemainder.slice(0, leftover).forEach(({ index }) => (shares[index] += 1))

  shares.forEach((share, index) => {
    if (share >= 1) return
    shares[index] = 1
    shares[shares.indexOf(Math.max(...shares))] -= 1
  })
  return shares
}

const rateOf = (connection) => Number(connection.reworkRate)

// The lower of the step's own %C/A and 100 minus its rework rate, kept inside
// 1 to 99 so a step with paths is never at 100 and never at 0.
const pctCAWithRework = (v1Step, totalRate) =>
  clamp(Math.floor(Math.min(qualityOf(v1Step), 100 - totalRate)), 1, 99)

/**
 * Turn v1 rework connections into v2 rework paths over the ordered steps.
 * Connections with no rate, or to a step later in the order, are dropped.
 * @param {Object[]} ordered - v1 steps in v2 order
 * @param {Object[]} connections - v1 connections
 * @returns {{paths: Object[], pctCAById: Map<string, number>, removedForward: boolean}}
 */
const mapRework = (ordered, connections) => {
  const indexById = new Map(ordered.map((step, index) => [step.id, index]))
  const usable = connections.filter(
    (c) =>
      isRework(c) &&
      rateOf(c) > 0 &&
      Number.isFinite(rateOf(c)) &&
      indexById.has(c.source) &&
      indexById.has(c.target)
  )
  const kept = usable.filter(
    (c) => indexById.get(c.target) <= indexById.get(c.source)
  )

  const paths = []
  const pctCAById = new Map(ordered.map((step) => [step.id, qualityOf(step)]))
  for (const step of ordered) {
    const own = kept.filter((c) => c.source === step.id)
    if (own.length === 0) continue
    const rates = own.map(rateOf)
    const totalRate = rates.reduce((sum, rate) => sum + rate, 0)
    pctCAById.set(step.id, pctCAWithRework(step, totalRate))
    apportionShares(rates).forEach((share, i) =>
      paths.push(
        createReworkPath({
          fromStepId: step.id,
          toStepId: own[i].target,
          shareOfRejects: share,
        })
      )
    )
  }
  return { paths, pctCAById, removedForward: kept.length < usable.length }
}

// --- Stream ---------------------------------------------------------------

// The v1 map's own fields; an absent one keeps the v2 default.
const streamFields = (v1) =>
  Object.fromEntries(
    ['id', 'name', 'description', 'createdAt', 'updatedAt']
      .filter((key) => typeof v1[key] === 'string' && v1[key] !== '')
      .map((key) => [key, v1[key]])
  )

/** @returns {string[]} What was applied, in a fixed order, each kind once */
const describeChanges = ({ added, parallel, removedForward, ordered }) => {
  const dropped = droppedFields(ordered)
  return [
    ...(added ? ['Intake step added'] : []),
    ...(parallel ? ['Parallel steps placed in order'] : []),
    ...(removedForward ? ['Forward rework path removed'] : []),
    ...ordered
      .filter(isWaitClamped)
      .map((step) => `Wait time clamped for "${step.name}"`),
    ...(dropped.length > 0 ? [`Fields dropped: ${dropped.join(', ')}`] : []),
  ]
}

/**
 * Convert a saved v1 map to a v2 value stream. The v1 map is never changed.
 * A map that is already v2 comes back as it is, with no changes.
 * @param {Object} v1 - A saved v1 map
 * @returns {{stream: Object, changes: string[]}} The v2 stream and what was applied
 */
export const migrateV1ToV2 = (v1) => {
  if (v1.schemaVersion === 2) return { stream: v1, changes: [] }

  const connections = recordsOf(v1.connections)
  const sorted = orderSteps(withUniqueIds(recordsOf(v1.steps)), connections)
  const { v1Steps, added } = moveIntakeFirst(sorted.ordered)
  const rework = mapRework(v1Steps, connections)
  const mapped = v1Steps.map((step) =>
    mapStep(step, rework.pctCAById.get(step.id))
  )
  const steps = added ? [newIntake(), ...mapped] : mapped

  const stream = createValueStream({
    ...streamFields(v1),
    versions: [createMapVersion({ steps, reworkPaths: rework.paths })],
  })
  const changes = describeChanges({
    added,
    parallel: sorted.parallel,
    removedForward: rework.removedForward,
    ordered: v1Steps,
  })
  return { stream, changes }
}
