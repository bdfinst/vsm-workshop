import { isOutside } from '../../../models/v2/constants.js'
import { hasRejects } from '../../../models/v2/step.js'

const TOP_COUNT = 3

const byDescending = (value) => (a, b) => value(b) - value(a)

/**
 * The largest waits among team steps (outside steps have no known wait).
 * Steps with no wait time, or a wait of 0, are skipped; ties keep step order.
 * @param {Object[]} steps - v2 steps, in order
 * @returns {{stepId: string, name: string, wait: number}[]} At most three, largest first
 */
export const topWaits = (steps) =>
  steps
    .filter((step) => !isOutside(step) && step.waitTime?.typ > 0)
    .map((step) => ({
      stepId: step.id,
      name: step.name,
      wait: step.waitTime.typ,
    }))
    .sort(byDescending((row) => row.wait))
    .slice(0, TOP_COUNT)

/**
 * The team step with the largest wait, the first on a tie.
 * @param {Object[]} steps - v2 steps, in order
 * @returns {{stepId: string, name: string, wait: number}|null} Null when no team step has a wait above 0
 */
export const largestWait = (steps) => topWaits(steps)[0] ?? null

/**
 * The rework paths with the most added time per item. Paths whose added time
 * is incomplete or 0 are left out; ties keep path order.
 * @param {Object[]} pathRows - `paths` from calculateRework
 * @returns {Object[]} At most three rows, most added time first
 */
export const topPaths = (pathRows) =>
  pathRows
    .filter((row) => row.addedTime.typ > 0)
    .sort(byDescending((row) => row.addedTime.typ))
    .slice(0, TOP_COUNT)

/**
 * The team step with the lowest %C/A. The first such step wins a tie. A lowest
 * of 100 is nothing to flag, so it gives null.
 * @param {Object[]} steps - v2 steps, in order
 * @returns {{stepId: string, name: string, pctCA: number}|null} Null when no step has a %C/A below 100
 */
export const lowestCA = (steps) =>
  steps
    .filter((step) => !isOutside(step) && hasRejects(step))
    .map((step) => ({ stepId: step.id, name: step.name, pctCA: step.pctCA }))
    .reduce(
      (found, row) => (found && found.pctCA <= row.pctCA ? found : row),
      null
    )
