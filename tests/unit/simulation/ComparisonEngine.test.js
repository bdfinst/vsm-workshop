import { describe, it, expect } from 'vitest'
import { createComparisonEngine } from '../../../src/utils/simulation/ComparisonEngine'

describe('createComparisonEngine', () => {
  const mockSteps = [
    { id: 'step-1', name: 'Step 1', processTime: 30, leadTime: 60, percentCompleteAccurate: 100, batchSize: 1, peopleCount: 1 },
    { id: 'step-2', name: 'Step 2', processTime: 60, leadTime: 120, percentCompleteAccurate: 100, batchSize: 1, peopleCount: 1 },
  ]
  const mockConnections = [
    { id: 'conn-1', source: 'step-1', target: 'step-2', type: 'forward', reworkRate: 0 },
  ]

  describe('runBaseline', () => {
    it('returns simulation results for baseline steps', () => {
      const engine = createComparisonEngine(5)
      const results = engine.runBaseline(mockSteps, mockConnections)

      expect(results).toBeDefined()
      expect(typeof results.avgLeadTime).toBe('number')
      expect(typeof results.throughput).toBe('number')
    })
  })

  describe('runScenario', () => {
    it('returns simulation results for scenario steps', () => {
      const engine = createComparisonEngine(5)
      const results = engine.runScenario(mockSteps, mockConnections)

      expect(results).toBeDefined()
      expect(typeof results.avgLeadTime).toBe('number')
    })
  })

  describe('calculateImprovements', () => {
    it('returns lead time and throughput improvement percentages', () => {
      const engine = createComparisonEngine(5)

      const baseline = { avgLeadTime: 100, throughput: 0.5 }
      const scenario = { avgLeadTime: 80, throughput: 0.6 }

      const improvements = engine.calculateImprovements(baseline, scenario)

      expect(improvements).toHaveProperty('leadTime')
      expect(improvements).toHaveProperty('throughput')
      expect(improvements.leadTime).toBeCloseTo(20, 0)
      expect(improvements.throughput).toBeCloseTo(20, 0)
    })

    it('returns 0 improvement when baseline is 0 (edge case)', () => {
      const engine = createComparisonEngine(5)

      const baseline = { avgLeadTime: 0, throughput: 0 }
      const scenario = { avgLeadTime: 80, throughput: 0.6 }

      const improvements = engine.calculateImprovements(baseline, scenario)

      expect(improvements.leadTime).toBe(0)
      expect(improvements.throughput).toBe(0)
    })

    it('returns negative improvement when scenario is worse', () => {
      const engine = createComparisonEngine(5)

      const baseline = { avgLeadTime: 80, throughput: 0.6 }
      const scenario = { avgLeadTime: 100, throughput: 0.5 }

      const improvements = engine.calculateImprovements(baseline, scenario)

      expect(improvements.leadTime).toBeLessThan(0)
      expect(improvements.throughput).toBeLessThan(0)
    })

    it('returns 0 improvement when baseline equals scenario', () => {
      const engine = createComparisonEngine(5)

      const baseline = { avgLeadTime: 100, throughput: 0.5 }
      const improvements = engine.calculateImprovements(baseline, baseline)

      expect(improvements.leadTime).toBeCloseTo(0, 5)
      expect(improvements.throughput).toBeCloseTo(0, 5)
    })
  })
})
