import { rejectRate } from '../calculations/v2/rework.js'
import { flagsOf } from './flaggedSteps.js'

const copyRange = (range) => (range ? { ...range } : null)

const flagIf = (condition, flag) => (condition ? [flag] : [])

const stepRow = (step, { flags }) => ({
  id: step.id,
  name: step.name,
  description: step.description,
  performedBy: step.performedBy,
  kind: step.kind,
  isHandoff: step.isHandoff,
  processTime: copyRange(step.processTime),
  waitTime: copyRange(step.waitTime),
  elapsedTime: copyRange(step.elapsedTime),
  timeSource: step.timeSource,
  pctCA: step.pctCA,
  rejectRate: rejectRate(step),
  notes: step.notes,
  flags: flagsOf(flags, step.id).map(({ kind }) => kind),
})

// A path or step id that no longer exists gives a null name, not a throw.
const pathRow = (row, { pathsById, stepsById, flags }) => {
  const nameOf = (stepId) => stepsById.get(stepId)?.name ?? null
  const path = pathsById.get(row.id)

  return {
    ...row,
    fromName: nameOf(row.fromStepId),
    toName: nameOf(row.toStepId),
    reworkProcessTime: path?.reworkProcessTime ?? null,
    note: path?.note,
    flags: flagIf(
      flags.topPaths.some(({ id }) => id === row.id),
      'top-path'
    ),
  }
}

const indexById = (items) => new Map(items.map((item) => [item.id, item]))

/**
 * The single row shape behind the stage lists, the table and the CSV export.
 * Times are minutes. Percentages are 0-100. A figure that depends on a missing
 * value is `{ incomplete: true, stepName }`, as in the metrics. An entered value
 * that is not set is `null`, and a time that does not apply to the step's kind
 * (elapsed for team steps, process and wait for outside steps) is `null`.
 * Flags are strings: a step's are the `FLAG_KIND` values ("largest-wait",
 * "lowest-ca") for the flags `metrics.flags` puts on it; a path's is "top-path".
 * @param {Object} version - A v2 map version ({ steps, reworkPaths })
 * @param {Object} metrics - `calculateMetrics(version)`
 * @returns {{steps: Object[], paths: Object[]}} Step rows in step order, path rows in path order
 */
export const rowModel = (version, metrics) => {
  const context = {
    stepsById: indexById(version.steps),
    pathsById: indexById(version.reworkPaths),
    flags: metrics.flags,
  }
  return {
    steps: version.steps.map((step) => stepRow(step, context)),
    paths: metrics.rework.paths.map((row) => pathRow(row, context)),
  }
}
