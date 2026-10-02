/**
 * The result of a figure that depends on a missing value.
 * @param {string} stepName - The first step with the value missing
 * @returns {{incomplete: true, stepName: string}}
 */
export const incomplete = (stepName) => ({ incomplete: true, stepName })

const sumOf = (ranges, key) =>
  ranges.reduce((sum, range) => sum + range[key], 0)

/**
 * Add `{ typ, low, high }` ranges together.
 * @param {{typ: number, low: number, high: number}[]} ranges
 * @returns {{typ: number, low: number, high: number}}
 */
export const sumRanges = (ranges) => ({
  typ: sumOf(ranges, 'typ'),
  low: sumOf(ranges, 'low'),
  high: sumOf(ranges, 'high'),
})
