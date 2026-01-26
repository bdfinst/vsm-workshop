import { describe, it, expect } from 'vitest'
import {
  calculateTotalLeadTime,
  calculateTotalProcessTime,
  calculateFlowEfficiency,
  calculateFirstPassYield,
  calculateTotalQueueSize,
  calculateActivityRatio,
  calculateReworkImpact,
  identifyBottlenecks,
  calculateAllMetrics,
  formatDuration,
} from '../../../src/utils/calculations/metrics'

describe('calculateTotalLeadTime', () => {
  it('returns 0 for empty array', () => {
    expect(calculateTotalLeadTime([])).toBe(0)
  })

  it('returns 0 for null/undefined', () => {
    expect(calculateTotalLeadTime(null)).toBe(0)
    expect(calculateTotalLeadTime(undefined)).toBe(0)
  })

  it('sums lead times from all steps', () => {
    const steps = [
      { leadTime: 100 },
      { leadTime: 200 },
      { leadTime: 150 },
    ]
    expect(calculateTotalLeadTime(steps)).toBe(450)
  })

  it('handles missing leadTime values', () => {
    const steps = [
      { leadTime: 100 },
      { name: 'no lead time' }, // Treated as 0
      { leadTime: 50 },
    ]
    // Expected: 100 + 0 + 50 = 150
    expect(calculateTotalLeadTime(steps)).toBe(150)
  })
})

describe('calculateTotalProcessTime', () => {
  it('returns 0 for empty array', () => {
    expect(calculateTotalProcessTime([])).toBe(0)
  })

  it('sums process times from all steps', () => {
    const steps = [
      { processTime: 30 },
      { processTime: 60 },
      { processTime: 45 },
    ]
    expect(calculateTotalProcessTime(steps)).toBe(135)
  })
})

describe('calculateFlowEfficiency', () => {
  it('returns N/A for empty array', () => {
    const result = calculateFlowEfficiency([])
    expect(result.displayValue).toBe('N/A')
    expect(result.status).toBe('neutral')
  })

  it('returns 0 when lead time is 0', () => {
    const steps = [{ processTime: 100, leadTime: 0 }]
    const result = calculateFlowEfficiency(steps)
    expect(result.value).toBe(0)
  })

  it('calculates correct flow efficiency', () => {
    const steps = [
      { processTime: 25, leadTime: 100 },
    ]
    const result = calculateFlowEfficiency(steps)
    expect(result.value).toBe(0.25)
    expect(result.percentage).toBe(25)
    expect(result.displayValue).toBe('25.0%')
  })

  it('returns good status for >= 25%', () => {
    const steps = [{ processTime: 30, leadTime: 100 }]
    const result = calculateFlowEfficiency(steps)
    expect(result.status).toBe('good')
  })

  it('returns good status for exactly 25%', () => {
    const steps = [{ processTime: 25, leadTime: 100 }]
    const result = calculateFlowEfficiency(steps)
    expect(result.percentage).toBe(25)
    expect(result.status).toBe('good')
  })

  it('returns warning status for 15-25%', () => {
    const steps = [{ processTime: 20, leadTime: 100 }]
    const result = calculateFlowEfficiency(steps)
    expect(result.status).toBe('warning')
  })

  it('returns warning status for exactly 15%', () => {
    const steps = [{ processTime: 15, leadTime: 100 }]
    const result = calculateFlowEfficiency(steps)
    expect(result.percentage).toBe(15)
    expect(result.status).toBe('warning')
  })

  it('returns critical status for < 15%', () => {
    const steps = [{ processTime: 10, leadTime: 100 }]
    const result = calculateFlowEfficiency(steps)
    expect(result.status).toBe('critical')
  })
})

