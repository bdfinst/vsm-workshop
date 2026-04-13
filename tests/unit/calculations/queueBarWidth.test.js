import { describe, it, expect } from 'vitest'
import { calculateQueueBarWidth } from '../../../src/utils/calculations/queueBarWidth.js'

describe('calculateQueueBarWidth', () => {
  it('returns 100% for the largest peak queue', () => {
    const data = [
      { peakQueue: 5 },
      { peakQueue: 20 },
      { peakQueue: 8 },
    ]

    expect(calculateQueueBarWidth(20, data)).toBe(100)
  })

  it('returns proportional width for smaller queues', () => {
    const data = [
      { peakQueue: 5 },
      { peakQueue: 20 },
      { peakQueue: 8 },
    ]

    expect(calculateQueueBarWidth(5, data)).toBe(25)
    expect(calculateQueueBarWidth(8, data)).toBe(40)
  })

  it('returns 0% when all queues are zero', () => {
    const data = [
      { peakQueue: 0 },
      { peakQueue: 0 },
      { peakQueue: 0 },
    ]

    expect(calculateQueueBarWidth(0, data)).toBe(0)
  })

  it('returns 100% for a single non-zero queue', () => {
    const data = [{ peakQueue: 7 }]

    expect(calculateQueueBarWidth(7, data)).toBe(100)
  })

  it('handles empty data array', () => {
    expect(calculateQueueBarWidth(0, [])).toBe(0)
  })

  it('computes max peak queue from data', () => {
    const data = [
      { peakQueue: 3 },
      { peakQueue: 15 },
      { peakQueue: 10 },
    ]

    expect(calculateQueueBarWidth(15, data)).toBe(100)
    expect(calculateQueueBarWidth(3, data)).toBe(20)
    expect(calculateQueueBarWidth(10, data)).toBeCloseTo(66.67, 1)
  })
})
