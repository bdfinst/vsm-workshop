/** The text a flag carries, on the ladder and in the summary strip. */
export const FLAG_LABEL = Object.freeze({
  LARGEST_WAIT: 'largest wait',
  LOWEST_CA: 'lowest %C/A',
})

/**
 * The steps `metrics.flags` singles out, in the order they are shown. The one
 * place that reads `topWaits[0]` and `lowestCA`, so the ladder and the summary
 * strip cannot name different steps.
 * @param {Object} flags - `metrics.flags`
 * @returns {{label: string, stepId: string, name: string}[]} No entry for a flag with no step: no wait entered, or no %C/A below 100
 */
export const flaggedSteps = ({ topWaits, lowestCA }) =>
  [
    topWaits[0] && { label: FLAG_LABEL.LARGEST_WAIT, ...topWaits[0] },
    lowestCA && { label: FLAG_LABEL.LOWEST_CA, ...lowestCA },
  ]
    .filter(Boolean)
    .map(({ label, stepId, name }) => ({ label, stepId, name }))

/**
 * The flag labels that sit on one step.
 * @param {Object} flags - `metrics.flags`
 * @param {string} stepId
 * @returns {string[]}
 */
export const flagLabelsOf = (flags, stepId) =>
  flaggedSteps(flags)
    .filter((flagged) => flagged.stepId === stepId)
    .map(({ label }) => label)
