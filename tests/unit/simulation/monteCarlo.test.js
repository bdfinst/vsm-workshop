import { describe, it, expect } from 'vitest'
import {
  createSeededRng,
  runMonteCarlo,
  percentile,
} from '../../../src/utils/simulation/monteCarlo'

const steps = [
  { id: 'a', name: 'A', processTime: 60, leadTime: 240 },
  { id: 'b', name: 'B', processTime: 30, leadTime: 120 },
]

describe('createSeededRng', () => {
  it('is deterministic for a given seed', () => {
    const r1 = createSeededRng(42)
    const r2 = createSeededRng(42)
    expect(r1()).toBe(r2())
    expect(r1()).toBe(r2())
  })

  it('produces values in [0, 1)', () => {
    const rng = createSeededRng(7)
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('percentile', () => {
  it('returns the value at the requested percentile', () => {
    expect(percentile([10, 20, 30, 40, 50], 50)).toBe(30)
    expect(percentile([10, 20, 30, 40, 50], 100)).toBe(50)
  })
})

describe('runMonteCarlo', () => {
  it('returns the deterministic total when variability is zero', () => {
    const result = runMonteCarlo(steps, { trials: 100, variability: 0, seed: 1 })
    expect(result.p50).toBe(360)
    expect(result.p85).toBe(360)
    expect(result.mean).toBe(360)
  })

  it('produces an increasing percentile spread under variability', () => {
    const result = runMonteCarlo(steps, { trials: 500, variability: 0.3, seed: 1 })
    expect(result.p50).toBeLessThanOrEqual(result.p85)
    expect(result.p85).toBeLessThanOrEqual(result.p95)
    expect(result.samples).toHaveLength(500)
  })

  it('is reproducible for the same seed', () => {
    const a = runMonteCarlo(steps, { trials: 200, variability: 0.4, seed: 99 })
    const b = runMonteCarlo(steps, { trials: 200, variability: 0.4, seed: 99 })
    expect(a.p85).toBe(b.p85)
    expect(a.mean).toBe(b.mean)
  })

  it('handles an empty stream', () => {
    const result = runMonteCarlo([], { trials: 10, variability: 0.2, seed: 1 })
    expect(result.p50).toBe(0)
    expect(result.samples).toHaveLength(10)
  })
})