describe('calculateFirstPassYield', () => {
  it('returns N/A for empty array', () => {
    const result = calculateFirstPassYield([])
    expect(result.displayValue).toBe('N/A')
  })

  it('calculates product of all %C&A values', () => {
    const steps = [
      { percentCompleteAccurate: 90 },
      { percentCompleteAccurate: 80 },
    ]
    const result = calculateFirstPassYield(steps)
    expect(result.value).toBeCloseTo(0.72, 2)
    expect(result.percentage).toBeCloseTo(72, 0)
  })

  it('defaults to 100 for missing %C&A', () => {
    const steps = [
      { percentCompleteAccurate: 90 },
      { name: 'no pca' },
    ]
    const result = calculateFirstPassYield(steps)
    expect(result.value).toBeCloseTo(0.9, 2)
  })

  it('returns good status for >= 80%', () => {
    const steps = [{ percentCompleteAccurate: 90 }]
    const result = calculateFirstPassYield(steps)
    expect(result.status).toBe('good')
  })

  it('returns warning status for 60-80%', () => {
    const steps = [
      { percentCompleteAccurate: 85 },
      { percentCompleteAccurate: 85 },
    ]
    const result = calculateFirstPassYield(steps)
    expect(result.status).toBe('warning')
  })

  it('returns critical status for < 60%', () => {
    const steps = [
      { percentCompleteAccurate: 70 },
      { percentCompleteAccurate: 70 },
    ]
    const result = calculateFirstPassYield(steps)
    expect(result.status).toBe('critical')
  })
})

describe('calculateTotalQueueSize', () => {
  it('returns 0 for empty array', () => {
    expect(calculateTotalQueueSize([])).toBe(0)
  })

  it('returns 0 for null/undefined', () => {
    expect(calculateTotalQueueSize(null)).toBe(0)
    expect(calculateTotalQueueSize(undefined)).toBe(0)
  })

  it('sums queue sizes from all steps', () => {
    const steps = [
      { queueSize: 5 },
      { queueSize: 3 },
      { queueSize: 7 },
    ]
    expect(calculateTotalQueueSize(steps)).toBe(15)
  })

  it('handles missing queueSize values', () => {
    const steps = [
      { queueSize: 5 },
      { name: 'no queue' },
      { queueSize: 3 },
    ]
    expect(calculateTotalQueueSize(steps)).toBe(8)
  })
})

describe('calculateActivityRatio', () => {
  it('returns N/A for empty array', () => {
    const result = calculateActivityRatio([])
    expect(result.displayValue).toBe('N/A')
  })

  it('calculates average process time per step', () => {
    const steps = [
      { processTime: 60 },
      { processTime: 30 },
      { processTime: 45 },
    ]
    const result = calculateActivityRatio(steps)
    expect(result.value).toBe(45)
    expect(result.displayValue).toBe('45m')
  })
})

describe('calculateReworkImpact', () => {
  it('returns base lead time when no connections', () => {
    const steps = [{ leadTime: 100 }, { leadTime: 200 }]
    const result = calculateReworkImpact(steps, [])
    expect(result.effectiveLeadTime).toBe(300)
    expect(result.reworkMultiplier).toBe(1)
  })

  it('returns base lead time when no rework connections', () => {
    const steps = [{ leadTime: 100 }, { leadTime: 200 }]
    const connections = [{ type: 'forward' }]
    const result = calculateReworkImpact(steps, connections)
    expect(result.effectiveLeadTime).toBe(300)
    expect(result.reworkMultiplier).toBe(1)
  })

  it('calculates effective lead time with rework', () => {
    const steps = [{ leadTime: 100 }, { leadTime: 200 }]
    const connections = [{ type: 'rework', reworkRate: 20 }]
    const result = calculateReworkImpact(steps, connections)
    expect(result.reworkMultiplier).toBe(1.25)
    expect(result.effectiveLeadTime).toBe(375)
    expect(result.totalReworkRate).toBe(20)
  })

  it('caps rework rate at 95% to avoid infinity', () => {
    const steps = [{ leadTime: 100 }]
    const connections = [
      { type: 'rework', reworkRate: 60 },
      { type: 'rework', reworkRate: 50 },
    ]
    const result = calculateReworkImpact(steps, connections)
    expect(result.totalReworkRate).toBe(95) // Capped at 95
    expect(result.reworkMultiplier).toBe(20) // 1 / (1 - 0.95)
  })

  it('returns good status for low rework', () => {
    const steps = [{ leadTime: 100 }]
    const connections = [{ type: 'rework', reworkRate: 5 }]
    const result = calculateReworkImpact(steps, connections)
    expect(result.status).toBe('good')
  })

  it('returns warning status for moderate rework', () => {
    const steps = [{ leadTime: 100 }]
    const connections = [{ type: 'rework', reworkRate: 20 }]
    const result = calculateReworkImpact(steps, connections)
    expect(result.status).toBe('warning')
  })

  it('returns critical status for high rework', () => {
    const steps = [{ leadTime: 100 }]
    const connections = [{ type: 'rework', reworkRate: 30 }]
    const result = calculateReworkImpact(steps, connections)
    expect(result.status).toBe('critical')
  })
})

