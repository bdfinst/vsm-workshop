import { describe, it, expect } from 'vitest'
import { compareStates } from '../../../src/utils/calculations/futureState'

const baseline = [
  { id: 'a', name: 'Dev', processTime: 60, leadTime: 600, percentCompleteAccurate: 80 },
]
// Working state: same work, less waiting (lead time halved)
const working = [
  { id: 'a', name: 'Dev', processTime: 60, leadTime: 300, percentCompleteAccurate: 80 },
]

describe('compareStates', () => {
  it('reports baseline and working metrics side by side', () => {
    const result = compareStates(baseline, [], working, [])
    expect(result.baseline.totalLeadTime).toBe(600)
    expect(result.working.totalLeadTime).toBe(300)
  })

  it('computes the lead-time delta and improvement direction', () => {
    const result = compareStates(baseline, [], working, [])
    expect(result.deltas.totalLeadTime.delta).toBe(-300)
    expect(result.deltas.totalLeadTime.improved).toBe(true)
  })

  it('marks flow efficiency as improved when it rises', () => {
    const result = compareStates(baseline, [], working, [])
    // base efficiency 60/600 = 10%, working 60/300 = 20%
    expect(result.deltas.flowEfficiency.delta).toBeGreaterThan(0)
    expect(result.deltas.flowEfficiency.improved).toBe(true)
  })

  it('reports no change when states are identical', () => {
    const result = compareStates(baseline, [], baseline, [])
    expect(result.deltas.totalLeadTime.delta).toBe(0)
    expect(result.deltas.totalLeadTime.improved).toBe(false)
  })

  it('handles a missing baseline by returning null', () => {
    expect(compareStates(null, null, working, [])).toBeNull()
  })
})
