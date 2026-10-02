/**
 * Monte-Carlo lead-time simulation (P3)
 *
 * Real value streams have variability: the same step takes different amounts of
 * time on different items, and high utilization turns that variability into
 * queues. This module samples each step's lead time across many trials to
 * produce a *distribution* of total lead time (P50/P85/P95) rather than a single
 * deterministic number.
 *
 * Uses a seeded RNG so results are reproducible and testable.
 */

/**
 * Deterministic PRNG (mulberry32). Returns a function yielding floats in [0, 1).
 * @param {number} seed
 * @returns {() => number}
 */
export function createSeededRng(seed) {
  let a = seed >>> 0
  return function rng() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The percentile value of a numeric sample (nearest-rank on sorted ascending).
 * @param {number[]} values
 * @param {number} p - 0..100
 * @returns {number}
 */
export function percentile(values, p) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((x, y) => x - y)
  const rank = Math.ceil((p / 100) * sorted.length)
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1))
  return sorted[index]
}

/**
 * Sample a step's lead time using a symmetric triangular distribution centred on
 * the recorded lead time with half-width = leadTime * variability.
 * Triangular = average of two uniforms, which concentrates mass near the centre.
 */
function sampleLeadTime(leadTime, variability, rng) {
  if (variability <= 0) return leadTime
  const triangular = (rng() + rng()) / 2 // 0..1, peak at 0.5
  const factor = 1 + (triangular * 2 - 1) * variability
  return Math.max(0, leadTime * factor)
}

/**
 * Run a Monte-Carlo simulation of total lead time.
 * @param {Array} steps
 * @param {{trials?:number, variability?:number, seed?:number}} [options]
 *   variability is a coefficient (0 = deterministic, 0.3 = ±30%).
 * @returns {{samples:number[], p50:number, p85:number, p95:number, mean:number}}
 */
export function runMonteCarlo(steps = [], options = {}) {
  const { trials = 1000, variability = 0.25, seed = 1 } = options
  const rng = createSeededRng(seed)

  const samples = []
  for (let trial = 0; trial < trials; trial++) {
    let total = 0
    for (const step of steps) {
      total += sampleLeadTime(step.leadTime || 0, variability, rng)
    }
    samples.push(Math.round(total))
  }

  const mean =
    samples.length > 0 ? Math.round(samples.reduce((sum, v) => sum + v, 0) / samples.length) : 0

  return {
    samples,
    p50: percentile(samples, 50),
    p85: percentile(samples, 85),
    p95: percentile(samples, 95),
    mean,
  }
}
