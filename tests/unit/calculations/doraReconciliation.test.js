import { describe, it, expect } from 'vitest'
import {
  reconcileLeadTime,
  classifyDora,
  emptyDora,
} from '../../../src/utils/calculations/doraReconciliation'

const step = (leadTime) => ({ id: 'x', name: 'S', processTime: 30, leadTime })

describe('reconcileLeadTime', () => {
  it('is unknown when no actual lead time is recorded', () => {
    const r = reconcileLeadTime([step(240)], emptyDora())
    expect(r.status).toBe('unknown')
  })

  it('flags a hidden queue when actual lead time far exceeds the VSM-derived total', () => {
    const r = reconcileLeadTime([step(480)], { ...emptyDora(), leadTimeForChangesMinutes: 4800 })
    expect(r.vsmLeadTime).toBe(480)
    expect(r.actualLeadTime).toBe(4800)
    expect(r.hiddenQueue).toBe(4320)
    expect(r.status).toBe('hidden-queue')
  })

  it('reports aligned when actual and VSM lead times are close', () => {
    const r = reconcileLeadTime([step(1000)], { ...emptyDora(), leadTimeForChangesMinutes: 1100 })
    expect(r.status).toBe('aligned')
    expect(r.hiddenQueue).toBe(100)
  })

  it('reports an optimistic map when actual is below the VSM-derived total', () => {
    const r = reconcileLeadTime([step(1000)], { ...emptyDora(), leadTimeForChangesMinutes: 500 })
    expect(r.status).toBe('optimistic-map')
    expect(r.hiddenQueue).toBe(0)
  })
})

describe('classifyDora', () => {
  it('returns unknown tiers for an empty record', () => {
    const tiers = classifyDora(emptyDora())
    expect(tiers.leadTimeForChanges).toBe('unknown')
    expect(tiers.deploymentFrequency).toBe('unknown')
    expect(tiers.changeFailureRate).toBe('unknown')
    expect(tiers.mttr).toBe('unknown')
  })

  it('classifies elite performance', () => {
    const tiers = classifyDora({
      deploymentFrequencyPerDay: 5,
      leadTimeForChangesMinutes: 600,
      changeFailureRatePct: 10,
      mttrMinutes: 30,
    })
    expect(tiers.deploymentFrequency).toBe('elite')
    expect(tiers.leadTimeForChanges).toBe('elite')
    expect(tiers.changeFailureRate).toBe('elite')
    expect(tiers.mttr).toBe('elite')
  })

  it('classifies low performance', () => {
    const tiers = classifyDora({
      deploymentFrequencyPerDay: 0.01,
      leadTimeForChangesMinutes: 60000,
      changeFailureRatePct: 45,
      mttrMinutes: 20000,
    })
    expect(tiers.deploymentFrequency).toBe('low')
    expect(tiers.leadTimeForChanges).toBe('low')
    expect(tiers.changeFailureRate).toBe('low')
    expect(tiers.mttr).toBe('low')
  })
})