describe('identifyBottlenecks', () => {
  it('returns empty array for no steps', () => {
    expect(identifyBottlenecks([])).toEqual([])
  })

  it('returns empty array when no queues', () => {
    const steps = [
      { id: '1', queueSize: 0 },
      { id: '2', queueSize: 0 },
    ]
    expect(identifyBottlenecks(steps)).toEqual([])
  })

  it('identifies steps with high queue sizes', () => {
    const steps = [
      { id: '1', queueSize: 2 },
      { id: '2', queueSize: 10 },
      { id: '3', queueSize: 3 },
    ]
    const bottlenecks = identifyBottlenecks(steps)
    expect(bottlenecks).toContain('2')
    expect(bottlenecks).not.toContain('1')
    expect(bottlenecks).not.toContain('3')
  })
})

describe('calculateAllMetrics', () => {
  it('returns all metrics for a value stream', () => {
    const steps = [
      { processTime: 60, leadTime: 240, percentCompleteAccurate: 95, queueSize: 5 },
      { processTime: 30, leadTime: 120, percentCompleteAccurate: 90, queueSize: 3 },
    ]
    const metrics = calculateAllMetrics(steps)

    expect(metrics.totalLeadTime).toBe(360)
    expect(metrics.totalProcessTime).toBe(90)
    expect(metrics.flowEfficiency.percentage).toBe(25)
    expect(metrics.firstPassYield.percentage).toBeCloseTo(85.5, 0)
    expect(metrics.stepCount).toBe(2)
    expect(metrics.totalQueueSize).toBe(8)
    expect(metrics.activityRatio.value).toBe(45)
  })

  it('calculates rework impact when connections provided', () => {
    const steps = [
      { processTime: 60, leadTime: 240, percentCompleteAccurate: 95 },
      { processTime: 30, leadTime: 120, percentCompleteAccurate: 90 },
    ]
    const connections = [{ type: 'rework', reworkRate: 20 }]
    const metrics = calculateAllMetrics(steps, connections)

    expect(metrics.reworkImpact.reworkMultiplier).toBe(1.25)
    expect(metrics.reworkImpact.effectiveLeadTime).toBe(450)
  })
})

describe('formatDuration', () => {
  it('formats minutes only', () => {
    expect(formatDuration(45)).toBe('45m')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m')
  })

  it('formats hours only when even', () => {
    expect(formatDuration(120)).toBe('2h')
  })

  it('formats days and hours', () => {
    expect(formatDuration(600)).toBe('1d 2h')
  })

  it('formats days only when even', () => {
    expect(formatDuration(960)).toBe('2d')
  })

  it('returns 0m for 0', () => {
    expect(formatDuration(0)).toBe('0m')
  })
})
