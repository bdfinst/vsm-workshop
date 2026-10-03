import {
  formatDurationRange,
  formatPercent,
  formatPercentRange,
} from '../calculations/v2/format.js'
import { flaggedSteps } from './flaggedSteps.js'

const INCOMPLETE_TEXT = 'incomplete'
const NOT_AVAILABLE_TEXT = 'not available'
const FLOW_CONTEXT = 'Share of the lead time spent working rather than waiting.'
const RANGE_CONTEXT = `${FLOW_CONTEXT} A range, because some times are a range or happen outside the team.`

const ratio = { scale: 'ratio' }

// One figure of the strip. A metric that depends on a missing value reads
// "incomplete" and names the step it is waiting on; nothing partial is shown.
const figure = (id, label, value, format) =>
  value?.incomplete
    ? {
        id,
        label,
        text: INCOMPLETE_TEXT,
        incomplete: true,
        note: `waiting on ${value.stepName}`,
      }
    : { id, label, text: format(value), incomplete: false, note: null }

const isRange = ({ low, high }) =>
  formatPercent(low, ratio) !== formatPercent(high, ratio)

// Flow efficiency is null when the lead time is 0: there is no ratio to show.
const flowEfficiencyFigure = (flowEfficiency) => {
  const hero = figure(
    'flow-efficiency',
    'Flow efficiency',
    flowEfficiency,
    (v) => (v === null ? NOT_AVAILABLE_TEXT : formatPercentRange(v, ratio))
  )
  const ranged = !hero.incomplete && flowEfficiency && isRange(flowEfficiency)
  return { ...hero, context: ranged ? RANGE_CONTEXT : FLOW_CONTEXT }
}

/**
 * What the summary strip shows, as text, from `metrics` (nothing is
 * recomputed here). Pure.
 * @param {Object} metrics - `calculateMetrics(version)`
 * @param {number} workdayHours - The stream's working day, for durations
 * @returns {{
 *   hero: {id: string, label: string, text: string, incomplete: boolean, note: ?string, context: string},
 *   rows: {id: string, label: string, text: string, incomplete: boolean, note: ?string}[],
 *   callouts: {label: string, name: string}[]
 * }} `hero` is flow efficiency: a range when any time is a range or outside the
 *   team, "not available" when the lead time is 0. `rows` are lead time,
 *   process time, rolled %C/A and handoffs, in that order. `note` names the
 *   step an incomplete figure waits on. `callouts` are the flagged steps,
 *   with no entry for a flag that has no step.
 */
export const summaryModel = (metrics, workdayHours) => {
  const duration = (range) => formatDurationRange(range, workdayHours)
  return {
    hero: flowEfficiencyFigure(metrics.flowEfficiency),
    rows: [
      figure('lead-time', 'Lead time', metrics.totals.leadTime, duration),
      figure(
        'process-time',
        'Process time',
        metrics.totals.processTime,
        duration
      ),
      figure('rolled-ca', 'Rolled %C/A', metrics.rolledCA, (v) =>
        formatPercent(v)
      ),
      figure('handoffs', 'Handoffs', metrics.handoffCount, String),
    ],
    callouts: flaggedSteps(metrics.flags).map(({ label, name }) => ({
      label,
      name,
    })),
  }
}
