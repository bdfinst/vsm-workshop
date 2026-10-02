import { describe, it, expect } from 'vitest'
import {
  wipFromLittlesLaw,
  projectBatchSizeChange,
} from '../../../src/utils/calculations/littlesLaw'

describe('wipFromLittlesLaw', () => {
  it('computes WIP = throughput x lead time (in days)', () => {
    // 2 items/day, lead time 2 work days (960 min) => 4 items in progress
    expect(wipFromLittlesLaw(2, 960)).toBe(4)
  })

  it('returns 0 when throughput is missing', () => {
    expect(wipFromLittlesLaw(null, 960)).toBe(0)
  })
})

describe('projectBatchSizeChange', () => {
  const step = { processTime: 60, leadTime: 240, batchSize: 4 }

  it('shrinks the wait portion proportionally to the batch reduction', () => {
    // wait = 180; halving batch (4 -> 2) halves wait to 90; lead = 60 + 90 = 150
    const result = projectBatchSizeChange(step, 2)
    expect(result.projectedLeadTime).toBe(150)
    expect(result.deltaMinutes).toBe(-90)
  })

  it('reports the percent change', () => {
    const result = projectBatchSizeChange(step, 2)
    expect(result.deltaPercent).toBe(-37.5)
  })

  it('never drops below process time and clamps batch to at least 1', () => {
    const result = projectBatchSizeChange({ processTime: 60, leadTime: 240, batchSize: 4 }, 0)
    expect(result.newBatchSize).toBe(1)
    expect(result.projectedLeadTime).toBeGreaterThanOrEqual(60)
  })

  it('increases lead time when batch size grows', () => {
    const result = projectBatchSizeChange(step, 8)
    expect(result.projectedLeadTime).toBeGreaterThan(step.leadTime)
    expect(result.deltaMinutes).toBeGreaterThan(0)
  })
})
